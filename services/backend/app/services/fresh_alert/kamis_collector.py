"""KAMIS (농산물유통정보) API data collector.

한국농수산식품유통공사에서 제공하는 소매/도매 가격 정보를 수집한다.
실제 API 엔드포인트: https://www.kamis.or.kr/service/price/xml.do
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

KAMIS_BASE_URL = "https://www.kamis.or.kr/service/price/xml.do"

# KAMIS API Actions
ACTION_DAILY_PRICE_BY_CATEGORY = "dailyPriceByCategoryList"
ACTION_DAILY_PRICE_BY_ITEM = "dailyPriceByCategoryList"
ACTION_PERIOD_PRICE = "periodProductList"

# KAMIS 품목 카테고리 코드 (p_item_category_code)
KAMIS_CATEGORIES: dict[str, str] = {
    "100": "식량작물",
    "200": "채소류",
    "300": "특용작물",
    "400": "과일류",
    "500": "축산물",
    "600": "수산물",
}

# 소매/도매 구분 코드 (p_product_cls_code)
CLS_RETAIL = "01"    # 소매
CLS_WHOLESALE = "02"  # 도매

# 지역 코드 (p_country_code)
COUNTRY_CODES: dict[str, str] = {
    "1101": "서울",
    "2100": "부산",
    "2200": "대구",
    "2300": "인천",
    "2401": "광주",
    "2501": "대전",
    "2601": "울산",
    "3111": "수원",
    "3211": "춘천",
    "3311": "청주",
    "3511": "전주",
    "3711": "포항",
    "3911": "제주",
}


# ---------------------------------------------------------------------------
# Collector
# ---------------------------------------------------------------------------


class KamisCollector:
    """KAMIS 농산물유통정보 API 데이터 수집기.

    소매/도매 가격 정보를 카테고리별, 지역별로 조회한다.
    """

    def __init__(self, cert_key: str, cert_id: str = "5129") -> None:
        """초기화.

        Args:
            cert_key: KAMIS API 인증키 (data.go.kr에서 발급)
            cert_id: KAMIS API 인증 ID (기본값: 5129)
        """
        self.cert_key = cert_key
        self.cert_id = cert_id
        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)

    def _base_params(self) -> dict[str, str]:
        """공통 파라미터를 반환한다."""
        return {
            "p_cert_key": self.cert_key,
            "p_cert_id": self.cert_id,
            "p_returntype": "json",
        }

    async def _fetch(
        self,
        action: str,
        params: dict[str, str],
    ) -> list[dict[str, Any]]:
        """KAMIS API를 호출하고 결과를 반환한다.

        Args:
            action: API action 파라미터
            params: 추가 요청 파라미터

        Returns:
            상품 데이터 리스트, 에러 시 빈 리스트
        """
        request_params = {
            "action": action,
            **self._base_params(),
            **params,
        }

        try:
            response = await self.client.get(KAMIS_BASE_URL, params=request_params)
            response.raise_for_status()
            data = response.json()

            # KAMIS 응답 구조: {"condition": [...], "data": {"error_code": "000", "item": [...]}}
            result_data = data.get("data", {})
            error_code = result_data.get("error_code", "")

            if error_code != "000":
                logger.warning(
                    "KAMIS API error: code=%s, message=%s",
                    error_code,
                    result_data.get("error_message", "unknown"),
                )
                return []

            items = result_data.get("item", [])
            if isinstance(items, list):
                return items
            return []

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP %d from KAMIS API: %s",
                exc.response.status_code,
                exc.response.text[:200],
            )
            return []
        except httpx.RequestError as exc:
            logger.error("Request error for KAMIS API: %s", exc)
            return []
        except (ValueError, KeyError) as exc:
            logger.error("Failed to parse KAMIS response: %s", exc)
            return []

    async def fetch_daily_price_by_category(
        self,
        category_code: str,
        regday: str,
        cls_code: str = CLS_RETAIL,
        country_code: str = "1101",
        convert_kg: bool = True,
    ) -> list[dict[str, Any]]:
        """카테고리별 일별 소매/도매 가격을 조회한다.

        Args:
            category_code: 품목 카테고리 코드 (100~600)
            regday: 조회 날짜 (YYYY-MM-DD 형식)
            cls_code: 소매(01)/도매(02)
            country_code: 지역 코드 (기본: 서울)
            convert_kg: kg 환산 여부

        Returns:
            품목별 가격 데이터 리스트
        """
        params = {
            "p_product_cls_code": cls_code,
            "p_country_code": country_code,
            "p_regday": regday,
            "p_convert_kg_yn": "Y" if convert_kg else "N",
            "p_item_category_code": category_code,
        }
        return await self._fetch(ACTION_DAILY_PRICE_BY_CATEGORY, params)

    async def fetch_all_categories_daily(
        self,
        regday: str,
        cls_code: str = CLS_RETAIL,
        country_code: str = "1101",
    ) -> list[dict[str, Any]]:
        """전체 카테고리의 일별 가격을 조회한다.

        Args:
            regday: 조회 날짜 (YYYY-MM-DD 형식)
            cls_code: 소매(01)/도매(02)
            country_code: 지역 코드

        Returns:
            전체 품목 가격 데이터 리스트
        """
        all_items: list[dict[str, Any]] = []

        for cat_code in KAMIS_CATEGORIES:
            items = await self.fetch_daily_price_by_category(
                category_code=cat_code,
                regday=regday,
                cls_code=cls_code,
                country_code=country_code,
            )
            # 각 아이템에 카테고리 정보 추가
            for item in items:
                item["_category_code"] = cat_code
                item["_category_name"] = KAMIS_CATEGORIES[cat_code]
            all_items.extend(items)

        logger.info(
            "KAMIS daily prices fetched: date=%s, total=%d items",
            regday, len(all_items),
        )
        return all_items

    async def fetch_period_price(
        self,
        item_code: str,
        kind_code: str,
        product_rank_code: str,
        start_day: str,
        end_day: str,
        cls_code: str = CLS_RETAIL,
        country_code: str = "1101",
    ) -> list[dict[str, Any]]:
        """특정 품목의 기간별 가격 추이를 조회한다.

        Args:
            item_code: 품목코드
            kind_code: 품종코드
            product_rank_code: 등급코드
            start_day: 시작일 (YYYY-MM-DD)
            end_day: 종료일 (YYYY-MM-DD)
            cls_code: 소매(01)/도매(02)
            country_code: 지역 코드

        Returns:
            기간별 가격 데이터 리스트
        """
        params = {
            "p_product_cls_code": cls_code,
            "p_country_code": country_code,
            "p_startday": start_day,
            "p_endday": end_day,
            "p_item_code": item_code,
            "p_kind_code": kind_code,
            "p_product_rank_code": product_rank_code,
            "p_convert_kg_yn": "Y",
        }
        return await self._fetch(ACTION_PERIOD_PRICE, params)

    async def close(self) -> None:
        """HTTP 클라이언트를 종료한다."""
        await self.client.aclose()


# ---------------------------------------------------------------------------
# Record parsers
# ---------------------------------------------------------------------------


def parse_kamis_daily_record(raw: dict[str, Any]) -> dict[str, Any]:
    """KAMIS 일별 가격 레코드를 내부 형식으로 변환한다.

    Args:
        raw: KAMIS API의 item 레코드

    Returns:
        정규화된 가격 레코드
    """
    def parse_price(value: str) -> int:
        """가격 문자열을 정수로 변환 (콤마, '-' 처리)."""
        if not value or value == "-":
            return 0
        return int(value.replace(",", ""))

    return {
        "item_name": raw.get("item_name", ""),
        "item_code": raw.get("item_code", ""),
        "kind_name": raw.get("kind_name", ""),
        "kind_code": raw.get("kind_code", ""),
        "rank": raw.get("rank", ""),
        "rank_code": raw.get("rank_code", ""),
        "unit": raw.get("unit", ""),
        "today_price": parse_price(raw.get("dpr1", "0")),
        "yesterday_price": parse_price(raw.get("dpr2", "0")),
        "week_ago_price": parse_price(raw.get("dpr3", "0")),
        "two_weeks_ago_price": parse_price(raw.get("dpr4", "0")),
        "month_ago_price": parse_price(raw.get("dpr5", "0")),
        "year_ago_price": parse_price(raw.get("dpr6", "0")),
        "avg_year_price": parse_price(raw.get("dpr7", "0")),
        "category_code": raw.get("_category_code", ""),
        "category_name": raw.get("_category_name", ""),
        "direction": raw.get("direction", "0"),  # 가격 방향 (1:상승, -1:하락, 0:동일)
        "value": raw.get("value", "0"),  # 등락률
    }


def calculate_kamis_price_change(record: dict[str, Any]) -> dict[str, float]:
    """KAMIS 레코드에서 가격 변동률을 계산한다.

    Args:
        record: parse_kamis_daily_record 결과

    Returns:
        각 기간 대비 변동률
    """
    today = record["today_price"]
    if today == 0:
        return {"vs_yesterday": 0, "vs_week": 0, "vs_month": 0, "vs_year": 0}

    def pct(prev: int) -> float:
        if prev == 0:
            return 0.0
        return round((today - prev) / prev * 100, 2)

    return {
        "vs_yesterday": pct(record["yesterday_price"]),
        "vs_week": pct(record["week_ago_price"]),
        "vs_2weeks": pct(record["two_weeks_ago_price"]),
        "vs_month": pct(record["month_ago_price"]),
        "vs_year": pct(record["year_ago_price"]),
        "vs_avg_year": pct(record["avg_year_price"]),
    }
