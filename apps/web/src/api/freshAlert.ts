// PROD(Vercel): 빈 문자열 → 상대경로 → vercel.json rewrite가 백엔드로 프록시
// DEV(로컬): VITE_API_BASE_URL 환경변수 사용 (미설정 시 localhost:8000 fallback)
const API_BASE = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000");
const FA = `${API_BASE}/api/v1/fresh-alert`;

export interface RecommendationItem {
  item_id: string;
  item_name: string;
  category: string;
  avg_price: number;
  unit: string;
  sale_date: string;
  market_name: string;
  source: string;
}

export interface DailyRecommendation {
  date: string;
  recommendations: RecommendationItem[];
}

export interface KeywordSubscription {
  keyword: string;
  alert_enabled: boolean;
  threshold_pct: number;
}

export interface Notification {
  id: string;
  item_name: string;
  category: string;
  message: string;
  avg_price: number;
  change_pct: number;
  sale_date: string;
  market_name: string;
  read: boolean;
}

export interface SeasonItem {
  item_name: string;
  season: string;
  avg_price: number;
  in_cache: boolean;
}

export interface SeasonInfo {
  season: string;
  items: SeasonItem[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export const fetchRecommendations = (): Promise<DailyRecommendation> =>
  get(`${FA}/recommendations/today`);

export const fetchKeywords = (userId = "user_dev_01"): Promise<KeywordSubscription[]> =>
  get<{ user_id: string; keywords: KeywordSubscription[] }>(`${FA}/keywords?user_id=${userId}`)
    .then((d) => d.keywords);

export const fetchNotifications = (userId = "user_dev_01"): Promise<Notification[]> =>
  get<{ user_id: string; total: number; notifications: Notification[] }>(
    `${FA}/notifications?user_id=${userId}&limit=100`
  ).then((d) => d.notifications);

export const fetchCurrentSeason = (): Promise<SeasonInfo> =>
  get(`${FA}/seasons/current`);
