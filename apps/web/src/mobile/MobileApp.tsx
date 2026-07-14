/**
 * 신선알리미 (FreshAlert) 모바일 시작 화면.
 *
 * 참조 디자인(contents_list.png)의 레이아웃을 모방한 모바일 특화 화면.
 * - 상단: 메뉴 · 타이틀 · 추가 버튼
 * - 세그먼트 탭: 추천 / 키워드 / 북마크 (알람 목록 필터)
 * - 검색 바 + 섹션형 알람 목록
 * - 하단 플로팅 내비게이션: 홈 / 카테고리 / 검색 / 설정
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CategorySubscription,
  DailyRecommendation,
  KeywordSubscription,
  Notification,
  RecommendationItem,
  fetchKeywords,
  fetchNotifications,
  fetchRecommendations,
  fetchSubscribedCategories,
} from "../api/freshAlert";
import { getThumb } from "./catalog";
import {
  BellIcon,
  GridIcon,
  HomeIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "./icons";
import CategoryView from "./CategoryView";
import SearchView from "./SearchView";
import SettingsView from "./SettingsView";
import { formatDropRate, formatNotifyDays, formatWon } from "./utils";
import "./mobile.css";

type Tab = "recommend" | "keyword" | "bookmark";
type ViewId = "home" | "category" | "search" | "settings";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "recommend", label: "추천" },
  { id: "keyword", label: "키워드" },
  { id: "bookmark", label: "북마크" },
];

// ─── 재사용 컴포넌트 ──────────────────────────────────────────────────────────

function Thumbnail({ name, category }: { name: string; category?: string }) {
  const thumb = getThumb(name, category);
  return (
    <span className="fam-thumb" style={{ background: thumb.bg }} aria-hidden>
      {thumb.emoji}
    </span>
  );
}

function SectionHeader({ title, badge, badgeTone }: { title: string; badge?: string; badgeTone?: "salmon" | "green" }) {
  return (
    <div className="fam-section-head">
      <h2>{title}</h2>
      {badge && <span className={`fam-badge fam-badge-${badgeTone ?? "salmon"}`}>{badge}</span>}
      <span className="fam-section-rule" />
    </div>
  );
}

// ─── 추천 탭 ─────────────────────────────────────────────────────────────────

function groupByCategory(items: RecommendationItem[]): Array<[string, RecommendationItem[]]> {
  const map = new Map<string, RecommendationItem[]>();
  for (const it of items) {
    const key = it.large_name || "기타";
    const arr = map.get(key) ?? [];
    arr.push(it);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function RecommendList({ data, filter }: { data: DailyRecommendation | null; filter: string }) {
  const items = (data?.items ?? []).filter((it) => it.item_name.toLowerCase().includes(filter));
  if (items.length === 0) {
    return <EmptyState emoji="🥗" text="추천 알람이 없습니다" hint="잠시 후 다시 확인해 주세요" />;
  }
  const groups = groupByCategory(items);
  return (
    <div className="fam-list">
      {groups.map(([cat, groupItems]) => {
        const hotDeal = groupItems.some((it) => Math.abs(it.price_drop_rate) >= 10);
        return (
          <section key={cat} className="fam-group">
            <SectionHeader title={cat} badge={hotDeal ? "특가" : undefined} badgeTone="salmon" />
            {groupItems.map((it) => (
              <article key={it.item_id} className="fam-row">
                <Thumbnail name={it.item_name} category={it.large_name} />
                <div className="fam-row-main">
                  <div className="fam-row-title">
                    <strong>{it.item_name}</strong>
                    {it.is_season && <span className="fam-tag fam-tag-green">제철</span>}
                  </div>
                  <span className="fam-price">{formatWon(it.current_price)}</span>
                </div>
                <span className="fam-drop-chip" title="30일 평균 대비 하락률">
                  ▼ {formatDropRate(it.price_drop_rate)}
                </span>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

// ─── 키워드 탭 ────────────────────────────────────────────────────────────────

function KeywordList({
  data,
  filter,
  onAdd,
}: {
  data: KeywordSubscription[];
  filter: string;
  onAdd: () => void;
}) {
  const items = data.filter((kw) => kw.item_name.toLowerCase().includes(filter));
  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🔍"
        text="등록된 키워드가 없습니다"
        hint="관심 품목을 키워드로 등록하면 가격 하락 시 알려드려요"
        actionLabel="키워드 추가"
        onAction={onAdd}
      />
    );
  }
  return (
    <div className="fam-list">
      <section className="fam-group">
        <SectionHeader title="키워드 알림" badge={`${items.length}건`} />
        {items.map((kw) => (
          <article key={kw.id} className={`fam-row${kw.enabled ? "" : " is-off"}`}>
            <Thumbnail name={kw.item_name} />
            <div className="fam-row-main">
              <div className="fam-row-title">
                <strong>{kw.item_name}</strong>
              </div>
              <span className="fam-sub">
                {kw.threshold_type === "percentage"
                  ? `${kw.threshold_value}% 이하 알림`
                  : `${formatWon(kw.threshold_value)} 이하 알림`}
              </span>
            </div>
            <span className={`fam-status ${kw.enabled ? "on" : "off"}`}>{kw.enabled ? "ON" : "OFF"}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

// ─── 북마크 탭 ────────────────────────────────────────────────────────────────

function BookmarkList({
  data,
  filter,
  onAdd,
}: {
  data: CategorySubscription[];
  filter: string;
  onAdd: () => void;
}) {
  const items = data.filter((c) =>
    (c.mid_name ?? c.large_name).toLowerCase().includes(filter) ||
    c.large_name.toLowerCase().includes(filter),
  );
  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🔖"
        text="북마크한 카테고리가 없습니다"
        hint="식품 카테고리를 북마크하면 제철·특가 소식을 받아요"
        actionLabel="카테고리 선택"
        onAction={onAdd}
      />
    );
  }
  return (
    <div className="fam-list">
      <section className="fam-group">
        <SectionHeader title="북마크 알림" badge={`${items.length}건`} />
        {items.map((c) => (
          <article key={c.id} className={`fam-row${c.enabled ? "" : " is-off"}`}>
            <Thumbnail name={c.large_name} category={c.large_name} />
            <div className="fam-row-main">
              <div className="fam-row-title">
                <strong>{c.mid_name ? `${c.large_name} · ${c.mid_name}` : c.large_name}</strong>
              </div>
              <span className="fam-sub">{formatNotifyDays(c.notify_days)}요일 알림</span>
            </div>
            <span className={`fam-status ${c.enabled ? "on" : "off"}`}>{c.enabled ? "ON" : "OFF"}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

// ─── 공용 빈 상태 ─────────────────────────────────────────────────────────────

function EmptyState({
  emoji,
  text,
  hint,
  actionLabel,
  onAction,
}: {
  emoji: string;
  text: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fam-empty">
      <span className="fam-empty-emoji" aria-hidden>
        {emoji}
      </span>
      <strong>{text}</strong>
      {hint && <p>{hint}</p>}
      {actionLabel && onAction && (
        <button className="fam-empty-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── 홈 화면 ─────────────────────────────────────────────────────────────────

function HomeView({
  tab,
  setTab,
  query,
  setQuery,
  recommendations,
  keywords,
  bookmarks,
  loading,
  error,
  onReload,
  goSearch,
  goCategory,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  query: string;
  setQuery: (q: string) => void;
  recommendations: DailyRecommendation | null;
  keywords: KeywordSubscription[];
  bookmarks: CategorySubscription[];
  loading: boolean;
  error: boolean;
  onReload: () => void;
  goSearch: () => void;
  goCategory: () => void;
}) {
  const filter = query.trim().toLowerCase();

  return (
    <>
      <div className="fam-segment" role="tablist" aria-label="알람 종류">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`fam-seg-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="fam-search">
        <SearchIcon size={18} className="fam-search-icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="알람·품목 검색"
          aria-label="알람 검색"
        />
      </div>

      {error && (
        <div className="fam-banner">
          <span>백엔드 API에 연결하지 못했습니다.</span>
          <button onClick={onReload}>다시 시도</button>
        </div>
      )}

      {loading ? (
        <div className="fam-skeleton-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="fam-skeleton-row" />
          ))}
        </div>
      ) : (
        <>
          {tab === "recommend" && <RecommendList data={recommendations} filter={filter} />}
          {tab === "keyword" && <KeywordList data={keywords} filter={filter} onAdd={goSearch} />}
          {tab === "bookmark" && <BookmarkList data={bookmarks} filter={filter} onAdd={goCategory} />}
        </>
      )}
    </>
  );
}

// ─── 메인 앱 셸 ───────────────────────────────────────────────────────────────

const NAV: Array<{ id: ViewId; label: string; Icon: typeof HomeIcon }> = [
  { id: "home", label: "홈", Icon: HomeIcon },
  { id: "category", label: "카테고리", Icon: GridIcon },
  { id: "search", label: "검색", Icon: SearchIcon },
  { id: "settings", label: "설정", Icon: SettingsIcon },
];

const VIEW_TITLE: Record<ViewId, string> = {
  home: "신선알리미",
  category: "카테고리",
  search: "키워드 검색",
  settings: "설정",
};

export default function MobileApp() {
  const [view, setView] = useState<ViewId>("home");
  const [tab, setTab] = useState<Tab>("recommend");
  const [query, setQuery] = useState("");

  const [recommendations, setRecommendations] = useState<DailyRecommendation | null>(null);
  const [keywords, setKeywords] = useState<KeywordSubscription[]>([]);
  const [bookmarks, setBookmarks] = useState<CategorySubscription[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    const results = await Promise.allSettled([
      fetchRecommendations(),
      fetchKeywords(),
      fetchSubscribedCategories(),
      fetchNotifications(),
    ]);
    const [rec, kw, cat, notif] = results;
    if (rec.status === "fulfilled") setRecommendations(rec.value);
    if (kw.status === "fulfilled") setKeywords(kw.value);
    if (cat.status === "fulfilled") setBookmarks(cat.value);
    if (notif.status === "fulfilled") setNotifications(notif.value);
    if (results.every((r) => r.status === "rejected")) setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    document.body.classList.add("fam-body");
    return () => document.body.classList.remove("fam-body");
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications]);

  const goHome = useCallback((next?: Tab) => {
    if (next) setTab(next);
    setView("home");
    setQuery("");
  }, []);

  const handleAdd = useCallback(() => {
    if (tab === "bookmark") setView("category");
    else setView("search");
  }, [tab]);

  return (
    <div className="fam-app">
      <header className="fam-header">
        <button className="fam-icon-btn" aria-label="메뉴" onClick={() => setView("settings")}>
          <MenuIcon />
        </button>
        <h1 className="fam-title">{VIEW_TITLE[view]}</h1>
        {view === "home" ? (
          <button className="fam-icon-btn fam-add" aria-label="추가" onClick={handleAdd}>
            <PlusIcon />
            {unreadCount > 0 && <span className="fam-add-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
        ) : (
          <button className="fam-icon-btn" aria-label="알림" onClick={() => setView("home")}>
            <BellIcon />
            {unreadCount > 0 && <span className="fam-add-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
        )}
      </header>

      <main className="fam-main">
        {view === "home" && (
          <HomeView
            tab={tab}
            setTab={setTab}
            query={query}
            setQuery={setQuery}
            recommendations={recommendations}
            keywords={keywords}
            bookmarks={bookmarks}
            loading={loading}
            error={error}
            onReload={reload}
            goSearch={() => setView("search")}
            goCategory={() => setView("category")}
          />
        )}
        {view === "search" && (
          <SearchView keywords={keywords} onChanged={reload} onDone={() => goHome("keyword")} />
        )}
        {view === "category" && (
          <CategoryView bookmarks={bookmarks} onChanged={reload} onDone={() => goHome("bookmark")} />
        )}
        {view === "settings" && (
          <SettingsView
            keywordCount={keywords.length}
            bookmarkCount={bookmarks.length}
            notifications={notifications}
          />
        )}
      </main>

      <nav className="fam-nav" aria-label="주요 메뉴">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`fam-nav-btn${view === id ? " active" : ""}`}
            aria-current={view === id}
            onClick={() => (id === "home" ? goHome() : setView(id))}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
