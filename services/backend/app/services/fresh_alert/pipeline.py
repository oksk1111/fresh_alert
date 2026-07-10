"""FreshAlert 데이터 수집 파이프라인.

MAFRA 도매시장 데이터와 KAMIS 소매가격 데이터를 수집하고,
분석하여 추천 목록과 알림을 생성하는 통합 파이프라인.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.domain.fresh_alert_models import (
    DailyAnalysis,
    DailyRecommendation,
    Notification,
    PriceRecord,
    RecommendationItem,
)
from app.services.fresh_alert.analyzer import (
    calculate_moving_average,
    calculate_price_drop_rate,
    calculate_qty_increase_rate,
    calculate_recommend_score,
    check_keyword_trigger,
    detect_price_anomaly,
    is_in_season,
    select_top_recommendations,
)
from app.services.fresh_alert.alert_service import (
    create_notification,
    generate_category_notification,
    generate_keyword_notification,
    generate_recommend_notification,
)
from app.services.fresh_alert.collector import MafraCollector
from app.services.fresh_alert.kamis_collector import (
    KamisCollector,
    parse_kamis_daily_record,
    calculate_kamis_price_change,
)
from app.services.fresh_alert.repository import fresh_alert_repo

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# KAMIS → Repository 매핑
# ---------------------------------------------------------------------------

# KAMIS item_code → 내부 item_id 매핑
KAMIS_ITEM_MAPPING: dict[str, str] = {
    # 채소류
    "211": "100-01-001",   # 배추
    "212": "100-03-001",   # 무
    "213": "100-01-002",   # 시금치 (근사치 매핑)
    "214": "100-01-003",   # 상추
    "215": "100-01-005",   # 양배추
    "221": "100-02-002",   # 오이
    "222": "100-02-001",   # 토마토 (근사치)
    "223": "100-02-003",   # 고추 (근사치)
    "224": "100-02-004",   # 호박
    "232": "100-03-002",   # 감자
    "233": "100-03-003",   # 고구마
    # 과일류
    "411": "200-01-001",   # 사과
    "412": "200-01-002",   # 배
    "418": "200-04-001",   # 포도
    "414": "200-03-001",   # 복숭아
    "413": "200-04-003",   # 수박
    "419": "200-04-002",   # 딸기
    "416": "200-02-001",   # 귤 (감귤류)
    # 수산물
    "644": "300-01-001",   # 고등어
    "641": "300-01-003",   # 광어 (근사치)
    "638": "300-02-002",   # 전복 (근사치)
}


# ---------------------------------------------------------------------------
# Pipeline Steps
# ---------------------------------------------------------------------------


async def step_collect_kamis_prices(regday: str | None = None) -> dict[str, Any]:
    """KAMIS 소매가격을 수집하여 저장한다.

    Args:
        regday: 조회 날짜 (None이면 오늘)

    Returns:
        수집 결과 요약
    """
    if regday is None:
        now = datetime.now(timezone.utc) + timedelta(hours=9)  # KST
        regday = now.strftime("%Y-%m-%d")

    collector = KamisCollector(
        cert_key=settings.kamis_api_key,
        cert_id=settings.kamis_api_id or "5129",
    )

    try:
        all_items = await collector.fetch_all_categories_daily(regday)
        logger.info("KAMIS 수집 완료: %d건", len(all_items))

        saved_count = 0
        for raw_item in all_items:
            parsed = parse_kamis_daily_record(raw_item)
            item_code = parsed["item_code"]
            internal_id = KAMIS_ITEM_MAPPING.get(item_code)

            if internal_id is None:
                continue  # 매핑되지 않은 품목은 스킵

            today_price = parsed["today_price"]
            if today_price <= 0:
                continue

            # PriceRecord 생성 및 저장
            record = PriceRecord(
                item_id=internal_id,
                market_code="KAMIS_RETAIL",
                market_name="소매(전국)",
                sale_date=regday.replace("-", ""),
                avg_price=today_price,
                min_price=today_price,
                max_price=today_price,
                total_qty=0,
                total_amt=0,
                data_source="KAMIS",
            )
            fresh_alert_repo.add_price_record(record)
            saved_count += 1

        return {
            "status": "success",
            "date": regday,
            "fetched": len(all_items),
            "saved": saved_count,
        }

    except Exception as exc:
        logger.error("KAMIS 수집 실패: %s", exc)
        return {"status": "error", "error": str(exc)}
    finally:
        await collector.close()


async def step_collect_mafra_prices(sale_date: str | None = None) -> dict[str, Any]:
    """MAFRA 도매시장 정산가격을 수집하여 저장한다.

    Args:
        sale_date: 정산일자 (YYYYMMDD, None이면 어제)

    Returns:
        수집 결과 요약
    """
    if sale_date is None:
        yesterday = datetime.now(timezone.utc) + timedelta(hours=9) - timedelta(days=1)
        sale_date = yesterday.strftime("%Y%m%d")

    collector = MafraCollector(api_key=settings.mafra_api_key)

    try:
        # 품목별 총물량/총금액 조회
        items = await collector.fetch_market_item_volume(regist_date=sale_date)
        logger.info("MAFRA 수집 완료: %d건", len(items))

        saved_count = 0
        for raw in items:
            large_code = raw.get("LARGE", "")
            mid_code = raw.get("MID", "")
            market_code = raw.get("WHSALCD", "")
            market_name = raw.get("WHSALNAME", "")

            # 내부 item_id 매핑 (대분류-중분류 기반)
            internal_id = _find_item_by_mafra_codes(large_code, mid_code)
            if internal_id is None:
                continue

            total_qty = int(float(raw.get("TOTQTY", "0") or "0"))
            total_amt = int(float(raw.get("TOTAMT", "0") or "0"))
            avg_price = total_amt // total_qty if total_qty > 0 else 0

            if avg_price <= 0:
                continue

            record = PriceRecord(
                item_id=internal_id,
                market_code=market_code,
                market_name=market_name,
                sale_date=sale_date,
                avg_price=avg_price,
                min_price=avg_price,
                max_price=avg_price,
                total_qty=total_qty,
                total_amt=total_amt,
                data_source="MAFRA",
            )
            fresh_alert_repo.add_price_record(record)
            saved_count += 1

        return {
            "status": "success",
            "date": sale_date,
            "fetched": len(items),
            "saved": saved_count,
        }

    except Exception as exc:
        logger.error("MAFRA 수집 실패: %s", exc)
        return {"status": "error", "error": str(exc)}
    finally:
        await collector.close()


async def step_run_analysis(analysis_date: str | None = None) -> dict[str, Any]:
    """일별 분석을 실행한다.

    Args:
        analysis_date: 분석 날짜 (YYYYMMDD, None이면 오늘)

    Returns:
        분석 결과 요약
    """
    if analysis_date is None:
        now = datetime.now(timezone.utc) + timedelta(hours=9)
        analysis_date = now.strftime("%Y%m%d")

    month = int(analysis_date[4:6])
    items = fresh_alert_repo.list_items()
    analysis_count = 0
    anomaly_count = 0

    for item in items:
        history = fresh_alert_repo.get_price_history(item.item_id, days=90)
        if not history:
            continue

        prices = [r.avg_price for r in history]
        qtys = [r.total_qty for r in history if r.total_qty > 0]

        avg_30d = calculate_moving_average(prices, 30)
        avg_7d_qty = calculate_moving_average(qtys, 7) if qtys else 0.0
        current_price = prices[-1]
        current_qty = qtys[-1] if qtys else 0

        price_drop = calculate_price_drop_rate(current_price, avg_30d)
        qty_increase = calculate_qty_increase_rate(current_qty, avg_7d_qty)
        season = is_in_season(month, item.season_start, item.season_end)
        score = calculate_recommend_score(price_drop, qty_increase, season)
        anomaly = detect_price_anomaly(current_price, prices)

        analysis = DailyAnalysis(
            item_id=item.item_id,
            analysis_date=analysis_date,
            avg_30d=int(avg_30d),
            current_price=current_price,
            price_drop_rate=price_drop,
            qty_increase_rate=qty_increase,
            is_season=season,
            recommend_score=score,
        )
        fresh_alert_repo.save_daily_analysis(item.item_id, analysis)
        analysis_count += 1

        if anomaly != "NORMAL":
            anomaly_count += 1

    logger.info(
        "분석 완료: items=%d, anomalies=%d", analysis_count, anomaly_count,
    )
    return {
        "status": "success",
        "analyzed": analysis_count,
        "anomalies": anomaly_count,
    }


async def step_generate_recommendations(
    date: str | None = None,
    top_n: int | None = None,
) -> dict[str, Any]:
    """오늘의 추천을 생성한다.

    Args:
        date: 추천 날짜
        top_n: 추천 개수

    Returns:
        추천 생성 결과
    """
    if date is None:
        now = datetime.now(timezone.utc) + timedelta(hours=9)
        date = now.strftime("%Y%m%d")

    if top_n is None:
        top_n = settings.fresh_alert_recommend_top_n

    analyses = fresh_alert_repo.get_daily_analyses(date)
    if not analyses:
        # 분석 결과가 없으면 먼저 실행
        await step_run_analysis(date)
        analyses = fresh_alert_repo.get_daily_analyses(date)

    # 분석 결과를 dict 리스트로 변환
    analysis_dicts = []
    for a in analyses:
        item = fresh_alert_repo.get_item(a.item_id)
        item_name = item.small_name or item.mid_name if item else a.item_id
        large_name = item.large_name if item else ""
        analysis_dicts.append({
            "item_id": a.item_id,
            "item_name": item_name,
            "large_name": large_name,
            "current_price": a.current_price,
            "avg_30d": a.avg_30d,
            "price_drop_rate": a.price_drop_rate,
            "qty_increase_rate": a.qty_increase_rate,
            "is_season": a.is_season,
            "recommend_score": a.recommend_score,
        })

    top = select_top_recommendations(analysis_dicts, top_n=top_n)

    rec_items = [
        RecommendationItem(
            rank=i + 1,
            item_id=item["item_id"],
            item_name=item["item_name"],
            large_name=item["large_name"],
            current_price=item["current_price"],
            avg_30d=item["avg_30d"],
            price_drop_rate=item["price_drop_rate"],
            is_season=item["is_season"],
            recommend_score=item["recommend_score"],
        )
        for i, item in enumerate(top)
    ]

    recommendation = DailyRecommendation(date=date, items=rec_items)
    fresh_alert_repo.save_recommendation(recommendation)

    logger.info("추천 생성 완료: %d건", len(rec_items))
    return {
        "status": "success",
        "date": date,
        "recommended_count": len(rec_items),
        "items": [{"name": r.item_name, "score": r.recommend_score} for r in rec_items],
    }


async def step_check_keyword_alerts(user_id: str = "user_dev_01") -> dict[str, Any]:
    """키워드 알림 조건을 확인하고 알림을 생성한다.

    Args:
        user_id: 확인할 사용자 ID

    Returns:
        알림 발송 결과
    """
    subs = fresh_alert_repo.get_keyword_subscriptions(user_id)
    triggered_count = 0

    for sub in subs:
        if not sub.enabled:
            continue

        history = fresh_alert_repo.get_price_history(sub.item_id, days=30)
        if not history:
            continue

        prices = [r.avg_price for r in history]
        avg_30d = calculate_moving_average(prices, 30)
        current_price = prices[-1]

        if check_keyword_trigger(current_price, avg_30d, sub.threshold_type, sub.threshold_value):
            price_drop = calculate_price_drop_rate(current_price, avg_30d)
            notif_msg = generate_keyword_notification(
                sub.item_name, current_price, avg_30d, price_drop,
            )
            notif = create_notification(
                user_id=user_id,
                notif_type="keyword",
                title=notif_msg["title"],
                body=notif_msg["body"],
                item_id=sub.item_id,
            )
            fresh_alert_repo.add_notification(Notification(**notif))
            triggered_count += 1

    return {
        "status": "success",
        "checked": len(subs),
        "triggered": triggered_count,
    }


async def run_full_pipeline(date: str | None = None) -> dict[str, Any]:
    """전체 파이프라인을 실행한다.

    수집 → 분석 → 추천 → 키워드 알림 순으로 실행.

    Args:
        date: 처리 날짜 (None이면 오늘)

    Returns:
        파이프라인 실행 결과
    """
    if date is None:
        now = datetime.now(timezone.utc) + timedelta(hours=9)
        date = now.strftime("%Y%m%d")

    regday_formatted = f"{date[:4]}-{date[4:6]}-{date[6:8]}"

    logger.info("=== FreshAlert 파이프라인 시작: %s ===", date)

    # Step 1: KAMIS 소매가격 수집
    kamis_result = await step_collect_kamis_prices(regday_formatted)
    logger.info("KAMIS 수집: %s", kamis_result)

    # Step 2: MAFRA 도매가격 수집
    mafra_result = await step_collect_mafra_prices(date)
    logger.info("MAFRA 수집: %s", mafra_result)

    # Step 3: 분석
    analysis_result = await step_run_analysis(date)
    logger.info("분석: %s", analysis_result)

    # Step 4: 추천 생성
    recommend_result = await step_generate_recommendations(date)
    logger.info("추천: %s", recommend_result)

    # Step 5: 키워드 알림
    keyword_result = await step_check_keyword_alerts()
    logger.info("키워드 알림: %s", keyword_result)

    logger.info("=== FreshAlert 파이프라인 완료 ===")

    return {
        "date": date,
        "kamis": kamis_result,
        "mafra": mafra_result,
        "analysis": analysis_result,
        "recommendations": recommend_result,
        "keyword_alerts": keyword_result,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# MAFRA 대분류 코드 → 내부 대분류 매핑
_MAFRA_LARGE_MAP: dict[str, str] = {
    "11": "100",  # 엽경채류 → 채소류
    "12": "100",  # 조미채소류 → 채소류
    "13": "100",  # 양채류 → 채소류
    "14": "100",  # 근채류 → 채소류
    "06": "200",  # 과실류 → 과일류
    "08": "200",  # 열대과일 → 과일류
    "01": "300",  # 수산물
    "02": "300",  # 수산물
    "03": "400",  # 축산물
}


def _find_item_by_mafra_codes(large: str, mid: str) -> str | None:
    """MAFRA 분류 코드로 내부 item_id를 찾는다."""
    internal_large = _MAFRA_LARGE_MAP.get(large)
    if internal_large is None:
        return None

    # 간단한 매핑 (대분류 기준 첫 번째 아이템)
    items = fresh_alert_repo.get_items_by_category(internal_large)
    if items:
        return items[0].item_id
    return None
