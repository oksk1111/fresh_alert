/**
 * 품목 이름 → 이모지 썸네일 + 배경색 매핑.
 * 참조 디자인의 원형 음식 썸네일을 이모지로 재현한다.
 */

interface Thumb {
  emoji: string;
  bg: string;
}

// 짧거나 모호한 이름은 정확히 일치할 때만 매핑한다 (부분일치 오탐 방지).
const EXACT_THUMBS: Record<string, Thumb> = {
  소: { emoji: "🥩", bg: "#f6dedb" },
  돼지: { emoji: "🥓", bg: "#f8e2e0" },
  "닭/오리": { emoji: "🍗", bg: "#f6ead6" },
  무: { emoji: "🥕", bg: "#fbe8d6" },
  파: { emoji: "🧅", bg: "#f3ecda" },
  게: { emoji: "🦐", bg: "#fbe2dc" },
  굴: { emoji: "🦪", bg: "#e7edf0" },
  김: { emoji: "🌿", bg: "#e2efe4" },
};

const KEYWORD_THUMBS: Array<{ match: string[]; thumb: Thumb }> = [
  { match: ["상추", "배추", "양배추", "시금치", "깻잎", "부추", "쑥갓", "엽채", "엽경채"], thumb: { emoji: "🥬", bg: "#e7f3e2" } },
  { match: ["대파", "양파", "쪽파", "마늘", "생강", "고추", "조미"], thumb: { emoji: "🧅", bg: "#f3ecda" } },
  { match: ["오이", "호박", "가지", "토마토", "파프리카", "피망", "과채"], thumb: { emoji: "🍅", bg: "#fbe4de" } },
  { match: ["당근", "감자", "고구마", "연근", "우엉", "근채"], thumb: { emoji: "🥕", bg: "#fbe8d6" } },
  { match: ["브로콜리", "콜리플라워", "셀러리", "양채"], thumb: { emoji: "🥦", bg: "#e4f0df" } },
  { match: ["사과", "인과"], thumb: { emoji: "🍎", bg: "#fce0dc" } },
  { match: ["귤", "감귤", "오렌지", "레몬", "자몽"], thumb: { emoji: "🍊", bg: "#fdeacf" } },
  { match: ["복숭아", "자두", "체리", "매실", "살구", "핵과"], thumb: { emoji: "🍑", bg: "#fce2e2" } },
  { match: ["포도", "블루베리", "딸기", "장과"], thumb: { emoji: "🍇", bg: "#ece1f4" } },
  { match: ["참외", "멜론"], thumb: { emoji: "🍈", bg: "#eef3d8" } },
  { match: ["수박"], thumb: { emoji: "🍉", bg: "#e6f2e0" } },
  { match: ["바나나"], thumb: { emoji: "🍌", bg: "#fbf1d0" } },
  { match: ["고등어", "갈치", "명태", "삼치", "조기", "광어", "어류", "생선"], thumb: { emoji: "🐟", bg: "#e0edf5" } },
  { match: ["오징어", "낙지", "문어"], thumb: { emoji: "🦑", bg: "#e6e9f4" } },
  { match: ["새우", "꽃게", "대게", "갑각"], thumb: { emoji: "🦐", bg: "#fbe2dc" } },
  { match: ["조개", "홍합", "전복", "패류"], thumb: { emoji: "🦪", bg: "#e7edf0" } },
  { match: ["미역", "다시마", "해조"], thumb: { emoji: "🌿", bg: "#e2efe4" } },
  { match: ["한우", "쇠고기", "소고기"], thumb: { emoji: "🥩", bg: "#f6dedb" } },
  { match: ["삼겹", "돼지고기"], thumb: { emoji: "🥓", bg: "#f8e2e0" } },
  { match: ["계란", "달걀", "닭", "오리"], thumb: { emoji: "🍗", bg: "#f6ead6" } },
  { match: ["버섯"], thumb: { emoji: "🍄", bg: "#f0e6df" } },
];

const CATEGORY_THUMBS: Record<string, Thumb> = {
  채소류: { emoji: "🥬", bg: "#e7f3e2" },
  과일류: { emoji: "🍎", bg: "#fce0dc" },
  수산물: { emoji: "🐟", bg: "#e0edf5" },
  축산물: { emoji: "🥩", bg: "#f6dedb" },
};

const FALLBACK: Thumb = { emoji: "🧺", bg: "#eceef0" };

/** 품목명(또는 카테고리명)으로부터 이모지 썸네일을 얻는다. */
export function getThumb(name: string, categoryName?: string): Thumb {
  // 1) 대분류 이름은 우선 정확히 매핑
  if (CATEGORY_THUMBS[name]) return CATEGORY_THUMBS[name];
  // 2) 짧고 모호한 이름은 정확 일치만 허용
  if (EXACT_THUMBS[name]) return EXACT_THUMBS[name];
  // 3) 부분일치 키워드 매핑
  for (const entry of KEYWORD_THUMBS) {
    if (entry.match.some((m) => name.includes(m))) return entry.thumb;
  }
  // 4) 카테고리 힌트 → 폴백
  if (categoryName && CATEGORY_THUMBS[categoryName]) return CATEGORY_THUMBS[categoryName];
  return FALLBACK;
}
