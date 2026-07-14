import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNotifications, fetchKeywords, fetchRecommendations } from "../api/freshAlert";
import type { Notification, KeywordSubscription, DailyRecommendation } from "../api/freshAlert";

type AlertTab = "recommend" | "keyword" | "category";
type BottomNavTab = "home" | "search" | "notifications" | "profile";

const TAB_CONFIG: { key: AlertTab; label: string; icon: string; color: string }[] = [
  { key: "recommend", label: "추천", icon: "🎯", color: "#2E7D32" },
  { key: "keyword", label: "키워드", icon: "🔑", color: "#1565C0" },
  { key: "category", label: "분류", icon: "📂", color: "#E65100" },
];

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

function getFoodIcon(name: string): string {
  if (FOOD_ICONS[name]) return FOOD_ICONS[name];
  for (const [key, icon] of Object.entries(FOOD_ICONS)) {
    if (name.includes(key) || key.includes(name)) return icon;
  }
  return "🥗";
}

export default function MobileAlertView() {
  const [activeTab, setActiveTab] = useState<AlertTab>("recommend");
  const [bottomActiveTab, setBottomActiveTab] = useState<BottomNavTab>("home");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [keywords, setKeywords] = useState<KeywordSubscription[]>([]);
  const [recommendations, setRecommendations] = useState<DailyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

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

  // 알림 읽음 처리: 백엔드에 읽음 상태 저장 API가 없어 세션 내에서만 유지된다.
  const handleMarkRead = useCallback((notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mobile-app">
      {/* Header */}
      <header className="mobile-app-header">
        <h1 className="mobile-app-title">FreshAlert</h1>
        <p className="mobile-app-subtitle">오늘의 신선식품 알리미</p>
        {unreadCount > 0 && (
          <span className="mobile-app-badge">{unreadCount}개 새 알림</span>
        )}
      </header>

      {/* Tab selector (홈 화면 전용) */}
      {bottomActiveTab === "home" && (
        <nav className="mobile-app-tabs">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              className={`mobile-app-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              style={
                activeTab === tab.key
                  ? { borderBottomColor: tab.color, color: tab.color }
                  : undefined
              }
            >
              <span className="mobile-app-tab-icon">{tab.icon}</span>
              <span className="mobile-app-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Content */}
      <div className="mobile-app-content">
        {loading && bottomActiveTab === "home" && <p className="mobile-app-loading">불러오는 중...</p>}

        {!loading && bottomActiveTab === "home" && activeTab === "recommend" && (
          <div className="mobile-app-list">
            {recommendations?.recommendations.slice(0, 5).map((item, idx) => (
              <div key={item.item_id} className="mobile-app-card">
                <div className="mobile-app-rank">{idx + 1}</div>
                <div className="mobile-app-card-info">
                  <strong>{item.item_name}</strong>
                  <small>{item.category} · {item.market_name}</small>
                </div>
                <div className="mobile-app-price">
                  {item.avg_price.toLocaleString()}원
                </div>
              </div>
            )) ?? <p className="mobile-app-empty">추천 데이터가 없습니다</p>}
          </div>
        )}

        {!loading && bottomActiveTab === "home" && activeTab === "keyword" && (
          <div className="mobile-app-list">
            {keywords.length === 0 ? (
              <p className="mobile-app-empty">등록된 키워드가 없습니다</p>
            ) : (
              keywords.map((kw) => (
                <div key={kw.keyword} className="mobile-app-card">
                  <div className="mobile-app-icon" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
                    {getFoodIcon(kw.keyword)}
                  </div>
                  <div className="mobile-app-card-info">
                    <strong>{kw.keyword}</strong>
                    <small>{kw.threshold_pct}% 이상 변동 시 알림</small>
                  </div>
                  <div className={`mobile-app-toggle${kw.alert_enabled ? " on" : ""}`}>
                    {kw.alert_enabled ? "ON" : "OFF"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && bottomActiveTab === "home" && activeTab === "category" && (
          <div className="mobile-app-list">
            {notifications.length === 0 ? (
              <p className="mobile-app-empty">알림이 없습니다</p>
            ) : (
              notifications.slice(0, 10).map((n, idx) => (
                <div key={`${n.id}-${idx}`} className={`mobile-app-card${!n.read ? " unread" : ""}`}>
                  <div className="mobile-app-icon" style={{ background: "#FBE9E7", color: "#E65100" }}>
                    📂
                  </div>
                  <div className="mobile-app-card-info">
                    <strong>{n.item_name}</strong>
                    <small>{n.message}</small>
                  </div>
                  <div className="mobile-app-change">
                    {n.change_pct > 0 ? "▲" : "▼"} {Math.abs(n.change_pct)}%
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {bottomActiveTab === "search" && (
          <div className="mobile-app-search">
            <input
              type="text"
              className="mobile-app-search-input"
              placeholder="품목명을 검색하세요 (예: 사과, 삼겹살)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery.trim().length === 0 && (
              <p className="mobile-app-empty">검색어를 입력해주세요</p>
            )}
            {searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <p className="mobile-app-empty">검색 결과가 없습니다</p>
            )}
            {searchResults.length > 0 && (
              <div className="mobile-app-list">
                {searchResults.map((item) => (
                  <div key={item.name} className="mobile-app-card">
                    <div className="mobile-app-icon" style={{ background: "#E3F2FD", color: "#1565C0" }}>
                      {getFoodIcon(item.name)}
                    </div>
                    <div className="mobile-app-card-info">
                      <strong>{item.name}</strong>
                      <small>{item.category}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {bottomActiveTab === "notifications" && (
          <div className="mobile-app-list">
            {notifications.length === 0 ? (
              <p className="mobile-app-empty">알림이 없습니다</p>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={`${n.id}-${idx}`}
                  className={`mobile-app-card${!n.read ? " unread" : ""}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mobile-app-icon" style={{ background: "#FBE9E7", color: "#E65100" }}>
                    {getFoodIcon(n.item_name)}
                  </div>
                  <div className="mobile-app-card-info">
                    <strong>{n.item_name}</strong>
                    <small>{n.message}</small>
                  </div>
                  <div className="mobile-app-change">
                    {n.change_pct > 0 ? "▲" : "▼"} {Math.abs(n.change_pct)}%
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {bottomActiveTab === "profile" && (
          <div className="mobile-app-profile">
            <div className="mobile-app-profile-avatar">👤</div>
            <strong className="mobile-app-profile-name">user_dev_01</strong>
            <div className="mobile-app-profile-stats">
              <div className="mobile-app-profile-stat">
                <b>{keywords.length}</b>
                <span>구독 키워드</span>
              </div>
              <div className="mobile-app-profile-stat">
                <b>{unreadCount}</b>
                <span>읽지 않은 알림</span>
              </div>
              <div className="mobile-app-profile-stat">
                <b>{recommendations?.recommendations.length ?? 0}</b>
                <span>오늘의 추천</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="mobile-app-bottom-nav">
        <button
          className={`mobile-app-nav-item${bottomActiveTab === "home" ? " active" : ""}`}
          onClick={() => setBottomActiveTab("home")}
        >
          <span>🏠</span>
          <small>홈</small>
        </button>
        <button
          className={`mobile-app-nav-item${bottomActiveTab === "search" ? " active" : ""}`}
          onClick={() => setBottomActiveTab("search")}
        >
          <span>🔍</span>
          <small>검색</small>
        </button>
        <button
          className={`mobile-app-nav-item${bottomActiveTab === "notifications" ? " active" : ""}`}
          onClick={() => setBottomActiveTab("notifications")}
        >
          <span>🔔</span>
          {unreadCount > 0 && <span className="mobile-app-nav-dot" />}
          <small>알림</small>
        </button>
        <button
          className={`mobile-app-nav-item${bottomActiveTab === "profile" ? " active" : ""}`}
          onClick={() => setBottomActiveTab("profile")}
        >
          <span>👤</span>
          <small>내 정보</small>
        </button>
      </nav>
    </div>
  );
}
