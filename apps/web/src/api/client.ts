// PROD(Vercel): 빈 문자열 → 상대경로 → vercel.json rewrite가 백엔드로 프록시
// DEV(로컬): 실제 백엔드 서버에서 데이터 불러오기
const API_BASE = import.meta.env.PROD ? "" : "http://134.185.117.248:8000";

export interface BasketItem {
  item_name: string;
  category: string;
  avg_price: number;
  recommend_reason: string;
}

export interface BasketEnvelope {
  status: "success";
  data: {
    basket: BasketItem[];
  };
}

export interface ForecastItem {
  item_name: string;
  trend: "up" | "down" | "stable";
  next_week_price: number;
}

export interface ForecastEnvelope {
  status: "success";
  data: {
    forecasts: ForecastItem[];
  };
}

export interface RouteEnvelope {
  status: "success";
  data: {
    route_id: string;
    estimated_time_mins: number;
    distance_km: number;
    message: string;
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function issueToken(userId = "user_dev_01"): Promise<string> {
  const response = await request<{ access_token: string }>("/api/v1/auth/token", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  return response.access_token;
}

export async function fetchBasket(token: string): Promise<BasketEnvelope> {
  return request<BasketEnvelope>("/api/v1/recommendation/basket", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchForecasts(): Promise<ForecastEnvelope> {
  return request<ForecastEnvelope>("/api/v1/forecast/pricing");
}

export async function fetchRoute(): Promise<RouteEnvelope> {
  return request<RouteEnvelope>("/api/v1/logistics/route", {
    method: "POST",
    body: JSON.stringify({
      warehouse_id: "WH-SEOUL-01",
      warehouse_coordinate: {
        latitude: 37.5665,
        longitude: 126.978,
      },
      destinations: [
        {
          destination_id: "D-101",
          coordinate: { latitude: 37.572, longitude: 126.99 },
          demand_weight_kg: 14,
        },
        {
          destination_id: "D-205",
          coordinate: { latitude: 37.552, longitude: 126.964 },
          demand_weight_kg: 9,
        },
        {
          destination_id: "D-309",
          coordinate: { latitude: 37.545, longitude: 127.02 },
          demand_weight_kg: 11,
        },
      ],
      vehicle_max_capacity_kg: 20,
    }),
  });
}
