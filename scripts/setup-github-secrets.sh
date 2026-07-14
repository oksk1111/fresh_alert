#!/usr/bin/env bash
# Vercel Token으로 Org ID, Project ID를 자동 조회 후 GitHub Secrets에 등록
set -euo pipefail

GITHUB_REPO="oksk1111/fresh_alert"
VERCEL_PROJECT_NAME="fresh-alert-web"

echo "========================================"
echo " Vercel → GitHub Secrets 자동 설정 스크립트"
echo "========================================"
echo ""
echo "Vercel 토큰이 필요합니다."
echo "발급: https://vercel.com/account/tokens → Create Token"
echo ""
read -rsp "VERCEL_TOKEN 입력 (입력값은 화면에 표시되지 않음): " VERCEL_TOKEN
echo ""

if [[ -z "$VERCEL_TOKEN" ]]; then
  echo "❌ 토큰이 입력되지 않았습니다." >&2
  exit 1
fi

# ── Vercel API: 사용자 정보 (Org ID) 조회 ──────────────────────────
echo ""
echo "🔍 Vercel 사용자 정보 조회 중..."
USER_RESP=$(curl -sf "https://api.vercel.com/v2/user" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

VERCEL_ORG_ID=$(echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))")

if [[ -z "$VERCEL_ORG_ID" ]]; then
  echo "❌ Org ID 조회 실패. 토큰을 확인하세요." >&2
  exit 1
fi
echo "✅ VERCEL_ORG_ID: $VERCEL_ORG_ID"

# ── Vercel API: 프로젝트 ID 조회 ───────────────────────────────────
echo ""
echo "🔍 Vercel 프로젝트 '$VERCEL_PROJECT_NAME' 조회 중..."
PROJ_RESP=$(curl -sf "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_NAME}" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

VERCEL_PROJECT_ID=$(echo "$PROJ_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")

if [[ -z "$VERCEL_PROJECT_ID" ]]; then
  echo "❌ 프로젝트 '$VERCEL_PROJECT_NAME'을 찾을 수 없습니다." >&2
  echo "   Vercel 대시보드에서 프로젝트 이름을 확인하세요." >&2
  exit 1
fi
echo "✅ VERCEL_PROJECT_ID_WEB: $VERCEL_PROJECT_ID"

# ── GitHub Secrets 등록 ────────────────────────────────────────────
echo ""
echo "🔐 GitHub Secrets 등록 중 (저장소: $GITHUB_REPO)..."

gh secret set VERCEL_TOKEN        --repo "$GITHUB_REPO" --body "$VERCEL_TOKEN"
echo "  ✅ VERCEL_TOKEN"

gh secret set VERCEL_ORG_ID       --repo "$GITHUB_REPO" --body "$VERCEL_ORG_ID"
echo "  ✅ VERCEL_ORG_ID"

gh secret set VERCEL_PROJECT_ID_WEB --repo "$GITHUB_REPO" --body "$VERCEL_PROJECT_ID"
echo "  ✅ VERCEL_PROJECT_ID_WEB"

echo ""
echo "========================================"
echo "✅ 완료! 이제 master 브랜치에 push하면"
echo "   GitHub Actions가 자동으로 Vercel에 배포합니다."
echo "========================================"
