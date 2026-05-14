"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/public/Icon";

/**
 * Search button - opens a command palette on click or when ⌘K / Ctrl-K is
 * pressed anywhere in the portal. The palette itself is a Phase 4 polish; for
 * now we surface a centred input modal so the keyboard shortcut + the visible
 * affordance both work.
 */
export function PortalSearch({ placeholder = "Search resources, providers…" }: { placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="p-search"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Icon name="search" size={14} />
        <span>{placeholder}</span>
        <kbd>⌘K</kbd>
      </button>

      {open ? (
        <div
          className="p-cmd-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="p-cmd" onClick={(e) => e.stopPropagation()}>
            <div className="p-cmd-input-wrap">
              <Icon name="search" size={16} />
              <input
                autoFocus
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>esc</kbd>
            </div>
            {/*
              The empty-state placeholder panel (`.p-cmd-empty`) was removed
              — it rendered a grey box below the input even before the user
              typed anything, and the actual search index isn't wired up
              yet. Re-add it once Phase 4 surfaces real results.
            */}
          </div>
        </div>
      ) : null}
    </>
  );
}
