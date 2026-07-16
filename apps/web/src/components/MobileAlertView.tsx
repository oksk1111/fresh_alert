import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNotifications, fetchKeywords, fetchRecommendations } from "../api/freshAlert";
import type { Notification, KeywordSubscription, DailyRecommendation } from "../api/freshAlert";

// ─── SVG 아이콘 (라인아트 벡터 스타일) ────────────────────────────────────────
// icon_samples.jpg 참고: 깔끔한 라운드 라인 스트로크, fill 없음, 모노톤

function IconSearch({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.65" y1="16.65" x2="21" y2="21" />
    </svg>
  );
}

function IconSettings({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
    </svg>
  );
}

function IconStar({ size = 22, stroke = "currentColor", filled = false }: { size?: number; stroke?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? stroke : "none"} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconTarget({ size = 22, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconFolder({ size = 22, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBookmark({ size = 18, stroke = "currentColor", filled = false }: { size?: number; stroke?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? stroke : "none"} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconUser({ size = 34, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconChevronLeft({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

type MenuTab = "interest" | "recommend" | "category";
type Overlay = "none" | "search" | "settings";

const MENU_CONFIG: { key: MenuTab; label: string; icon: JSX.Element }[] = [
  { key: "interest", label: "관심", icon: <IconStar size={22} /> },
  { key: "recommend", label: "추천", icon: <IconTarget size={22} /> },
  { key: "category", label: "분류", icon: <IconFolder size={22} /> },
];

// 공지/광고 데이터 소스가 아직 없어 비워 둔다 (목업). 값이 채워지면 알림바가 자동으로 표시된다.
const ANNOUNCEMENTS: string[] = [];

const FOOD_ICONS: Record<string, string> = {
  배추: "🥬", 상추: "🥬", 양배추: "🥬", 시금치: "🥬",
  사과: "🍎", 감귤: "🍊", 귤: "🍊", 오렌지: "🍊", 포도: "🍇", 배: "🍐", 수박: "🍉", 참외: "🍈", 딸기: "🍓", 복숭아: "🍑", 바나나: "🍌",
  대파: "🌿", 양파: "🧅", 마늘: "🧄",
  감자: "🥔", 고구마: "🍠",
  당근: "🥕",
  토마토: "🍅",
  오이: "🥒", 호박: "🥒",
  고추: "🌶️", 풋고추: "🌶️",
  버섯: "🍄",
  쌀: "🌾", 보리: "🌾", 밀: "🌾",
  고등어: "🐟", 갈치: "🐟", 명태: "🐟", 오징어: "🦑", 새우: "🦐", 굴: "🦪", 조기: "🐟", 꽁치: "🐟", 멸치: "🐟",
  삼겹살: "🥩", 한우등심: "🥩", 돼지고기: "🥩", 소고기: "🥩", 닭고기: "🍗", 계란: "🥚", 달걀: "🥚",
  우유: "🥛", 두부: "🧈",
};

const CATEGORY_ICONS: Record<string, string> = {
  축산물: "🥩",
  수산물: "🐟",
  과일류: "🍎",
  채소류: "🥬",
  곡류: "🌾",
};

function getFoodIcon(name: string): string {
  if (FOOD_ICONS[name]) return FOOD_ICONS[name];
  for (const [key, icon] of Object.entries(FOOD_ICONS)) {
    if (name.includes(key) || key.includes(name)) return icon;
  }
  return "🥗";
}

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "📦";
}

interface CatalogEntry {
  category: string;
  avg_price: number;
  change_pct: number;
}

interface DetailTarget {
  name: string;
  category: string;
  price: number;
  changePct: number;
}

// ─── 가격 이력 모의(mock) 데이터 ────────────────────────────────────────────
// 실서버에 기간별 가격 이력 API가 아직 없어, 현재가를 기준점으로 하는
// 시드 고정 랜덤워크로 최근 N일 추이를 생성한다. (실제 API 연동 전 임시 데이터)

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMockPriceHistory(
  itemName: string,
  currentPrice: number,
  days = 14
): { date: string; price: number }[] {
  if (currentPrice <= 0) return [];

  const random = createSeededRandom(hashString(itemName));
  const prices = new Array<number>(days);
  prices[days - 1] = currentPrice;
  for (let i = days - 2; i >= 0; i--) {
    const drift = (random() - 0.5) * 0.08; // 일별 ±4% 변동
    prices[i] = Math.max(1, Math.round(prices[i + 1] / (1 + drift)));
  }

  const today = new Date();
  return prices.map((price, idx) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - idx));
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, price };
  });
}

// ─── 기간별 가격 변화 그래프 (경량 SVG 라인 차트) ───────────────────────────

function PriceHistoryChart({ data }: { data: { date: string; price: number }[] }) {
  if (data.length === 0) {
    return <p className="fa-empty">가격 이력이 없습니다</p>;
  }

  const width = 320;
  const height = 140;
  const padding = 10;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + (height - padding * 2) * (1 - (d.price - min) / range);
    return `${x},${y}`;
  });
  const linePoints = points.join(" ");
  const areaPoints = `${padding},${height - padding} ${linePoints} ${width - padding},${height - padding}`;

  return (
    <div className="fa-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="fa-chart-svg" preserveAspectRatio="none">
        <polygon points={areaPoints} className="fa-chart-area" />
        <polyline points={linePoints} className="fa-chart-line" />
      </svg>
      <div className="fa-chart-labels">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}

// ─── 리스트 아이템(관심/추천/분류 leaf 공용) ────────────────────────────────

function ItemRow({
  icon,
  name,
  category,
  price,
  changePct,
  rank,
  onSelect,
  bookmark,
}: {
  icon: string;
  name: string;
  category: string;
  price: number;
  changePct: number;
  rank?: number;
  onSelect?: () => void;
  bookmark?: { enabled: boolean; onToggle: () => void };
}) {
  const isUp = changePct > 0;
  const isDown = changePct < 0;

  return (
    <div
      className={`fa-item${onSelect ? " selectable" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {rank !== undefined && <div className="fa-item-rank">{rank}</div>}
      <div className="fa-item-icon">{icon}</div>
      <div className="fa-item-info">
        <strong>{name}</strong>
        <small>{category}</small>
      </div>
      <div className="fa-item-price">{price > 0 ? `${price.toLocaleString()}원` : "-"}</div>
      <div className={`fa-item-change${isUp ? " up" : isDown ? " down" : ""}`}>
        {changePct !== 0 ? `${isUp ? "▲" : "▼"} ${Math.abs(changePct)}%` : "-"}
      </div>
      {bookmark && (
        <button
          className={`fa-bookmark-btn${bookmark.enabled ? " enabled" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            bookmark.onToggle();
          }}
          aria-label={bookmark.enabled ? "관심 해제" : "관심 등록"}
        >
          <IconBookmark size={16} filled={bookmark.enabled} />
        </button>
      )}
    </div>
  );
}

export default function MobileAlertView() {
  const [menuTab, setMenuTab] = useState<MenuTab>("recommend");
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<DetailTarget | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [keywords, setKeywords] = useState<KeywordSubscription[]>([]);
  const [recommendations, setRecommendations] = useState<DailyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [tickerIdx, setTickerIdx] = useState(0);

  // 관심(북마크) 품목명 집합. 서버의 키워드 구독 목록으로 초기화되며,
  // 추천/분류 화면의 북마크 버튼 토글은 세션 내에서만 유지된다
  // (실서버에 북마크 추가/삭제 API가 없어 클라이언트 상태로 우선 구현).
  const [interestNames, setInterestNames] = useState<Set<string>>(new Set());

  // 품목별 가격 알림(목표가) 설정. 절대가 기준 알림 API가 없어 세션 내 로컬 상태로 관리한다.
  const [priceAlerts, setPriceAlerts] = useState<Record<string, number>>({});
  const [alertInput, setAlertInput] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [notifs, kws, recs] = await Promise.all([
        fetchNotifications(),
        fetchKeywords(),
        fetchRecommendations(),
      ]);
      setNotifications(notifs);
      setKeywords(kws);
      setRecommendations(recs);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setInterestNames(new Set(keywords.map((kw) => kw.keyword)));
  }, [keywords]);

  useEffect(() => {
    if (!detailItem) {
      setAlertInput("");
      return;
    }
    const existing = priceAlerts[detailItem.name];
    setAlertInput(existing !== undefined ? String(existing) : "");
  }, [detailItem, priceAlerts]);

  // 상단 헤드 좌측 추천 티커: 2초마다 다음 추천 품목으로 스크롤 전환.
  const tickerItems = recommendations?.recommendations ?? [];
  useEffect(() => {
    if (tickerItems.length === 0) return;
    setTickerIdx(0);
    const id = setInterval(() => {
      setTickerIdx((i) => (i + 1) % tickerItems.length);
    }, 2000);
    return () => clearInterval(id);
  }, [tickerItems.length]);

  // 품목별 시세/등락률 카탈로그: 알림(change_pct 보유) → 추천(가격/분류) 순으로 병합한다.
  const catalog = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    for (const n of notifications) {
      if (!map.has(n.item_name)) {
        map.set(n.item_name, { category: n.category, avg_price: n.avg_price, change_pct: n.change_pct });
      }
    }
    for (const r of recommendations?.recommendations ?? []) {
      if (!map.has(r.item_name)) {
        map.set(r.item_name, { category: r.category, avg_price: r.avg_price, change_pct: 0 });
      }
    }
    return map;
  }, [notifications, recommendations]);

  // 관심 목록: 북마크된 품목명을 카탈로그에서 조회하여 구성한다.
  const interestItems = useMemo(() => {
    return [...interestNames].map((name) => {
      const info = catalog.get(name);
      return {
        name,
        category: info?.category ?? "-",
        avg_price: info?.avg_price ?? 0,
        change_pct: info?.change_pct ?? 0,
      };
    });
  }, [interestNames, catalog]);

  // 분류별 그룹핑 (상위 분류 → 하위 품목 목록)
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, { name: string; avg_price: number; change_pct: number }[]>();
    for (const [name, info] of catalog.entries()) {
      if (!info.category) continue;
      const arr = groups.get(info.category) ?? [];
      arr.push({ name, avg_price: info.avg_price, change_pct: info.change_pct });
      groups.set(info.category, arr);
    }
    return groups;
  }, [catalog]);

  // 검색: 별도 백엔드 엔드포인트 없이, 이미 불러온 추천/키워드/알림 품목명을 대상으로 검색한다.
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) return [];

    const seen = new Set<string>();
    const results: { name: string; category: string }[] = [];

    for (const item of recommendations?.recommendations ?? []) {
      if (item.item_name.toLowerCase().includes(query) && !seen.has(item.item_name)) {
        seen.add(item.item_name);
        results.push({ name: item.item_name, category: item.category });
      }
    }
    for (const kw of keywords) {
      if (kw.keyword.toLowerCase().includes(query) && !seen.has(kw.keyword)) {
        seen.add(kw.keyword);
        results.push({ name: kw.keyword, category: "내 키워드" });
      }
    }
    for (const n of notifications) {
      if (n.item_name.toLowerCase().includes(query) && !seen.has(n.item_name)) {
        seen.add(n.item_name);
        results.push({ name: n.item_name, category: n.category });
      }
    }
    return results;
  }, [searchQuery, recommendations, keywords, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleOverlay = (target: Overlay) => {
    setOverlay((current) => (current === target ? "none" : target));
  };

  const selectMenuTab = (tab: MenuTab) => {
    setMenuTab(tab);
    setOverlay("none");
  };

  const toggleBookmark = useCallback((name: string) => {
    setInterestNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const openDetail = useCallback((target: DetailTarget) => {
    setDetailItem(target);
  }, []);

  const priceHistory = useMemo(() => {
    if (!detailItem) return [];
    return buildMockPriceHistory(detailItem.name, detailItem.price);
  }, [detailItem]);

  const saveAlert = () => {
    if (!detailItem) return;
    const value = Number(alertInput);
    if (!Number.isFinite(value) || value <= 0) return;
    setPriceAlerts((prev) => ({ ...prev, [detailItem.name]: value }));
  };

  const clearAlert = () => {
    if (!detailItem) return;
    setPriceAlerts((prev) => {
      const next = { ...prev };
      delete next[detailItem.name];
      return next;
    });
    setAlertInput("");
  };

  return (
    <div className="mobile-app">
      {/* [상단1 헤드]: 좌측 추천 티커 + 우측 검색/설정 아이콘 */}
      <header className="fa-head">
        <div className="fa-ticker">
          {tickerItems.length > 0 ? (
            <div className="fa-ticker-track" key={tickerItems[tickerIdx]?.item_id ?? tickerIdx}>
              <span className="fa-ticker-icon">{getFoodIcon(tickerItems[tickerIdx].item_name)}</span>
              <span className="fa-ticker-name">{tickerItems[tickerIdx].item_name}</span>
              <span className="fa-ticker-price">{tickerItems[tickerIdx].avg_price.toLocaleString()}원</span>
            </div>
          ) : (
            <span className="fa-ticker-empty">추천 준비 중...</span>
          )}
        </div>
        <div className="fa-head-icons">
          <button
            className={`fa-head-icon-btn${overlay === "search" ? " active" : ""}`}
            onClick={() => toggleOverlay("search")}
            aria-label="검색"
          >
            <IconSearch size={20} />
          </button>
          <button
            className={`fa-head-icon-btn${overlay === "settings" ? " active" : ""}`}
            onClick={() => toggleOverlay("settings")}
            aria-label="설정"
          >
            <IconSettings size={20} />
          </button>
        </div>
      </header>

      {/* [상단2 알림바]: 공지/광고 데이터가 없으면 자리를 차지하지 않는다 */}
      {ANNOUNCEMENTS.length > 0 && (
        <div className="fa-notice-bar">{ANNOUNCEMENTS[0]}</div>
      )}

      {/* [본문 리스트] */}
      <div className="fa-body">
        {overlay === "search" && (
          <div className="fa-search">
            <input
              type="text"
              className="fa-search-input"
              placeholder="품목명을 검색하세요 (예: 사과, 삼겹살)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery.trim().length === 0 && <p className="fa-empty">검색어를 입력해주세요</p>}
            {searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <p className="fa-empty">검색 결과가 없습니다</p>
            )}
            {searchResults.length > 0 && (
              <div className="fa-list">
                {searchResults.map((item) => (
                  <ItemRow
                    key={item.name}
                    icon={getFoodIcon(item.name)}
                    name={item.name}
                    category={item.category}
                    price={catalog.get(item.name)?.avg_price ?? 0}
                    changePct={catalog.get(item.name)?.change_pct ?? 0}
                    onSelect={() =>
                      openDetail({
                        name: item.name,
                        category: item.category,
                        price: catalog.get(item.name)?.avg_price ?? 0,
                        changePct: catalog.get(item.name)?.change_pct ?? 0,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {overlay === "settings" && (
          <div className="fa-settings">
            <div className="fa-settings-avatar"><IconUser size={34} /></div>
            <strong className="fa-settings-name">user_dev_01</strong>
            <div className="fa-settings-stats">
              <div className="fa-settings-stat">
                <b>{interestNames.size}</b>
                <span>구독 키워드</span>
              </div>
              <div className="fa-settings-stat">
                <b>{unreadCount}</b>
                <span>읽지 않은 알림</span>
              </div>
              <div className="fa-settings-stat">
                <b>{recommendations?.recommendations.length ?? 0}</b>
                <span>오늘의 추천</span>
              </div>
            </div>
          </div>
        )}

        {overlay === "none" && loading && <p className="fa-loading">불러오는 중...</p>}

        {overlay === "none" && !loading && menuTab === "interest" && (
          interestItems.length === 0 ? (
            <p className="fa-empty">등록된 키워드가 없습니다</p>
          ) : (
            <div className="fa-list">
              {interestItems.map((item) => (
                <ItemRow
                  key={item.name}
                  icon={getFoodIcon(item.name)}
                  name={item.name}
                  category={item.category}
                  price={item.avg_price}
                  changePct={item.change_pct}
                  onSelect={() =>
                    openDetail({
                      name: item.name,
                      category: item.category,
                      price: item.avg_price,
                      changePct: item.change_pct,
                    })
                  }
                  bookmark={{
                    enabled: interestNames.has(item.name),
                    onToggle: () => toggleBookmark(item.name),
                  }}
                />
              ))}
            </div>
          )
        )}

        {overlay === "none" && !loading && menuTab === "recommend" && (
          !recommendations || recommendations.recommendations.length === 0 ? (
            <p className="fa-empty">추천 데이터가 없습니다</p>
          ) : (
            <div className="fa-list">
              {recommendations.recommendations.map((item, idx) => (
                <ItemRow
                  key={item.item_id}
                  rank={idx + 1}
                  icon={getFoodIcon(item.item_name)}
                  name={item.item_name}
                  category={item.category}
                  price={item.avg_price}
                  changePct={catalog.get(item.item_name)?.change_pct ?? 0}
                  onSelect={() =>
                    openDetail({
                      name: item.item_name,
                      category: item.category,
                      price: item.avg_price,
                      changePct: catalog.get(item.item_name)?.change_pct ?? 0,
                    })
                  }
                  bookmark={{
                    enabled: interestNames.has(item.item_name),
                    onToggle: () => toggleBookmark(item.item_name),
                  }}
                />
              ))}
            </div>
          )
        )}

        {overlay === "none" && !loading && menuTab === "category" && (
          categoryGroups.size === 0 ? (
            <p className="fa-empty">분류 데이터가 없습니다</p>
          ) : (
            <div className="fa-list">
              {[...categoryGroups.entries()].map(([category, items]) => (
                <div key={category} className="fa-category-group">
                  <button
                    className="fa-category-header"
                    onClick={() => setExpandedCategory((c) => (c === category ? null : category))}
                  >
                    <span className="fa-category-icon">{getCategoryIcon(category)}</span>
                    <span className="fa-category-name">{category}</span>
                    <span className={`fa-category-chevron${expandedCategory === category ? " open" : ""}`}>
                      ›
                    </span>
                  </button>
                  {expandedCategory === category && (
                    <div className="fa-category-children">
                      {items.map((it) => (
                        <ItemRow
                          key={it.name}
                          icon={getFoodIcon(it.name)}
                          name={it.name}
                          category={category}
                          price={it.avg_price}
                          changePct={it.change_pct}
                          onSelect={() =>
                            openDetail({
                              name: it.name,
                              category,
                              price: it.avg_price,
                              changePct: it.change_pct,
                            })
                          }
                          bookmark={{
                            enabled: interestNames.has(it.name),
                            onToggle: () => toggleBookmark(it.name),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* [하위 메뉴바]: 관심 / 추천 / 분류 */}
      <nav className="fa-bottom-menu">
        {MENU_CONFIG.map((tab) => (
          <button
            key={tab.key}
            className={`fa-bottom-menu-item${overlay === "none" && menuTab === tab.key ? " active" : ""}`}
            onClick={() => selectMenuTab(tab.key)}
          >
            <span className="fa-bottom-menu-icon">{tab.icon}</span>
            <span className="fa-bottom-menu-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* [상세 화면]: 기간별 가격 변화 그래프 + 가격 알림 설정 */}
      {detailItem && (
        <div className="fa-detail-screen">
          <header className="fa-detail-header">
            <button className="fa-detail-back" onClick={() => setDetailItem(null)} aria-label="뒤로가기">
              <IconChevronLeft size={20} />
            </button>
            <span className="fa-detail-icon">{getFoodIcon(detailItem.name)}</span>
            <div className="fa-detail-title">
              <strong>{detailItem.name}</strong>
              <small>{detailItem.category}</small>
            </div>
          </header>

          <div className="fa-detail-body">
            <div className="fa-detail-price-row">
              <span className="fa-detail-price">
                {detailItem.price > 0 ? `${detailItem.price.toLocaleString()}원` : "-"}
              </span>
              <span
                className={`fa-detail-change${
                  detailItem.changePct > 0 ? " up" : detailItem.changePct < 0 ? " down" : ""
                }`}
              >
                {detailItem.changePct !== 0
                  ? `${detailItem.changePct > 0 ? "▲" : "▼"} ${Math.abs(detailItem.changePct)}%`
                  : "-"}
              </span>
            </div>

            <h3 className="fa-detail-section-title">최근 14일 가격 변화</h3>
            <PriceHistoryChart data={priceHistory} />

            <div className="fa-alert-box">
              <h3 className="fa-detail-section-title">가격 알림 설정</h3>
              {priceAlerts[detailItem.name] !== undefined ? (
                <div className="fa-alert-existing">
                  <span>{priceAlerts[detailItem.name].toLocaleString()}원 이하로 떨어지면 알림</span>
                  <button className="fa-alert-clear-btn" onClick={clearAlert}>
                    알림 해제
                  </button>
                </div>
              ) : (
                <div className="fa-alert-form">
                  <input
                    type="number"
                    className="fa-alert-input"
                    placeholder="목표 가격(원)을 입력하세요"
                    value={alertInput}
                    onChange={(e) => setAlertInput(e.target.value)}
                  />
                  <button className="fa-alert-save-btn" onClick={saveAlert}>
                    알림 설정
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
