"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PublicRegistryListResponse, RegistryCard } from "@/lib/discovery/types";
import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";
import { withBase } from "@/lib/with-base";

export type Resource = {
  id: string;
  slug?: string;
  airId?: string | null;
  kind: "model" | "agent" | "skill" | "tool";
  glyph: string;
  title: string;
  provider: string;
  status: "verified" | "trusted" | "active" | "experimental" | "isolated";
  desc: string;
  context: string;
  latency: string;
  region: string;
  license: string;
  tags: string[];
};

const RESOURCES: Resource[] = [
  { id: "gpt4o", kind: "model", glyph: "GP", title: "GPT-4o", provider: "OpenAI", status: "verified", desc: "Multimodal foundation model with vision, audio, and text. Published terms of service and rate limits.", context: "128k", latency: "1.4s", region: "US-East", license: "Commercial", tags: ["multimodal", "foundation", "global"] },
  { id: "claude-45", kind: "model", glyph: "CL", title: "Claude Sonnet 4.5", provider: "Anthropic", status: "verified", desc: "Frontier model used by sovereign workloads requiring nuanced legal and policy reasoning.", context: "200k", latency: "1.1s", region: "US/EU", license: "Commercial", tags: ["frontier", "reasoning", "safety"] },
  { id: "llama-3", kind: "model", glyph: "LL", title: "Llama 3.3 70B", provider: "Meta", status: "trusted", desc: "Open-weight model deployable inside sovereign clouds for regulated workloads.", context: "128k", latency: "0.9s", region: "self-host", license: "Llama 3 Community", tags: ["open-weight", "self-host", "sovereign"] },
  { id: "kreol-llm", kind: "model", glyph: "KR", title: "Kreol Morisien LLM", provider: "University of Mauritius", status: "verified", desc: "Locally-fine-tuned model for Mauritian Kreol with strong code-switching coverage.", context: "32k", latency: "0.8s", region: "MU", license: "Apache-2.0", tags: ["local-language", "sovereign", "open"] },
  { id: "agent-companies", kind: "agent", glyph: "AG", title: "agent.companies-mu", provider: "Corporate & Business Registration Dept.", status: "verified", desc: "Helps incorporate, search, and file annual returns against the Mauritius Companies Register.", context: "Conversational + form-fill", latency: "<2s", region: "MU", license: "Government use", tags: ["registry", "gov-api", "official"] },
  { id: "agent-tax", kind: "agent", glyph: "AG", title: "agent.tax-assistant", provider: "Mauritius Revenue Authority", status: "active", desc: "Drafts Income Tax filings and explains MRA notices in Kreol, French and English.", context: "Multi-turn", latency: "1.6s", region: "MU", license: "Public service", tags: ["tax", "gov", "multilingual"] },
  { id: "agent-procurement", kind: "agent", glyph: "AG", title: "agent.procurement-watch", provider: "Internal · Procurement Office", status: "active", desc: "Monitors public procurement notices and alerts on conflicts of interest.", context: "Persistent", latency: "4s", region: "MU", license: "Internal", tags: ["internal", "compliance"] },
  { id: "agent-grant", kind: "agent", glyph: "AG", title: "agent.grant-screener", provider: "EDB Mauritius", status: "experimental", desc: "Screens incoming grant applications against published eligibility rubrics.", context: "Document-grounded", latency: "6s", region: "MU", license: "Pilot", tags: ["pilot", "public-sector"] },
  { id: "mcp-treasury", kind: "skill", glyph: "MCP", title: "mcp/treasury-ledger", provider: "Ministry of Finance", status: "trusted", desc: "Read-only MCP skill exposing public treasury ledgers under the Public Finance Act.", context: "MCP 2025-06", latency: "600ms", region: "MU", license: "Open data", tags: ["mcp", "open-data", "finance"] },
  { id: "mcp-cadastre", kind: "skill", glyph: "MCP", title: "mcp/cadastre-search", provider: "Land Information & Mapping", status: "verified", desc: "Boundary, ownership and zoning lookups against the national cadastre.", context: "MCP 2025-06", latency: "450ms", region: "MU", license: "Public records", tags: ["mcp", "cadastre", "official"] },
  { id: "tool-translate", kind: "tool", glyph: "TL", title: "kreol-translate-api", provider: "University of Mauritius", status: "verified", desc: "Translation API for Kreol Morisien ↔ EN/FR with culturally-aware glossary support.", context: "REST", latency: "180ms", region: "MU", license: "CC-BY-SA", tags: ["language", "api"] },
  { id: "tool-sanctions", kind: "tool", glyph: "TL", title: "sanctions-screen-mu", provider: "Financial Intelligence Unit", status: "isolated", desc: "Restricted sanctions screening — accessible only through accredited integrators.", context: "gRPC", latency: "320ms", region: "MU", license: "Restricted", tags: ["restricted", "aml", "compliance"] }
];

const KINDS: { id: "all" | Resource["kind"]; label: string; icon: IconName }[] = [
  { id: "all", label: "All resources", icon: "layers" },
  { id: "model", label: "Models", icon: "cpu" },
  { id: "agent", label: "Agents", icon: "agent" },
  { id: "skill", label: "Skills", icon: "zap" },
  { id: "tool", label: "Tools", icon: "flow" }
];

const STATUS_FILTERS: Resource["status"][] = [
  "verified",
  "trusted",
  "active",
  "experimental",
  "isolated"
];

const KIND_SET = new Set<string>(["model", "agent", "skill", "tool"]);

function cardToResource(card: RegistryCard): Resource {
  const kind = KIND_SET.has(card.kind) ? (card.kind as Resource["kind"]) : "tool";
  return {
    id: card.id,
    slug: card.slug,
    airId: card.airId,
    kind,
    glyph: card.glyph,
    title: card.title,
    provider: card.provider,
    status: card.status,
    desc: card.desc,
    context: card.context,
    latency: card.latency,
    region: card.region,
    license: card.license,
    tags: card.tags
  };
}

function resourcesListQuery(opts: {
  q: string;
  kind: (typeof KINDS)[number]["id"];
  status: Resource["status"] | null;
  providerSlug: string;
  cursor: string | null;
  limit: number;
}): string {
  const sp = new URLSearchParams();
  if (opts.q.trim() !== "") sp.set("q", opts.q.trim());
  if (opts.kind !== "all") sp.set("kind", opts.kind);
  if (opts.status) sp.set("status", opts.status);
  if (opts.providerSlug.trim() !== "") sp.set("provider", opts.providerSlug.trim());
  if (opts.cursor) sp.set("cursor", opts.cursor);
  sp.set("limit", String(opts.limit));
  const q = sp.toString();
  return withBase(q ? `/api/resources?${q}` : "/api/resources");
}

function FeatureResourceCard({ resource }: { resource: Resource }) {
  const detailHref = resource.slug ? `/registry/${resource.slug}` : null;
  return (
    <div className="r-card feature-card">
      <div className="r-card-head">
        <div className="r-icon">{resource.glyph}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="r-title">{resource.title}</div>
          <div className="r-provider">{resource.provider}</div>
        </div>
        <div className={`r-status ${resource.status}`}>
          <span className="status-dot" />
          {resource.status}
        </div>
      </div>
      <div className="r-desc">{resource.desc}</div>
      <div className="r-meta">
        <div className="r-meta-row">
          <span className="r-meta-label">Context</span>
          <span className="r-meta-value">{resource.context}</span>
        </div>
        <div className="r-meta-row">
          <span className="r-meta-label">Latency</span>
          <span className="r-meta-value">{resource.latency}</span>
        </div>
        <div className="r-meta-row">
          <span className="r-meta-label">Region</span>
          <span className="r-meta-value">{resource.region}</span>
        </div>
        <div className="r-meta-row">
          <span className="r-meta-label">License</span>
          <span className="r-meta-value">{resource.license}</span>
        </div>
      </div>
      <div className="r-tags">
        {resource.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="r-card-actions">
        {detailHref ? (
          <Link href={detailHref} className="r-card-action-link">
            <Icon name="eye" size={12} /> View details
          </Link>
        ) : (
          <button type="button">
            <Icon name="eye" size={12} /> View details
          </button>
        )}
      </div>
    </div>
  );
}

export function RegistrySection({
  withHeader = true,
  dataSource = "api",
  pageSize = 20,
  initialResources,
  initialProviderSlug
}: {
  withHeader?: boolean;
  /**
   * `api` — search, kind tabs, status chips, and pagination call `GET /api/resources` (server + DB).
   * `mock` — inline demo corpus with client-only filtering (offline / Storybook).
   */
  dataSource?: "api" | "mock";
  pageSize?: number;
  /** Mock mode only: optional seed rows. */
  initialResources?: Resource[];
  /** When set (e.g. from `/registry?provider=`), all list requests include `provider` query. */
  initialProviderSlug?: string | null;
}) {
  const [activeKind, setActiveKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [activeStatus, setActiveStatus] = useState<Resource["status"] | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [providerSlug] = useState(() => (initialProviderSlug ?? "").trim());

  const [apiRows, setApiRows] = useState<Resource[]>([]);
  const [apiCounts, setApiCounts] = useState<Record<string, number>>({ all: 0, model: 0, agent: 0, skill: 0, tool: 0 });
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
      const url = resourcesListQuery({
        q: debouncedSearch,
        kind: activeKind,
        status: activeStatus,
        providerSlug,
        cursor: opts.cursor,
        limit: pageSize
      });
      const res = await fetch(url, { signal: opts.signal, cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PublicRegistryListResponse;
      const mapped = data.rows.map(cardToResource);
      if (opts.append) {
        setApiRows((prev) => [...prev, ...mapped]);
      } else {
        setApiRows(mapped);
      }
      setApiCounts({
        all: data.counts.all,
        model: data.counts.model,
        agent: data.counts.agent,
        skill: data.counts.skill,
        tool: data.counts.tool
      });
      setApiTotal(data.total);
      setNextCursor(data.page.cursor);
      setHasMore(data.page.hasMore);
    },
    [activeKind, activeStatus, debouncedSearch, pageSize, providerSlug]
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
        setError(e instanceof Error ? e.message : "Could not load registry");
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

  const sourceRows: Resource[] =
    dataSource === "mock"
      ? initialResources && initialResources.length > 0
        ? initialResources
        : RESOURCES
      : apiRows;

  const mockCounts = useMemo(() => {
    const c: Record<string, number> = { all: sourceRows.length };
    for (const resource of sourceRows) {
      c[resource.kind] = (c[resource.kind] || 0) + 1;
    }
    return c;
  }, [sourceRows]);

  const counts = dataSource === "api" ? apiCounts : mockCounts;

  const filtered = useMemo(() => {
    if (dataSource === "api") return sourceRows;
    return sourceRows.filter((resource) => {
      if (activeKind !== "all" && resource.kind !== activeKind) return false;
      if (activeStatus && resource.status !== activeStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [resource.title, resource.provider, resource.desc, ...resource.tags]
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
    <section className="section" id="registry-section">
      {withHeader && (
        <Reveal className="section-header">
          <div className="eyebrow">
            <span className="dot" />
            <span>The Registry</span>
          </div>
          <h2>
            Discover what Mauritius can <span className="gradient-text">trust and integrate</span>.
          </h2>
          <p>
            The registry points to locally-relevant AI resources — never hosts them. Each listing
            carries a verifiable provider, a sovereignty review, and a stable AIR-ID under{" "}
            <span className="mono" style={{ color: "var(--text-2)" }}>air://</span>.
          </p>
          {dataSource === "api" && !loading && !error ? (
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>
              Showing {filtered.length} of {apiTotal} public listing{apiTotal === 1 ? "" : "s"} (server-filtered).
            </p>
          ) : null}
        </Reveal>
      )}

      <Reveal>
        <div className="registry-toolbar">
          <div className="search-input">
            <Icon name="search" size={15} />
            <input
              placeholder="Search resources, providers, AIR-IDs…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-busy={dataSource === "api" && loading}
            />
            <kbd>⌘K</kbd>
          </div>
          <div className="tabs">
            {KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                className={`tab ${activeKind === kind.id ? "active" : ""}`}
                onClick={() => setActiveKind(kind.id)}
              >
                <Icon name={kind.icon} size={13} />
                {kind.label}
                <span className="tab-count">{counts[kind.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Status chips hidden while the catalogue has a single provider —
          every listing carries the same status, so filtering is moot. */}

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
          Loading catalogue…
        </div>
      ) : null}

      <div className="registry-grid" style={{ opacity: dataSource === "api" && loading ? 0.4 : 1 }}>
        {filtered.map((resource, index) => (
          <Reveal key={resource.id} delay={index * 35}>
            <FeatureResourceCard resource={resource} />
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
            No resources match these filters.
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
