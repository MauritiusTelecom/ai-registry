"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../chrome/Icon";

/**
 * Debounced search input. Calls `onChange` after the user stops typing
 * for `debounceMs` (default 220).
 *
 *   <SearchInput value={q} onChange={setQ} placeholder="Search resources…" />
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounceMs = 220,
  width = 280
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  debounceMs?: number;
  width?: number;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the local draft in sync when the parent resets the value externally.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, debounceMs]);

  return (
    <div
      className="p-grid-search"
      style={{
        position: "relative",
        width,
        maxWidth: "100%"
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-2)",
          pointerEvents: "none"
        }}
      >
        <Icon name="search" size={14} />
      </span>
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="p-input"
        style={{ paddingLeft: 32, width: "100%" }}
      />
    </div>
  );
}
