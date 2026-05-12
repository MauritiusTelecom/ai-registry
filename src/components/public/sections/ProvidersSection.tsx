"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PublicProviderCard, PublicProvidersListResponse } from "@/lib/discovery/types";
import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";
import { withBase } from "@/lib/with-base";

/** @deprecated Use `PublicProviderCard` from discovery types; kept for mock-mode rows. */
export type Provider = PublicProviderCard;

const MOCK_PROVIDERS: PublicProviderCard[] = [
  { id: "anthropic", slug: "anthropic", glyph: "AN", name: "Anthropic", kind: "model", status: "verified", desc: "Frontier model provider; Claude Sonnet/Opus used by sovereign workloads requiring nuanced legal and policy reasoning.", jurisdiction: "US/EU", listings: 4, since: "2025-04", license: "Commercial", tags: ["frontier", "reasoning", "safety"], websiteUrl: "https://anthropic.com" },
  { id: "openai", slug: "openai", glyph: "OA", name: "OpenAI", kind: "model", status: "verified", desc: "Multimodal foundation models with vision, audio, and text. Published terms of service and rate limits.", jurisdiction: "US-East", listings: 3, since: "2025-04", license: "Commercial", tags: ["multimodal", "foundation", "global"], websiteUrl: "https://openai.com" },
  { id: "meta-llama", slug: "meta-llama", glyph: "ML", name: "Meta · Llama", kind: "model", status: "trusted", desc: "Open-weight foundation models deployable inside sovereign clouds for regulated workloads.", jurisdiction: "self-host", listings: 2, since: "2025-05", license: "Llama 3 Community", tags: ["open-weight", "self-host", "sovereign"], websiteUrl: null },
  { id: "mistral", slug: "mistral", glyph: "MS", name: "Mistral AI", kind: "model", status: "trusted", desc: "European open-weight and commercial models with hosted and on-prem options.", jurisdiction: "EU", listings: 2, since: "2025-06", license: "Apache-2.0 / Commercial", tags: ["open-weight", "eu", "frontier"], websiteUrl: null },
  { id: "uom", slug: "uom", glyph: "UM", name: "University of Mauritius", kind: "sovereign", status: "verified", desc: "Locally-fine-tuned LLMs for Kreol Morisien plus translation tools; the registry's research anchor.", jurisdiction: "MU", listings: 3, since: "2025-09", license: "Apache-2.0 / CC-BY-SA", tags: ["local-language", "research", "open"], websiteUrl: null },
  { id: "mra", slug: "mra", glyph: "MR", name: "Mauritius Revenue Authority", kind: "sovereign", status: "active", desc: "Drafts Income Tax filings and explains MRA notices in Kreol, French and English.", jurisdiction: "MU", listings: 2, since: "2025-10", license: "Public service", tags: ["tax", "gov", "multilingual"], websiteUrl: null },
  { id: "cbrd", slug: "cbrd", glyph: "CB", name: "Corporate & Business Registration Dept.", kind: "sovereign", status: "verified", desc: "Helps incorporate, search, and file annual returns against the Mauritius Companies Register.", jurisdiction: "MU", listings: 1, since: "2025-08", license: "Government use", tags: ["registry", "gov-api", "official"], websiteUrl: null },
  { id: "edb", slug: "edb", glyph: "ED", name: "EDB Mauritius", kind: "sovereign", status: "experimental", desc: "Pilots agentic screening of incoming grant applications against published eligibility rubrics.", jurisdiction: "MU", listings: 1, since: "2026-01", license: "Pilot", tags: ["pilot", "public-sector"], websiteUrl: null },
  { id: "mof", slug: "mof", glyph: "MF", name: "Ministry of Finance", kind: "sovereign", status: "trusted", desc: "Read-only MCP skill exposing public treasury ledgers under the Public Finance Act.", jurisdiction: "MU", listings: 1, since: "2025-11", license: "Open data", tags: ["mcp", "open-data", "finance"], websiteUrl: null },
  { id: "lim", slug: "lim", glyph: "LI", name: "Land Information & Mapping", kind: "sovereign", status: "verified", desc: "Boundary, ownership and zoning lookups against the national cadastre via MCP.", jurisdiction: "MU", listings: 1, since: "2025-12", license: "Public records", tags: ["mcp", "cadastre", "official"], websiteUrl: null },
  { id: "fiu", slug: "fiu", glyph: "FI", name: "Financial Intelligence Unit", kind: "sovereign", status: "isolated", desc: "Restricted sanctions screening - accessible only through accredited integrators.", jurisdiction: "MU", listings: 1, since: "2026-02", license: "Restricted", tags: ["restricted", "aml", "compliance"], websiteUrl: null },
  { id: "bom", slug: "bom", glyph: "BM", name: "Bank of Mauritius", kind: "sovereign", status: "verified", desc: "Monetary policy and financial supervision data; future home of regulated AI guidance.", jurisdiction: "MU", listings: 0, since: "2026-03", license: "Public records", tags: ["gov", "finance", "regulator"], websiteUrl: null },
  { id: "sov-cloud-mu", slug: "sov-cloud-mu", glyph: "SC", name: "Sovereign Cloud MU", kind: "hosting", status: "verified", desc: "Local hosting partner: GPU and inference capacity inside MU jurisdiction with SPIFFE/SPIRE federation.", jurisdiction: "MU", listings: 0, since: "2025-10", license: "Hosting agreement", tags: ["hosting", "gpu", "sovereign"], websiteUrl: null },
  { id: "public-gpu-coop", slug: "public-gpu-coop", glyph: "PG", name: "Public GPU Co-op", kind: "hosting", status: "trusted", desc: "Shared GPU pool for public-sector tenants; metered access governed by the Public Finance Act.", jurisdiction: "MU", listings: 0, since: "2026-01", license: "Co-op", tags: ["hosting", "public-sector"], websiteUrl: null },
  { id: "accenture-sov", slug: "accenture-sov", glyph: "AC", name: "Accenture · Sovereign", kind: "integrator", status: "trusted", desc: "Implementation partner for sovereign deployments; participates in independent reviews.", jurisdiction: "Global", listings: 0, since: "2025-11", license: "Engagement", tags: ["integrator", "reviewer"], websiteUrl: null },
  { id: "deloitte-sov", slug: "deloitte-sov", glyph: "DL", name: "Deloitte · Sovereign", kind: "integrator", status: "trusted", desc: "Implementation partner for sovereign deployments; participates in independent reviews.", jurisdiction: "Global", listings: 0, since: "2025-11", license: "Engagement", tags: ["integrator", "reviewer"], websiteUrl: null }
];

const KINDS: { id: "all" | "sovereign" | "model" | "hosting" | "integrator"; label: string; icon: IconName }[] = [
  { id: "all", label: "All providers", icon: "layers" },
  { id: "sovereign", label: "Sovereign", icon: "flag" },
  { id: "model", label: "Model providers", icon: "cpu" },
  { id: "hosting", label: "Hosting & identity", icon: "shield" },
  { id: "integrator", label: "Integrators", icon: "check" }
];

const STATUS_FILTERS: PublicProviderCard["status"][] = [
  "verified",
  "trusted",
  "active",
  "experimental",
  "isolated"
];

function providersListUrl(opts: {
  q: string;
  kind: (typeof KINDS)[number]["id"];
  status: PublicProviderCard["status"] | null;
  cursor: string | null;
  limit: number;
}): string {
  const sp = new URLSearchParams();
  if (opts.q.trim() !== "") sp.set("q", opts.q.trim());
  if (opts.kind !== "all") sp.set("kind", opts.kind);
  if (opts.status) sp.set("status", opts.status);
  if (opts.cursor) sp.set("cursor", opts.cursor);
  sp.set("limit", String(opts.limit));
  const q = sp.toString();
  return withBase(q ? `/api/providers?${q}` : "/api/providers");
}

function ProviderCard({ provider }: { provider: PublicProviderCard }) {
  return (
    <div className="r-card feature-card">
      <div className="r-card-head">
        <div className="r-icon">{provider.glyph}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="r-title">{provider.name}</div>
          <div className="r-provider">{provider.jurisdiction}</div>
        </div>
        <div className={`r-status ${provider.status}`}>
          <span className="status-dot" />
          {provider.status}
        </div>
      </div>
      <div className="r-desc">{provider.desc}</div>
      <div className="r-meta">
        <div className="r-meta-row">
          <span className="r-meta-label">Type</span>
          <span className="r-meta-value">{provider.kind}</span>
        </div>
        <div className="r-meta-row">
          <span className="r-meta-label">Listings</span>
          <span className="r-meta-value">{provider.listings}</span>
        </div>
        <div className="r-meta-row">
          <span className="r-meta-label">Region</span>
          <span className="r-meta-value">{provider.jurisdiction}</span>
        </div>
        <div className="r-meta-row">
          <span className="r-meta-label">Listed</span>
          <span className="r-meta-value">{provider.since}</span>
        </div>
      </div>
      <div className="r-tags">
        {provider.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="r-card-actions">
        <Link href={`/providers/${encodeURIComponent(provider.slug)}`} className="r-card-action-link">
          <Icon name="eye" size={12} /> Profile
        </Link>
        <Link href={`/registry?provider=${encodeURIComponent(provider.slug)}`} className="r-card-action-link">
          <Icon name="layers" size={12} /> Listings
        </Link>
        <Link href="/contact" className="r-card-action-link">
          <Icon name="mail" size={12} /> Contact
        </Link>
      </div>
    </div>
  );
}

export function ProvidersSection({
  withHeader = true,
  dataSource = "api",
  pageSize = 20
}: {
  withHeader?: boolean;
  dataSource?: "api" | "mock";
  pageSize?: number;
}) {
  const [activeKind, setActiveKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [activeStatus, setActiveStatus] = useState<PublicProviderCard["status"] | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [apiRows, setApiRows] = useState<PublicProviderCard[]>([]);
  const [apiCounts, setApiCounts] = useState({
    all: 0,
    sovereign: 0,
    model: 0,
    hosting: 0,
    integrator: 0
  });
  const [apiTotal, setApiTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(dataSource === "api");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (opts: { cursor: string | null; append: boolean; signal: AbortSignal }) => {
      const url = providersListUrl({
        q: debouncedSearch,
        kind: activeKind,
        status: activeStatus,
        cursor: opts.cursor,
        limit: pageSize
      });
      const res = await fetch(url, { signal: opts.signal, cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PublicProvidersListResponse;
      const mapped = data.rows;
      if (opts.append) {
        setApiRows((prev) => [...prev, ...mapped]);
      } else {
        setApiRows(mapped);
      }
      setApiCounts(data.counts);
      setApiTotal(data.total);
      setNextCursor(data.page.cursor);
      setHasMore(data.page.hasMore);
    },
    [activeKind, activeStatus, debouncedSearch, pageSize]
  );

  useEffect(() => {
    if (dataSource !== "api") return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        await fetchPage({ cursor: null, append: false, signal: ac.signal });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Could not load providers");
        setApiRows([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [dataSource, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage({ cursor: nextCursor, append: true, signal: new AbortController().signal });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load more failed");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loading, loadingMore, nextCursor]);

  const sourceRows: PublicProviderCard[] = dataSource === "mock" ? MOCK_PROVIDERS : apiRows;

  const mockCounts = useMemo(() => {
    const c: Record<string, number> = { all: sourceRows.length };
    for (const provider of sourceRows) {
      c[provider.kind] = (c[provider.kind] || 0) + 1;
    }
    return c;
  }, [sourceRows]);

  const counts = dataSource === "api" ? apiCounts : mockCounts;

  const filtered = useMemo(() => {
    if (dataSource === "api") return sourceRows;
    return sourceRows.filter((provider) => {
      if (activeKind !== "all" && provider.kind !== activeKind) return false;
      if (activeStatus && provider.status !== activeStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [provider.name, provider.desc, provider.jurisdiction, ...provider.tags]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeKind, activeStatus, search, sourceRows, dataSource]);

  const clearFilters = () => {
    setActiveStatus(null);
    setSearch("");
  };

  return (
    <section className="section" id="providers-section">
      {withHeader && (
        <Reveal className="section-header">
          <div className="eyebrow">
            <span className="dot" />
            <span>Providers</span>
          </div>
          <h2>
            Meet the organisations <span className="gradient-text">Mauritius already trusts</span>.
          </h2>
          <p>
            Every listing in the registry traces back to a verifiable provider. Browse who hosts,
            operates, and stands behind the AI resources you can integrate locally - sovereign
            operators, model labs, hosting partners, and accredited integrators.
          </p>
          {dataSource === "api" && !loading && !error ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>
              Showing {filtered.length} of {apiTotal} public provider{apiTotal === 1 ? "" : "s"} (server-filtered).
            </p>
          ) : null}
        </Reveal>
      )}

      <Reveal>
        <div className="registry-toolbar">
          <div className="search-input">
            <Icon name="search" size={15} />
            <input
              placeholder="Search providers, jurisdictions, capabilities…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-busy={dataSource === "api" && loading}
            />
            <kbd>⌘K</kbd>
          </div>
          {/* Kind tabs hidden while the catalogue carries only a handful of
              providers - the tab counts would mostly read zero. */}
        </div>
      </Reveal>

      {/* Status chips hidden while the catalogue has a single provider -
          all rows carry the same status, so the filter would do nothing. */}

      {error ? (
        <p
          role="alert"
          style={{
            padding: "16px 24px",
            color: "var(--danger, #f87171)",
            fontSize: 14,
            textAlign: "center"
          }}
        >
          {error}
        </p>
      ) : null}

      {dataSource === "api" && loading ? (
        <div
          style={{
            gridColumn: "1 / -1",
            padding: 48,
            textAlign: "center",
            color: "var(--text-3)",
            fontFamily: "IBM Plex Mono, monospace"
          }}
        >
          Loading providers…
        </div>
      ) : null}

      <div className="registry-grid" style={{ opacity: dataSource === "api" && loading ? 0.4 : 1 }}>
        {filtered.map((provider, index) => (
          <Reveal key={provider.id} delay={index * 35}>
            <ProviderCard provider={provider} />
          </Reveal>
        ))}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 48,
              textAlign: "center",
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            No providers match these filters.
          </div>
        )}
      </div>

      {dataSource === "api" && hasMore && nextCursor ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
