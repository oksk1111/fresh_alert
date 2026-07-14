/**
 * 식품 카테고리 화면 (하단 내비 "카테고리").
 * 대분류 · 중분류 카테고리를 북마크(구독)하여 알림을 받는다.
 */
import { useEffect, useState } from "react";

import {
  CategoryInfo,
  CategorySubscription,
  fetchCategories,
  subscribeCategory,
  unsubscribeCategory,
} from "../api/freshAlert";
import { getThumb } from "./catalog";
import { CheckIcon } from "./icons";

function subKey(largeCode: string, midCode: string | null): string {
  return `${largeCode}:${midCode ?? ""}`;
}

export default function CategoryView({
  bookmarks,
  onChanged,
  onDone,
}: {
  bookmarks: CategorySubscription[];
  onChanged: () => void;
  onDone: () => void;
}) {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const subByKey = new Map<string, CategorySubscription>();
  for (const b of bookmarks) subByKey.set(subKey(b.large_code, b.mid_code), b);

  async function toggle(
    largeCode: string,
    largeName: string,
    midCode: string | null,
    midName: string | null,
  ) {
    const key = subKey(largeCode, midCode);
    setBusy(key);
    try {
      const existing = subByKey.get(key);
      if (existing) {
        await unsubscribeCategory(existing.id);
      } else {
        await subscribeCategory({
          large_code: largeCode,
          large_name: largeName,
          mid_code: midCode,
          mid_name: midName,
        });
      }
      onChanged();
    } catch {
      // 무시
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fam-view">
      <p className="fam-lead">관심 있는 식품 카테고리를 북마크하면 제철·특가 알림을 받아요.</p>

      {loading && <p className="fam-hint">카테고리를 불러오는 중...</p>}

      {categories.map((cat) => {
        const thumb = getThumb(cat.large_name, cat.large_name);
        const allKey = subKey(cat.large_code, null);
        const allActive = subByKey.has(allKey);
        return (
          <section key={cat.large_code} className="fam-cat-card">
            <div className="fam-cat-head">
              <span className="fam-thumb" style={{ background: thumb.bg }} aria-hidden>
                {thumb.emoji}
              </span>
              <strong>{cat.large_name}</strong>
              <button
                className={`fam-chip-toggle${allActive ? " active" : ""}`}
                disabled={busy === allKey}
                onClick={() => toggle(cat.large_code, cat.large_name, null, null)}
              >
                {allActive && <CheckIcon size={14} />}
                전체
              </button>
            </div>
            <div className="fam-chip-wrap">
              {cat.mid_categories.map((mid) => {
                const key = subKey(cat.large_code, mid.code);
                const active = subByKey.has(key);
                return (
                  <button
                    key={mid.code}
                    className={`fam-chip-toggle${active ? " active" : ""}`}
                    disabled={busy === key}
                    onClick={() => toggle(cat.large_code, cat.large_name, mid.code, mid.name)}
                  >
                    {active && <CheckIcon size={14} />}
                    {mid.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <button className="fam-done-btn" onClick={onDone}>
        완료
      </button>
    </div>
  );
}
