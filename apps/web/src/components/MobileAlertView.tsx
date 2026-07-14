import { useCallback, useEffect, useState } from "react";
import { fetchNotifications, fetchKeywords, fetchRecommendations } from "../api/freshAlert";
import type { Notification, KeywordSubscription, DailyRecommendation } from "../api/freshAlert";

type AlertTab = "recommend" | "keyword" | "category";

const TAB_CONFIG: { key: AlertTab; label: string; icon: string; color: string }[] = [
  { key: "recommend", label: "추천", icon: "🎯", color: "#2E7D32" },
  { key: "keyword", label: "키워드", icon: "🔑", color: "#1565C0" },
  { key: "category", label: "분류", icon: "📂", color: "#E65100" },
];

export default function MobileAlertView() {
  const [activeTab, setActiveTab] = useState<AlertTab>("recommend");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [keywords, setKeywords] = useState<KeywordSubscription[]>([]);
  const [recommendations, setRecommendations] = useState<DailyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <section className="mobile-alert-view" id="mobile">
      {/* Phone frame */}
      <div className="phone-frame">
        {/* Status bar */}
        <div className="phone-status-bar">
          <span className="phone-time">9:41</span>
          <div className="phone-status-icons">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Header */}
        <div className="phone-header">
          <h2 className="phone-title">FreshAlert</h2>
          <p className="phone-subtitle">오늘의 신선식품 알리미</p>
          {unreadCount > 0 && (
            <span className="phone-unread-badge">{unreadCount}개 새 알림</span>
          )}
        </div>

        {/* Tab selector */}
        <div className="alert-tabs">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              className={`alert-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              style={
                activeTab === tab.key
                  ? { borderBottomColor: tab.color, color: tab.color }
                  : undefined
              }
            >
              <span className="alert-tab-icon">{tab.icon}</span>
              <span className="alert-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="phone-content">
          {loading && <p className="phone-loading">불러오는 중...</p>}

          {!loading && activeTab === "recommend" && (
            <div className="phone-list">
              {recommendations?.recommendations.slice(0, 5).map((item, idx) => (
                <div key={item.item_id} className="phone-card">
                  <div className="phone-card-rank" style={{ background: "#2E7D32" }}>
                    {idx + 1}
                  </div>
                  <div className="phone-card-info">
                    <strong>{item.item_name}</strong>
                    <small>{item.category} · {item.market_name}</small>
                  </div>
                  <div className="phone-card-price">
                    {item.avg_price.toLocaleString()}원
                  </div>
                </div>
              )) ?? <p className="phone-empty">추천 데이터가 없습니다</p>}
            </div>
          )}

          {!loading && activeTab === "keyword" && (
            <div className="phone-list">
              {keywords.length === 0 ? (
                <p className="phone-empty">등록된 키워드가 없습니다</p>
              ) : (
                keywords.map((kw) => (
                  <div key={kw.keyword} className="phone-card">
                    <div className="phone-card-icon" style={{ background: "#E3F2FD", color: "#1565C0" }}>
                      🔑
                    </div>
                    <div className="phone-card-info">
                      <strong>{kw.keyword}</strong>
                      <small>{kw.threshold_pct}% 이상 변동 시 알림</small>
                    </div>
                    <div className={`phone-toggle${kw.alert_enabled ? " on" : ""}`}>
                      {kw.alert_enabled ? "ON" : "OFF"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && activeTab === "category" && (
            <div className="phone-list">
              {notifications.length === 0 ? (
                <p className="phone-empty">알림이 없습니다</p>
              ) : (
                notifications.slice(0, 8).map((n, idx) => (
                  <div key={`${n.id}-${idx}`} className={`phone-card${!n.read ? " unread" : ""}`}>
                    <div className="phone-card-icon" style={{ background: "#FBE9E7", color: "#E65100" }}>
                      📂
                    </div>
                    <div className="phone-card-info">
                      <strong>{n.item_name}</strong>
                      <small>{n.message}</small>
                    </div>
                    <div className="phone-card-meta">
                      <span className="phone-change">
                        {n.change_pct > 0 ? "▲" : "▼"} {Math.abs(n.change_pct)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="phone-bottom-nav">
          <div className="phone-nav-item active">
            <span>🏠</span>
            <small>홈</small>
          </div>
          <div className="phone-nav-item">
            <span>🔍</span>
            <small>검색</small>
          </div>
          <div className="phone-nav-item">
            <span>🔔</span>
            <small>알림</small>
          </div>
          <div className="phone-nav-item">
            <span>👤</span>
            <small>내 정보</small>
          </div>
        </div>
      </div>
    </section>
  );
}
