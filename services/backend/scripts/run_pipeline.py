"""FreshAlert 데이터 수집 파이프라인 실행 스크립트.

Usage:
    python scripts/run_pipeline.py                    # 오늘 날짜로 전체 파이프라인 실행
    python scripts/run_pipeline.py --date 20260710    # 특정 날짜로 실행
    python scripts/run_pipeline.py --step kamis       # KAMIS만 수집
    python scripts/run_pipeline.py --step mafra       # MAFRA만 수집
    python scripts/run_pipeline.py --step analyze     # 분석만 실행
    python scripts/run_pipeline.py --step recommend   # 추천 생성만
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.fresh_alert.pipeline import (
    run_full_pipeline,
    step_collect_kamis_prices,
    step_collect_mafra_prices,
    step_generate_recommendations,
    step_run_analysis,
    step_check_keyword_alerts,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fresh_alert.pipeline")


async def main() -> None:
    parser = argparse.ArgumentParser(description="FreshAlert 데이터 수집 파이프라인")
    parser.add_argument("--date", type=str, default=None, help="처리 날짜 (YYYYMMDD)")
    parser.add_argument(
        "--step",
        type=str,
        choices=["kamis", "mafra", "analyze", "recommend", "alerts", "full"],
        default="full",
        help="실행할 단계",
    )
    args = parser.parse_args()

    date = args.date
    step = args.step

    logger.info("FreshAlert 파이프라인 시작: step=%s, date=%s", step, date or "today")

    if step == "full":
        result = await run_full_pipeline(date)
    elif step == "kamis":
        regday = None
        if date:
            regday = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
        result = await step_collect_kamis_prices(regday)
    elif step == "mafra":
        result = await step_collect_mafra_prices(date)
    elif step == "analyze":
        result = await step_run_analysis(date)
    elif step == "recommend":
        result = await step_generate_recommendations(date)
    elif step == "alerts":
        result = await step_check_keyword_alerts()
    else:
        logger.error("알 수 없는 단계: %s", step)
        sys.exit(1)

    print("\n" + "=" * 60)
    print("📊 실행 결과:")
    print("=" * 60)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
