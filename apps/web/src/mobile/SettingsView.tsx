/**
 * 설정 화면 (하단 내비 "설정").
 * 알림 요약, 최근 알림, 데이터 연동 상태를 보여준다.
 */
import { Notification } from "../api/freshAlert";
import { BellIcon } from "./icons";
import { formatRelTime } from "./utils";

const TYPE_LABEL: Record<Notification["type"], string> = {
  recommend: "추천",
  keyword: "키워드",
  category: "북마크",
};

interface IntegrationStatus {
  name: string;
  desc: string;
  state: "connected" | "pending";
}

const INTEGRATIONS: IntegrationStatus[] = [
  { name: "MAFRA 도매가격", desc: "농림축산식품부 공공데이터", state: "pending" },
  { name: "KAMIS 소매가격", desc: "농산물유통정보", state: "pending" },
  { name: "FCM 푸시 알림", desc: "Firebase Cloud Messaging", state: "pending" },
];

export default function SettingsView({
  keywordCount,
  bookmarkCount,
  notifications,
}: {
  keywordCount: number;
  bookmarkCount: number;
  notifications: Notification[];
}) {
  const unread = notifications.filter((n) => !n.read_at).length;
  const recent = notifications.slice(0, 6);

  return (
    <div className="fam-view">
      <div className="fam-stat-row">
        <div className="fam-stat">
          <b>{keywordCount}</b>
          <span>키워드</span>
        </div>
        <div className="fam-stat">
          <b>{bookmarkCount}</b>
          <span>북마크</span>
        </div>
        <div className="fam-stat">
          <b>{unread}</b>
          <span>읽지 않음</span>
        </div>
      </div>

      <section className="fam-group">
        <div className="fam-section-head">
          <h2>최근 알림</h2>
          <span className="fam-section-rule" />
        </div>
        {recent.length === 0 && <p className="fam-hint">받은 알림이 없습니다</p>}
        {recent.map((n) => (
          <article key={n.id} className={`fam-row${n.read_at ? "" : " unread"}`}>
            <span className="fam-thumb fam-thumb-bell" aria-hidden>
              <BellIcon size={18} />
            </span>
            <div className="fam-row-main">
              <div className="fam-row-title">
                <strong>{n.title}</strong>
                <span className="fam-tag">{TYPE_LABEL[n.type]}</span>
              </div>
              <span className="fam-sub">{n.body}</span>
            </div>
            <span className="fam-time">{formatRelTime(n.sent_at)}</span>
          </article>
        ))}
      </section>

      <section className="fam-group">
        <div className="fam-section-head">
          <h2>데이터 연동</h2>
          <span className="fam-section-rule" />
        </div>
        {INTEGRATIONS.map((it) => (
          <article key={it.name} className="fam-row">
            <div className="fam-row-main">
              <div className="fam-row-title">
                <strong>{it.name}</strong>
              </div>
              <span className="fam-sub">{it.desc}</span>
            </div>
            <span className={`fam-status ${it.state === "connected" ? "on" : "off"}`}>
              {it.state === "connected" ? "연동됨" : "연동 대기"}
            </span>
          </article>
        ))}
      </section>

      <p className="fam-version">신선알리미 (FreshAlert) · v0.1.0</p>
    </div>
  );
}
