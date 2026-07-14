import { useEffect, useState } from "react";
import {
  DailyRecommendation,
  KeywordSubscription,
  Notification,
  SeasonInfo,
  fetchCurrentSeason,
  fetchKeywords,
  fetchNotifications,
  fetchRecommendations,
} from "../api/freshAlert";

// ─── 추천 TOP5 ────────────────────────────────────────────────────────────────

function RecommendSection() {
  const [data, setData] = useState<DailyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchRecommendations()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <article className="module-card">
      <div className="fa-card-header">
        <h2>오늘의 추천 TOP 5</h2>
        {data && <span className="fa-date">{data.date}</span>}
      </div>

      {loading && <p className="fa-loading">분석 중...</p>}
      {error && <p className="fa-error">백엔드 API 연결 필요</p>}

      {data && (
        <ul className="fa-rec-list">
          {data.recommendations.slice(0, 5).map((item, idx) => (
            <li key={item.item_id} className="fa-rec-row">
              <span className="fa-rank">{idx + 1}</span>
              <div className="fa-rec-info">
                <strong>{item.item_name}</strong>
                <small>{item.category} · {item.market_name}</small>
              </div>
              <div className="fa-rec-right">
                <span className="fa-price">{item.avg_price.toLocaleString()}원/{item.unit}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ─── 제철 캘린더 ──────────────────────────────────────────────────────────────

function SeasonSection() {
  const [data, setData] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    fetchCurrentSeason().then(setData).catch(() => null);
  }, []);

  return (
    <article className="module-card">
      <div className="fa-card-header">
        <h2>이달의 제철</h2>
        {data && <span className="fa-date">{data.season}</span>}
      </div>

      {!data && <p className="fa-loading">불러오는 중...</p>}

      {data && (
        <div className="fa-season-grid">
          <div className="fa-chips">
            {data.items.map((item) => (
              <span key={item.item_name} className="fa-chip">
                {item.item_name}
                {item.avg_price > 0 && (
                  <small> {item.avg_price.toLocaleString()}원</small>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ─── 키워드 구독 ──────────────────────────────────────────────────────────────

function KeywordSection() {
  const [data, setData] = useState<KeywordSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeywords()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <article className="module-card">
      <div className="fa-card-header">
        <h2>내 키워드 알림</h2>
        <span className="fa-date">{data.length}/20</span>
      </div>

      {loading && <p className="fa-loading">불러오는 중...</p>}

      {!loading && data.length === 0 && (
        <p className="fa-empty">등록된 키워드가 없습니다</p>
      )}

      {data.length > 0 && (
        <div className="fa-keyword-list">
          {data.map((kw) => (
            <div key={kw.keyword} className={`fa-keyword-chip${kw.alert_enabled ? "" : " disabled"}`}>
              <span>{kw.keyword}</span>
              <small>{kw.threshold_pct}% 이상 변동 시 알림</small>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

// ─── 알림 목록 ────────────────────────────────────────────────────────────────

function NotificationSection() {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const unread = data.filter((n) => !n.read).length;

  return (
    <article className="module-card wide">
      <div className="fa-card-header">
        <h2>최근 알림</h2>
        {unread > 0 && <span className="fa-unread-badge">{unread}개 읽지 않음</span>}
      </div>

      {loading && <p className="fa-loading">불러오는 중...</p>}

      {!loading && data.length === 0 && (
        <p className="fa-empty">알림이 없습니다</p>
      )}

      {data.length > 0 && (
        <ul className="fa-notif-list">
          {data.map((n, idx) => (
            <li key={`${n.id}-${idx}`} className={`fa-notif-row${n.read ? "" : " unread"}`}>
              <span className="fa-notif-type">{n.category}</span>
              <div className="fa-notif-body">
                <strong>{n.item_name}</strong>
                <p>{n.message}</p>
              </div>
              <span className="fa-notif-time">{n.sale_date} · {n.market_name}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ─── 메인 FreshAlert 섹션 ─────────────────────────────────────────────────────

export default function FreshAlertSection() {
  return (
    <section className="fresh-alert-section" id="fresh-alert">
      <div className="fa-section-header">
        <div>
          <h2>FreshAlert</h2>
          <p>실시간 제철 농식품 가격 알림 서비스 — 오늘 가장 저렴한 신선식품을 확인하세요</p>
        </div>
        <span className="fa-live-badge">● LIVE</span>
      </div>

      <div className="module-grid">
        <RecommendSection />
        <SeasonSection />
        <KeywordSection />
        <NotificationSection />
      </div>
    </section>
  );
}
