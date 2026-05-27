"use client";

import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";

type ProviderDocRow = {
  id: string;
  title: string;
  documentTypeName: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  publicVisibility: boolean;
  expiresAt: string | null;
  url: string;
};

type EvidenceFileRow = {
  id: string;
  title: string;
  evidenceTypeName: string;
  sovereigntyBasisName: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  publicVisibility: boolean;
  url: string;
};

type Props = {
  providerDocuments: ProviderDocRow[];
  evidenceFiles: EvidenceFileRow[];
};

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export function VerificationDocumentsPanel({ providerDocuments, evidenceFiles }: Props) {
  const t = useTranslations("verificationDocs");
  if (providerDocuments.length === 0 && evidenceFiles.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-3">
          {t("title")}
        </h2>
        <div className="bg-black/20 rounded p-3 text-xs opacity-70">
          {t("emptyState")}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-1">
        {t("title")}
      </h2>

      {providerDocuments.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold opacity-70 mb-2">
            {t("providerOrgDocs", { count: providerDocuments.length })}
          </h3>
          <ul className="space-y-1.5">
            {providerDocuments.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-2 text-xs bg-black/30 rounded p-2.5"
              >
                <span className="font-semibold">{d.documentTypeName}</span>
                <span>·</span>
                <span>{d.title}</span>
                <a
                  href={withBase(d.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600"
                >
                  📎 {d.filename} ({formatSize(d.sizeBytes)})
                </a>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                    d.publicVisibility ? "bg-green-700" : "bg-zinc-700"
                  }`}
                >
                  {d.publicVisibility ? t("public") : t("private")}
                </span>
                {d.expiresAt && (
                  <ExpiryPill expiresAt={d.expiresAt} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceFiles.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold opacity-70 mb-2">
            {t("evidenceDocs", { count: evidenceFiles.length })}
          </h3>
          <ul className="space-y-1.5">
            {evidenceFiles.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-2 text-xs bg-black/30 rounded p-2.5"
              >
                <span className="font-semibold">{e.evidenceTypeName}</span>
                <span>·</span>
                <span>{e.sovereigntyBasisName}</span>
                <span>·</span>
                <span>{e.title}</span>
                {IMAGE_TYPES.has(e.contentType) ? (
                  <a href={withBase(e.url)} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={withBase(e.url)}
                      alt={e.filename}
                      className="max-h-20 rounded border border-white/10"
                    />
                  </a>
                ) : (
                  <a
                    href={withBase(e.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600"
                  >
                    📎 {e.filename} ({formatSize(e.sizeBytes)})
                  </a>
                )}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                    e.publicVisibility ? "bg-green-700" : "bg-zinc-700"
                  }`}
                >
                  {e.publicVisibility ? t("public") : t("private")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ExpiryPill({ expiresAt }: { expiresAt: string }) {
  const expired = new Date(expiresAt) < new Date();
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
        expired ? "bg-red-700" : "bg-orange-700"
      }`}
      title={expiresAt}
    >
      {expired ? "Expired" : "Expires"} {new Date(expiresAt).toLocaleDateString()}
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
