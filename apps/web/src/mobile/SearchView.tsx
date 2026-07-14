/**
 * 키워드 검색 화면 (하단 내비 "검색").
 * 품목을 검색해 키워드로 등록하고, 등록된 키워드를 관리한다.
 */
import { useEffect, useMemo, useState } from "react";

import {
  Item,
  KeywordSubscription,
  createKeyword,
  deleteKeyword,
  searchItems,
} from "../api/freshAlert";
import { getThumb } from "./catalog";
import { SearchIcon, TrashIcon } from "./icons";

const DEFAULT_THRESHOLD = 10;

export default function SearchView({
  keywords,
  onChanged,
  onDone,
}: {
  keywords: KeywordSubscription[];
  onChanged: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const registeredIds = useMemo(() => new Set(keywords.map((k) => k.item_id)), [keywords]);

  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const items = await searchItems(q);
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleAdd(item: Item) {
    setBusyId(item.item_id);
    try {
      await createKeyword({
        item_id: item.item_id,
        item_name: item.mid_name || item.large_name,
        threshold_type: "percentage",
        threshold_value: DEFAULT_THRESHOLD,
      });
      onChanged();
    } catch {
      // 중복/오류는 무시하고 상태만 해제
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(kw: KeywordSubscription) {
    setBusyId(kw.id);
    try {
      await deleteKeyword(kw.id);
      onChanged();
    } catch {
      // 무시
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fam-view">
      <div className="fam-search">
        <SearchIcon size={18} className="fam-search-icon" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="품목명을 입력하세요 (예: 상추, 사과)"
          aria-label="품목 검색"
        />
      </div>

      {query.trim().length > 0 && (
        <section className="fam-group">
          <div className="fam-section-head">
            <h2>검색 결과</h2>
            <span className="fam-section-rule" />
          </div>
          {searching && <p className="fam-hint">검색 중...</p>}
          {!searching && results.length === 0 && <p className="fam-hint">일치하는 품목이 없습니다</p>}
          {results.map((item) => {
            const name = item.mid_name || item.large_name;
            const thumb = getThumb(name, item.large_name);
            const registered = registeredIds.has(item.item_id);
            return (
              <article key={item.item_id} className="fam-row">
                <span className="fam-thumb" style={{ background: thumb.bg }} aria-hidden>
                  {thumb.emoji}
                </span>
                <div className="fam-row-main">
                  <div className="fam-row-title">
                    <strong>{name}</strong>
                  </div>
                  <span className="fam-sub">{item.large_name}</span>
                </div>
                <button
                  className={`fam-pill-btn${registered ? " done" : ""}`}
                  disabled={registered || busyId === item.item_id}
                  onClick={() => handleAdd(item)}
                >
                  {registered ? "등록됨" : busyId === item.item_id ? "..." : "+ 추가"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      <section className="fam-group">
        <div className="fam-section-head">
          <h2>내 키워드</h2>
          <span className="fam-badge fam-badge-salmon">{keywords.length}/20</span>
          <span className="fam-section-rule" />
        </div>
        {keywords.length === 0 && <p className="fam-hint">아직 등록한 키워드가 없습니다</p>}
        {keywords.map((kw) => {
          const thumb = getThumb(kw.item_name);
          return (
            <article key={kw.id} className="fam-row">
              <span className="fam-thumb" style={{ background: thumb.bg }} aria-hidden>
                {thumb.emoji}
              </span>
              <div className="fam-row-main">
                <div className="fam-row-title">
                  <strong>{kw.item_name}</strong>
                </div>
                <span className="fam-sub">
                  {kw.threshold_type === "percentage"
                    ? `${kw.threshold_value}% 이하 알림`
                    : `${kw.threshold_value.toLocaleString()}원 이하 알림`}
                </span>
              </div>
              <button
                className="fam-icon-mini"
                aria-label={`${kw.item_name} 삭제`}
                disabled={busyId === kw.id}
                onClick={() => handleRemove(kw)}
              >
                <TrashIcon size={17} />
              </button>
            </article>
          );
        })}
      </section>

      <button className="fam-done-btn" onClick={onDone}>
        완료
      </button>
    </div>
  );
}
