const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const FA = `${API_BASE}/api/v1/fresh-alert`;

export interface RecommendationItem {
  rank: number;
  item_id: string;
  item_name: string;
  large_name: string;
  current_price: number;
  avg_30d: number;
  price_drop_rate: number;
  is_season: boolean;
  recommend_score: number;
}

export interface DailyRecommendation {
  date: string;
  items: RecommendationItem[];
}

export interface KeywordSubscription {
  id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  threshold_type: "percentage" | "absolute";
  threshold_value: number;
  enabled: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "recommend" | "keyword" | "category";
  title: string;
  body: string;
  item_id: string | null;
  sent_at: string;
  read_at: string | null;
}

export interface SeasonInfo {
  month: number;
  vegetables: string[];
  fruits: string[];
  seafood: string[];
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
  get(`${FA}/keywords?user_id=${userId}`);

export const fetchNotifications = (userId = "user_dev_01"): Promise<Notification[]> =>
  get(`${FA}/notifications?user_id=${userId}&limit=20`);

export const fetchCurrentSeason = (): Promise<SeasonInfo> =>
  get(`${FA}/seasons/current`);
