"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";

export type Provider = {
  id: string;
  glyph: string;
  name: string;
  kind: "sovereign" | "model" | "hosting" | "integrator";
  status: "verified" | "trusted" | "active" | "experimental" | "isolated";
  desc: string;
  jurisdiction: string;
  listings: number;
  since: string;
  license: string;
  tags: string[];
};

const PROVIDERS: Provider[] = [
  { id: "anthropic", glyph: "AN", name: "Anthropic", kind: "model", status: "verified", desc: "Frontier model provider; Claude Sonnet/Opus used by sovereign workloads requiring nuanced legal and policy reasoning.", jurisdiction: "US/EU", listings: 4, since: "2025-04", license: "Commercial", tags: ["frontier", "reasoning", "safety"] },
  { id: "openai", glyph: "OA", name: "OpenAI", kind: "model", status: "verified", desc: "Multimodal foundation models with vision, audio, and text. Published terms of service and rate limits.", jurisdiction: "US-East", listings: 3, since: "2025-04", license: "Commercial", tags: ["multimodal", "foundation", "global"] },
  { id: "meta-llama", glyph: "ML", name: "Meta · Llama", kind: "model", status: "trusted", desc: "Open-weight foundation models deployable inside sovereign clouds for regulated workloads.", jurisdiction: "self-host", listings: 2, since: "2025-05", license: "Llama 3 Community", tags: ["open-weight", "self-host", "sovereign"] },
  { id: "mistral", glyph: "MS", name: "Mistral AI", kind: "model", status: "trusted", desc: "European open-weight and commercial models with hosted and on-prem options.", jurisdiction: "EU", listings: 2, since: "2025-06", license: "Apache-2.0 / Commercial", tags: ["open-weight", "eu", "frontier"] },
  { id: "uom", glyph: "UM", name: "University of Mauritius", kind: "sovereign", status: "verified", desc: "Locally-fine-tuned LLMs for Kreol Morisien plus translation tools; the registry's research anchor.", jurisdiction: "MU", listings: 3, since: "2025-09", license: "Apache-2.0 / CC-BY-SA", tags: ["local-language", "research", "open"] },
  { id: "mra", glyph: "MR", name: "Mauritius Revenue Authority", kind: "sovereign", status: "active", desc: "Drafts Income Tax filings and explains MRA notices in Kreol, French and English.", jurisdiction: "MU", listings: 2, since: "2025-10", license: "Public service", tags: ["tax", "gov", "multilingual"] },
  { id: "cbrd", glyph: "CB", name: "Corporate & Business Registration Dept.", kind: "sovereign", status: "verified", desc: "Helps incorporate, search, and file annual returns against the Mauritius Companies Register.", jurisdiction: "MU", listings: 1, since: "2025-08", license: "Government use", tags: ["registry", "gov-api", "official"] },
  { id: "edb", glyph: "ED", name: "EDB Mauritius", kind: "sovereign", status: "experimental", desc: "Pilots agentic screening of incoming grant applications against published eligibility rubrics.", jurisdiction: "MU", listings: 1, since: "2026-01", license: "Pilot", tags: ["pilot", "public-sector"] },
  { id: "mof", glyph: "MF", name: "Ministry of Finance", kind: "sovereign", status: "trusted", desc: "Read-only MCP skill exposing public treasury ledgers under the Public Finance Act.", jurisdiction: "MU", listings: 1, since: "2025-11", license: "Open data", tags: ["mcp", "open-data", "finance"] },
  { id: "lim", glyph: "LI", name: "Land Information & Mapping", kind: "sovereign", status: "verified", desc: "Boundary, ownership and zoning lookups against the national cadastre via MCP.", jurisdiction: "MU", listings: 1, since: "2025-12", license: "Public records", tags: ["mcp", "cadastre", "official"] },
  { id: "fiu", glyph: "FI", name: "Financial Intelligence Unit", kind: "sovereign", status: "isolated", desc: "Restricted sanctions screening — accessible only through accredited integrators.", jurisdiction: "MU", listings: 1, since: "2026-02", license: "Restricted", tags: ["restricted", "aml", "compliance"] },
  { id: "bom", glyph: "BM", name: "Bank of Mauritius", kind: "sovereign", status: "verified", desc: "Monetary policy and financial supervision data; future home of regulated AI guidance.", jurisdiction: "MU", listings: 0, since: "2026-03", license: "Public records", tags: ["gov", "finance", "regulator"] },
  { id: "sov-cloud-mu", glyph: "SC", name: "Sovereign Cloud MU", kind: "hosting", status: "verified", desc: "Local hosting partner: GPU and inference capacity inside MU jurisdiction with SPIFFE/SPIRE federation.", jurisdiction: "MU", listings: 0, since: "2025-10", license: "Hosting agreement", tags: ["hosting", "gpu", "sovereign"] },
  { id: "public-gpu-coop", glyph: "PG", name: "Public GPU Co-op", kind: "hosting", status: "trusted", desc: "Shared GPU pool for public-sector tenants; metered access governed by the Public Finance Act.", jurisdiction: "MU", listings: 0, since: "2026-01", license: "Co-op", tags: ["hosting", "public-sector"] },
  { id: "accenture-sov", glyph: "AC", name: "Accenture · Sovereign", kind: "integrator", status: "trusted", desc: "Implementation partner for sovereign deployments; participates in independent reviews.", jurisdiction: "Global", listings: 0, since: "2025-11", license: "Engagement", tags: ["integrator", "reviewer"] },
  { id: "deloitte-sov", glyph: "DL", name: "Deloitte · Sovereign", kind: "integrator", status: "trusted", desc: "Implementation partner for sovereign deployments; participates in independent reviews.", jurisdiction: "Global", listings: 0, since: "2025-11", license: "Engagement", tags: ["integrator", "reviewer"] }
];

const KINDS: { id: "all" | Provider["kind"]; label: string; icon: IconName }[] = [
  { id: "all", label: "All providers", icon: "layers" },
  { id: "sovereign", label: "Sovereign", icon: "flag" },
  { id: "model", label: "Model providers", icon: "cpu" },
  { id: "hosting", label: "Hosting & identity", icon: "shield" },
  { id: "integrator", label: "Integrators", icon: "check" }
];

const STATUS_FILTERS: Provider["status"][] = [
  "verified",
  "trusted",
  "active",
  "experimental",
  "isolated"
];

function ProviderCard({ provider }: { provider: Provider }) {
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
        <button type="button">
          <Icon name="eye" size={12} /> Profile
        </button>
        <button type="button">
          <Icon name="layers" size={12} /> Listings
        </button>
        <button type="button">
          <Icon name="mail" size={12} /> Contact
        </button>
      </div>
    </div>
  );
}

export function ProvidersSection({ withHeader = true }: { withHeader?: boolean }) {
  const [activeKind, setActiveKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [activeStatus, setActiveStatus] = useState<Provider["status"] | null>(null);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: PROVIDERS.length };
    for (const provider of PROVIDERS) {
      c[provider.kind] = (c[provider.kind] || 0) + 1;
    }
    return c;
  }, []);

  const filtered = useMemo(() => {
    return PROVIDERS.filter((provider) => {
      if (activeKind !== "all" && provider.kind !== activeKind) return false;
      if (activeStatus && provider.status !== activeStatus) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = [provider.name, provider.desc, provider.jurisdiction, ...provider.tags]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeKind, activeStatus, query]);

  return (
    <section className="section" id="providers-section">
      {withHeader && (
        <Reveal className="section-header">
          <div className="eyebrow">
            <span className="dot" />
            <span>Providers</span>
          </div>
          <h2>
            Meet the organisations <span className="gradient-text">your nation already trusts</span>.
          </h2>
          <p>
            Every listing in the registry traces back to a verifiable provider. Browse who hosts,
            operates, and stands behind the AI resources you can integrate locally — sovereign
            operators, model labs, hosting partners, and accredited integrators.
          </p>
        </Reveal>
      )}

      <Reveal>
        <div className="registry-toolbar">
          <div className="search-input">
            <Icon name="search" size={15} />
            <input
              placeholder="Search providers, jurisdictions, capabilities…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
                <span className="tab-count">{counts[kind.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="filter-chips">
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginRight: 8
            }}
          >
            Status
          </span>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={`chip ${activeStatus === status ? "active" : ""}`}
              onClick={() => setActiveStatus(activeStatus === status ? null : status)}
            >
              {status}
            </button>
          ))}
          {(activeStatus || query) && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setActiveStatus(null);
                setQuery("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </Reveal>

      <div className="registry-grid">
        {filtered.map((provider, index) => (
          <Reveal key={provider.id} delay={index * 35}>
            <ProviderCard provider={provider} />
          </Reveal>
        ))}
        {filtered.length === 0 && (
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
    </section>
  );
}
