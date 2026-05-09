"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";
import { useReport } from "../ReportContext";

export type Resource = {
  id: string;
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
  { id: "skill", label: "MCP skills", icon: "zap" },
  { id: "tool", label: "Tools", icon: "flow" }
];

const STATUS_FILTERS: Resource["status"][] = [
  "verified",
  "trusted",
  "active",
  "experimental",
  "isolated"
];

function RegistryCard({
  resource,
  onReport
}: {
  resource: Resource;
  onReport: () => void;
}) {
  return (
    <div className="r-card">
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
        <button type="button">
          <Icon name="eye" size={12} /> View
        </button>
        <button type="button">
          <Icon name="doc" size={12} /> AIR-ID
        </button>
        <button type="button" className="btn-report" onClick={onReport}>
          <Icon name="flag" size={12} /> Report
        </button>
      </div>
    </div>
  );
}

export function RegistrySection({ withHeader = true }: { withHeader?: boolean }) {
  const { open } = useReport();
  const [activeKind, setActiveKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [activeStatus, setActiveStatus] = useState<Resource["status"] | null>(null);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: RESOURCES.length };
    for (const resource of RESOURCES) {
      c[resource.kind] = (c[resource.kind] || 0) + 1;
    }
    return c;
  }, []);

  const filtered = useMemo(() => {
    return RESOURCES.filter((resource) => {
      if (activeKind !== "all" && resource.kind !== activeKind) return false;
      if (activeStatus && resource.status !== activeStatus) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = [resource.title, resource.provider, resource.desc, ...resource.tags]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeKind, activeStatus, query]);

  return (
    <section className="section" id="registry-section">
      {withHeader && (
        <Reveal className="section-header">
          <div className="eyebrow">
            <span className="dot" />
            <span>The Registry</span>
          </div>
          <h2>
            Discover what your nation can <span className="gradient-text">trust and integrate</span>.
          </h2>
          <p>
            The registry points to locally-relevant AI resources — never hosts them. Each listing
            carries a verifiable provider, a sovereignty review, and a stable AIR-ID under{" "}
            <span className="mono" style={{ color: "var(--text-2)" }}>air://</span>.
          </p>
        </Reveal>
      )}

      <Reveal>
        <div className="registry-toolbar">
          <div className="search-input">
            <Icon name="search" size={15} />
            <input
              placeholder="Search resources, providers, AIR-IDs…"
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
        {filtered.map((resource, index) => (
          <Reveal key={resource.id} delay={index * 35}>
            <RegistryCard
              resource={resource}
              onReport={() =>
                open({
                  id: resource.id,
                  title: resource.title,
                  provider: resource.provider
                })
              }
            />
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
            No resources match these filters.
          </div>
        )}
      </div>
    </section>
  );
}
