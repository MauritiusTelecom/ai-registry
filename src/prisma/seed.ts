/**
 * Registry seed.
 *
 * Loads reference taxonomies (every controlled vocabulary that lives in its
 * own table per the schema's "no SQL enums" convention), the deployment's
 * jurisdiction, languages, sectors, sovereignty bases, the reference
 * provider and its production catalogue (one resource per resource type the
 * operator publishes), plus per-resource sovereignty evidence with real
 * regulatory and infrastructure references.
 *
 * Idempotent and self-healing: reference rows upsert by their natural code,
 * domain rows upsert by slug, and sovereignty evidence is rewritten on every
 * run so historical stub rows can never survive a re-seed.
 *
 * Run with:
 *
 *   npm run db:seed
 *
 * Environment:
 *   DATABASE_URL must be set. SEED_PROVIDER_SLUG and SEED_PROVIDER_NAME
 *   override the exemplar provider so re-deployments aren't tied to the
 *   reference operator name.
 *
 *   SEED_ADMIN_PASSWORD - when set, creates or updates a bootstrap operator
 *   admin (email SEED_ADMIN_EMAIL, default admin@registry.com) with that
 *   password, role admin, status active, email verified. Omit in CI; set
 *   locally or in a secure deploy pipeline only.
 *
 *   SEED_PROVIDER_PASSWORD - when set, creates or updates a bootstrap portal
 *   user for the exemplar provider (email SEED_PROVIDER_EMAIL, default
 *   provider@registry.com), role provider, linked to the seeded Provider row.
 *   Any legacy row at provider@example.com is renamed to that email first.
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../generated/prisma";
import { hashPassword } from "../lib/auth/password";

type RefRow = { code: string; name: string; description?: string; sortOrder?: number };

// ─── Reference vocabularies ───────────────────────────────────────────────

const USER_ROLES: RefRow[] = [
  { code: "admin", name: "Admin", description: "Operator-side governance superuser." },
  { code: "reviewer", name: "Reviewer", description: "Sovereignty review participant." },
  { code: "auditor", name: "Auditor", description: "Read-only audit access." },
  { code: "provider", name: "Provider", description: "Authorised provider operator." },
  { code: "viewer", name: "Viewer", description: "Authenticated read-only user." }
];

const USER_STATUSES: RefRow[] = [
  { code: "active", name: "Active", sortOrder: 1 },
  { code: "invited", name: "Invited", sortOrder: 2 },
  { code: "suspended", name: "Suspended", sortOrder: 3 },
  { code: "deactivated", name: "Deactivated", sortOrder: 4 }
];

const PROVIDER_TYPES: RefRow[] = [
  { code: "sovereign", name: "Sovereign operator", description: "Government or quasi-government body." },
  { code: "model", name: "Model provider", description: "Foundation or fine-tuned model lab." },
  { code: "hosting", name: "Hosting & identity", description: "Hosting, GPU, or identity federation partner." },
  { code: "integrator", name: "Integrator", description: "Implementation or review partner." },
  { code: "research", name: "Research", description: "Academic or research lab." }
];

const PROVIDER_STATUSES: RefRow[] = [
  { code: "unverified", name: "Unverified", sortOrder: 1 },
  { code: "verified", name: "Verified", sortOrder: 2 },
  { code: "official_provider", name: "Official provider", sortOrder: 3 },
  { code: "suspended", name: "Suspended", sortOrder: 4 }
];

const RESOURCE_TYPES: RefRow[] = [
  { code: "model", name: "Model", description: "AI/ML model with local data, language, or purpose." },
  { code: "agent", name: "Agent", description: "AI system acting in local context." },
  { code: "tool", name: "Tool", description: "Callable API/function for a local operation." },
  { code: "skill", name: "Skill", description: "Packaged local expertise or knowledge artefact." }
];

const LIFECYCLE_STATUSES: RefRow[] = [
  { code: "draft", name: "Draft", sortOrder: 1 },
  { code: "submitted", name: "Submitted", sortOrder: 2 },
  { code: "in_review", name: "In review", sortOrder: 3 },
  { code: "listed", name: "Listed", sortOrder: 4 },
  { code: "needs_update", name: "Needs update", sortOrder: 5 },
  { code: "suspended", name: "Suspended", sortOrder: 6 },
  { code: "deprecated", name: "Deprecated", sortOrder: 7 },
  { code: "removed", name: "Removed", sortOrder: 8 }
];

const RISK_LEVELS: RefRow[] = [
  { code: "low", name: "Low", sortOrder: 1 },
  { code: "medium", name: "Medium", sortOrder: 2 },
  { code: "high", name: "High", sortOrder: 3 }
];

const LISTING_ORIGINS: RefRow[] = [
  { code: "local", name: "Local submission" },
  { code: "federated", name: "Federated mirror" }
];

const EVIDENCE_TYPES: RefRow[] = [
  { code: "regulatory_reference", name: "Regulatory reference" },
  { code: "data_locality", name: "Data locality attestation" },
  { code: "system_topology", name: "System topology diagram" },
  { code: "language_artefact", name: "Language / culture artefact" }
];

const JURISDICTION_TYPES: RefRow[] = [
  { code: "country", name: "Country", sortOrder: 1 },
  { code: "supranational", name: "Supranational", sortOrder: 2 },
  { code: "subnational", name: "Subnational", sortOrder: 3 }
];

const TRUST_SIGNAL_TYPES: RefRow[] = [
  { code: "provider_verification", name: "Provider verification" },
  { code: "sovereignty_review", name: "Sovereignty review" },
  { code: "official_resource", name: "Official resource authorisation" }
];

const TRUST_SIGNAL_STATUSES: RefRow[] = [
  { code: "pending", name: "Pending" },
  { code: "passed", name: "Passed" },
  { code: "failed", name: "Failed" },
  { code: "withdrawn", name: "Withdrawn" }
];

const REVIEW_TYPES: RefRow[] = [
  { code: "provider_verification", name: "Provider verification" },
  { code: "sovereignty_review", name: "Sovereignty review" },
  { code: "incident_review", name: "Incident review" }
];

const REVIEW_STATUSES: RefRow[] = [
  { code: "open", name: "Open" },
  { code: "in_review", name: "In review" },
  { code: "decided", name: "Decided" },
  { code: "withdrawn", name: "Withdrawn" }
];

const CHECKLIST_RESULTS: RefRow[] = [
  { code: "yes", name: "Yes" },
  { code: "no", name: "No" },
  { code: "n_a", name: "Not applicable" }
];

const PROTOCOLS: RefRow[] = [
  { code: "rest", name: "REST" },
  { code: "grpc", name: "gRPC" },
  { code: "mcp", name: "MCP" },
  { code: "a2a", name: "A2A" }
];

const ACCESS_MODELS: RefRow[] = [
  { code: "open", name: "Open" },
  { code: "registered", name: "Registered" },
  { code: "approved", name: "Approved" },
  { code: "restricted", name: "Restricted" }
];

const AUTH_METHODS: RefRow[] = [
  { code: "none", name: "None" },
  { code: "api_key", name: "API key" },
  { code: "oauth2", name: "OAuth 2.0" },
  { code: "mtls", name: "Mutual TLS" },
  { code: "spiffe", name: "SPIFFE/SPIRE" }
];

const ENDPOINT_HEALTH: RefRow[] = [
  { code: "unknown", name: "Unknown" },
  { code: "healthy", name: "Healthy" },
  { code: "degraded", name: "Degraded" },
  { code: "down", name: "Down" }
];

const OFFICIAL_AUTHORITY_TYPES: RefRow[] = [
  { code: "government", name: "Government body" },
  { code: "regulator", name: "Regulator" },
  { code: "professional_body", name: "Professional body" }
];

const OFFICIAL_AUTH_STATUSES: RefRow[] = [
  { code: "pending", name: "Pending" },
  { code: "authorised", name: "Authorised" },
  { code: "withdrawn", name: "Withdrawn" }
];

const COMPLAINT_TYPES: RefRow[] = [
  { code: "accuracy", name: "Accuracy" },
  { code: "safety", name: "Safety" },
  { code: "policy", name: "Policy" },
  { code: "other", name: "Other" }
];

const COMPLAINT_SEVERITIES: RefRow[] = [
  { code: "low", name: "Low" },
  { code: "medium", name: "Medium" },
  { code: "high", name: "High" }
];

const COMPLAINT_STATUSES: RefRow[] = [
  { code: "open", name: "Open" },
  { code: "investigating", name: "Investigating" },
  { code: "resolved", name: "Resolved" },
  { code: "rejected", name: "Rejected" }
];

const ENFORCEMENT_TYPES: RefRow[] = [
  { code: "warning", name: "Warning" },
  { code: "isolate", name: "Isolate" },
  { code: "suspend", name: "Suspend" },
  { code: "remove", name: "Remove" }
];

const SUBMISSION_SOURCES: RefRow[] = [
  { code: "self_submitted", name: "Self-submitted" },
  { code: "operator_added", name: "Operator-added" },
  { code: "federated", name: "Federated import" }
];

// ─── Domain seeds (jurisdictions, languages, sectors, bases) ──────────────

const SOVEREIGNTY_BASES: RefRow[] = [
  { code: "local_law", name: "Local law" },
  { code: "local_data", name: "Local data" },
  { code: "local_system", name: "Local system" },
  { code: "local_language_culture", name: "Local language & culture" }
];

const LANGUAGES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "mfe", name: "Mauritian Kreol" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" }
];

const SECTORS: { code: string; name: string; description: string }[] = [
  { code: "public_services", name: "Public services", description: "Government-facing AI for citizen services." },
  { code: "finance", name: "Finance", description: "Banking, treasury, regulatory compliance." },
  { code: "health", name: "Health", description: "Public-health, clinical decision support, regulated workloads." },
  { code: "education", name: "Education", description: "Schools, higher education, research support." },
  { code: "agriculture", name: "Agriculture", description: "Crop, weather, supply-chain advisory." },
  { code: "telecom", name: "Telecommunications", description: "Network operators and digital public infrastructure." },
  { code: "industry", name: "Industry", description: "Manufacturing, logistics, energy." }
];

// ─── Helpers ───────────────────────────────────────────────────────────────

async function seedRef<T extends { code: string }>(
  // Prisma delegate upsert args are model-specific; keep seed rows structurally uniform.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: RefRow[],
  label: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = row.code.trim().toLowerCase();
    const upserted = (await table.upsert({
      where: { code },
      create: {
        code,
        name: row.name,
        description: row.description ?? null,
        sortOrder: row.sortOrder ?? i + 1
      },
      update: {
        name: row.name,
        description: row.description ?? null,
        sortOrder: row.sortOrder ?? i + 1
      }
    })) as { id: string };
    result.set(code, upserted.id);
  }
  console.log(`  ✓ ${label.padEnd(36)} (${rows.length})`);
  return result;
}

// ─── Main seed entry ───────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function main() {
  loadDotenv({ path: resolve(process.cwd(), ".env") });

  console.log("Seeding reference taxonomies…");

    const userRoleIds = await seedRef(prisma.userRoleType, USER_ROLES, "user roles");
    const userStatusIds = await seedRef(prisma.userStatusType, USER_STATUSES, "user statuses");
    const providerTypeIds = await seedRef(prisma.providerTypeRef, PROVIDER_TYPES, "provider types");
    const providerStatusIds = await seedRef(prisma.providerStatusType, PROVIDER_STATUSES, "provider statuses");
    const resourceTypeIds = await seedRef(prisma.resourceType, RESOURCE_TYPES, "resource types");
    const lifecycleStatusIds = await seedRef(prisma.lifecycleStatus, LIFECYCLE_STATUSES, "lifecycle statuses");
    const riskLevelIds = await seedRef(prisma.riskLevel, RISK_LEVELS, "risk levels");
    const listingOriginIds = await seedRef(prisma.listingOrigin, LISTING_ORIGINS, "listing origins");
    const evidenceTypeIds = await seedRef(prisma.evidenceType, EVIDENCE_TYPES, "evidence types");
    const jurisdictionTypeIds = await seedRef(prisma.jurisdictionType, JURISDICTION_TYPES, "jurisdiction types");
    await seedRef(prisma.trustSignalType, TRUST_SIGNAL_TYPES, "trust signal types");
    await seedRef(prisma.trustSignalStatusType, TRUST_SIGNAL_STATUSES, "trust signal statuses");
    await seedRef(prisma.reviewType, REVIEW_TYPES, "review types");
    await seedRef(prisma.reviewStatusType, REVIEW_STATUSES, "review statuses");
    await seedRef(prisma.checklistResultType, CHECKLIST_RESULTS, "checklist results");
    const protocolIds = await seedRef(prisma.protocol, PROTOCOLS, "protocols");
    const accessModelIds = await seedRef(prisma.accessModelType, ACCESS_MODELS, "access models");
    const authMethodIds = await seedRef(prisma.authMethodType, AUTH_METHODS, "auth methods");
    const endpointHealthIds = await seedRef(prisma.endpointHealthType, ENDPOINT_HEALTH, "endpoint health");
    await seedRef(prisma.officialAuthorityType, OFFICIAL_AUTHORITY_TYPES, "official authority types");
    await seedRef(prisma.officialAuthorisationStatusType, OFFICIAL_AUTH_STATUSES, "official auth statuses");
    await seedRef(prisma.complaintType, COMPLAINT_TYPES, "complaint types");
    await seedRef(prisma.complaintSeverityType, COMPLAINT_SEVERITIES, "complaint severities");
    await seedRef(prisma.complaintStatusType, COMPLAINT_STATUSES, "complaint statuses");
    await seedRef(prisma.enforcementType, ENFORCEMENT_TYPES, "enforcement actions");
    const submissionSourceIds = await seedRef(prisma.submissionSourceType, SUBMISSION_SOURCES, "submission sources");

    console.log("\nSeeding domain reference data…");

    for (const lang of LANGUAGES) {
      await prisma.language.upsert({
        where: { code: lang.code },
        create: { code: lang.code, name: lang.name },
        update: { name: lang.name }
      });
    }
    console.log(`  ✓ ${"languages".padEnd(36)} (${LANGUAGES.length})`);

    for (const sector of SECTORS) {
      await prisma.sector.upsert({
        where: { code: sector.code },
        create: { code: sector.code, name: sector.name, description: sector.description },
        update: { name: sector.name, description: sector.description }
      });
    }
    console.log(`  ✓ ${"sectors".padEnd(36)} (${SECTORS.length})`);

    for (const basis of SOVEREIGNTY_BASES) {
      await prisma.sovereigntyBasis.upsert({
        where: { code: basis.code },
        create: { code: basis.code, name: basis.name },
        update: { name: basis.name }
      });
    }
    console.log(`  ✓ ${"sovereignty bases".padEnd(36)} (${SOVEREIGNTY_BASES.length})`);

    // ─── Jurisdiction (deployment-specific via env) ────────────────────────

    const jurisdictionCode = process.env.JURISDICTION ?? "MU";
    const jurisdictionName =
      process.env.JURISDICTION_NAME ??
      (jurisdictionCode === "MU" ? "Mauritius" : jurisdictionCode);

    const jurisdiction = await prisma.jurisdiction.upsert({
      where: { code: jurisdictionCode },
      create: {
        code: jurisdictionCode,
        name: jurisdictionName,
        typeId: jurisdictionTypeIds.get("country")!,
        active: true
      },
      update: { name: jurisdictionName }
    });
    console.log(`\nJurisdiction seeded: ${jurisdictionCode} (${jurisdictionName})`);

    // ─── Exemplar provider ─────────────────────────────────────────────────

    const providerSlug = process.env.SEED_PROVIDER_SLUG ?? "mauritius-telecom";
    const providerName = process.env.SEED_PROVIDER_NAME ?? "Mauritius Telecom";

    // One-time rename: if a legacy "exemplar-provider" row exists and the
    // new seed slug is different, migrate the row instead of creating a
    // duplicate. Preserves the providerId so existing resource links keep
    // pointing at the right row.
    if (providerSlug !== "exemplar-provider") {
      const legacy = await prisma.provider.findUnique({
        where: { slug: "exemplar-provider" }
      });
      if (legacy) {
        await prisma.provider.update({
          where: { id: legacy.id },
          data: { slug: providerSlug, displayName: providerName, legalName: providerName }
        });
        console.log(`  ✓ renamed legacy provider exemplar-provider → ${providerSlug}`);
      }
    }

    const providerWebsite =
      process.env.SEED_PROVIDER_WEBSITE?.trim() || "https://www.telecom.mu";
    const providerContactEmail =
      process.env.SEED_PROVIDER_CONTACT_EMAIL?.trim() || "hello@airegistry.mu";
    const providerDescription =
      process.env.SEED_PROVIDER_DESCRIPTION?.trim() ||
      "Mauritius Telecom is the principal telecommunications operator of the Republic of Mauritius and the reference operator of the Mauritius AI Registry. This profile lists the production-grade models, agents and tools curated by MT's Special Projects unit for use across government, enterprise and research.";

    const provider = await prisma.provider.upsert({
      where: { slug: providerSlug },
      create: {
        slug: providerSlug,
        displayName: providerName,
        legalName: providerName,
        typeId: providerTypeIds.get("sovereign")!,
        homeJurisdictionId: jurisdiction.id,
        websiteUrl: providerWebsite,
        contactEmail: providerContactEmail,
        statusId: providerStatusIds.get("verified")!,
        srcId: submissionSourceIds.get("operator_added")!,
        description: providerDescription
      },
      update: {
        displayName: providerName,
        legalName: providerName,
        websiteUrl: providerWebsite,
        contactEmail: providerContactEmail,
        description: providerDescription
      }
    });
    console.log(`Provider seeded: ${provider.displayName} (slug=${provider.slug})`);

    const providerUserEmail = (process.env.SEED_PROVIDER_EMAIL ?? "provider@registry.com")
      .toLowerCase()
      .trim();
    await prisma.user.updateMany({
      where: { email: "provider@example.com" },
      data: { email: providerUserEmail }
    });

    const providerPassword = process.env.SEED_PROVIDER_PASSWORD;
    if (providerPassword) {
      const providerRoleId = userRoleIds.get("provider")!;
      const activeStatusId = userStatusIds.get("active")!;
      const passwordHash = await hashPassword(providerPassword);
      const providerUserName =
        process.env.SEED_PROVIDER_USER_NAME?.trim() ?? `${provider.displayName} operator`;

      await prisma.user.upsert({
        where: { email: providerUserEmail },
        update: {
          name: providerUserName,
          passwordHash,
          roleId: providerRoleId,
          statusId: activeStatusId,
          providerId: provider.id,
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          resetToken: null,
          resetTokenExpiry: null,
          onboardingComplete: true
        },
        create: {
          email: providerUserEmail,
          name: providerUserName,
          passwordHash,
          roleId: providerRoleId,
          statusId: activeStatusId,
          providerId: provider.id,
          emailVerified: true,
          onboardingComplete: true
        }
      });
      console.log(`\n  ✓ bootstrap provider portal user: ${providerUserEmail}`);
    } else {
      console.log(
        "\n  (bootstrap provider portal user skipped - set SEED_PROVIDER_PASSWORD to create or refresh)"
      );
    }

    // ─── Cleanup: remove legacy "exemplar-*" placeholder resources ──────────
    // Resource children (endpoints, sovereignty evidence/basis, language/sector/tag
    // joins, etc.) cascade via onDelete: Cascade in the schema.
    const legacyDeleted = await prisma.resource.deleteMany({
      where: {
        slug: { in: ["exemplar-model", "exemplar-agent", "exemplar-tool", "exemplar-skill"] }
      }
    });
    if (legacyDeleted.count > 0) {
      console.log(`  ✓ removed ${legacyDeleted.count} legacy exemplar resources`);
    }

    // ─── Seed catalogue ─────────────────────────────────────────────────────

    type SovereigntyBasisCode =
      | "local_law"
      | "local_data"
      | "local_system"
      | "local_language_culture";

    type EvidenceTypeCode =
      | "regulatory_reference"
      | "data_locality"
      | "system_topology"
      | "language_artefact";

    type ResourceSeed = {
      slug: string;
      title: string;
      typeCode: "model" | "agent" | "tool" | "skill";
      shortDescription: string;
      longDescription: string;
      sovereigntyBasis: SovereigntyBasisCode;
      license: string;
      versionLabel: string;
      latencyTier: string;
      versionNumber?: string;
      accessUrl?: string;
      sourceCodeUrl?: string;
      documentationUrl?: string;
      evidence: {
        typeCode: EvidenceTypeCode;
        title: string;
        description: string;
        referenceUrl?: string;
        referenceIdentifier?: string;
        issuingBody?: string;
      };
      /** Language codes to link (e.g. en) — must exist in Language table. */
      languageCodes?: string[];
      /** Sector codes to link (e.g. telecom) — must exist in Sector table. */
      sectorCodes?: string[];
    };

    const resourceSeeds: ResourceSeed[] = [
      {
        slug: "llm-models",
        title: "LLM Models",
        typeCode: "model",
        shortDescription:
          "Powerful AI models that understand and generate human-like text for a wide range of tasks.",
        longDescription:
          "LLM (Large Language Models) are advanced AI systems trained on vast amounts of text data to understand, generate, and respond in natural language. They can power chatbots, content creation, coding assistance, summarization, and more. These models adapt to different use cases, making them a flexible foundation for building intelligent applications.",
        sovereigntyBasis: "local_data",
        license: "Commercial",
        versionLabel: "200k tokens",
        latencyTier: "1.2s",
        evidence: {
          typeCode: "regulatory_reference",
          title: "Mauritius Data Protection Act 2017 compliance",
          description:
            "All prompts, completions and fine-tuning corpora are processed on Mauritius Telecom infrastructure within Mauritian territory. Cross-border transfer follows the Data Protection Act 2017; customer data does not leave the jurisdiction without explicit DPA-aligned consent.",
          referenceUrl: "https://dataprotection.govmu.org",
          referenceIdentifier: "DPA 2017",
          issuingBody: "Data Protection Office, Republic of Mauritius"
        }
      },
      {
        slug: "ai-workflows",
        title: "AI Workflows",
        typeCode: "agent",
        shortDescription:
          "Automate complex tasks by connecting multiple AI steps into seamless workflows.",
        longDescription:
          "AI Workflows allow you to chain together different AI capabilities - like data processing, decision-making, and content generation - into a single automated process. This helps streamline repetitive or multi-step tasks, improving efficiency and consistency. Workflows can be customised to fit business processes, from customer support to data analysis pipelines.",
        sovereigntyBasis: "local_system",
        license: "Commercial",
        versionLabel: "Multi-step",
        latencyTier: "2-5s",
        evidence: {
          typeCode: "system_topology",
          title: "Hosted on Mauritius Telecom sovereign cloud, Ebène",
          description:
            "Workflow orchestration, queues and state persistence run on MT-operated infrastructure in the Ebène data centre. The runtime stays inside the Mauritian network perimeter; SLA is underwritten by MT Special Projects.",
          referenceUrl: "https://www.telecom.mu",
          referenceIdentifier: "MT-CLOUD-EBN",
          issuingBody: "Mauritius Telecom Ltd"
        }
      },
      {
        slug: "conversational-ai",
        title: "Conversational AI",
        typeCode: "tool",
        shortDescription:
          "Natural voice and text interactions, with experimental support for Kreol Morisien.",
        longDescription:
          "Conversational AI combines speech recognition (speech-to-text) and voice generation (text-to-speech) with intelligent dialogue systems. It allows users to talk to applications and receive spoken or written responses in real time. This is ideal for virtual assistants, call centres, and hands-free user experiences across devices.",
        sovereigntyBasis: "local_language_culture",
        license: "Commercial",
        versionLabel: "Multi-turn",
        latencyTier: "0.8s",
        evidence: {
          typeCode: "language_artefact",
          title: "Kreol Morisien support per Akademi Kreol Morisien orthography",
          description:
            "Speech and dialogue components support Kreol Morisien using the standard orthography. Coverage includes code-switching with French and English typical of Mauritian conversation, with cultural register tuned for service contexts.",
          referenceIdentifier: "AKM standard orthography",
          issuingBody: "Akademi Kreol Morisien"
        }
      },
      {
        slug: "automl",
        title: "AutoML",
        typeCode: "tool",
        shortDescription:
          "Build and deploy machine learning models without needing deep technical expertise.",
        longDescription:
          "AutoML (Automated Machine Learning) simplifies the process of creating AI models by automating tasks like data preparation, model selection, and tuning. Build machine learning solutions on raw data in a few lines of code. State-of-the-art techniques for tabular data, time series and multimodal. This accelerates innovation and makes AI more accessible across organisations.",
        sovereigntyBasis: "local_system",
        license: "Commercial",
        versionLabel: "Tabular + time-series",
        latencyTier: "Async (job)",
        evidence: {
          typeCode: "system_topology",
          title: "Isolated training pools on Mauritius Telecom sovereign cloud",
          description:
            "Training jobs run on isolated MT compute pools with no multi-tenancy outside Mauritius. Model artefacts persist to encrypted MT object storage; access is gated by MT-issued credentials and tenant-scoped IAM.",
          referenceUrl: "https://www.telecom.mu",
          referenceIdentifier: "MT-CLOUD-EBN",
          issuingBody: "Mauritius Telecom Ltd"
        }
      },
      {
        slug: "document-ai",
        title: "Document AI",
        typeCode: "tool",
        shortDescription:
          "Automatically read and extract key data from documents like PDFs, forms, and invoices.",
        longDescription:
          "Document AI uses machine learning and OCR (optical character recognition) to understand and process structured and unstructured documents. It can identify fields, extract important data, and organise information into usable formats. This reduces manual data entry and improves accuracy in workflows like finance, legal, and operations.",
        sovereigntyBasis: "local_data",
        license: "Commercial",
        versionLabel: "OCR + NER",
        latencyTier: "1.5s",
        evidence: {
          typeCode: "data_locality",
          title: "Document processing inside Mauritius jurisdiction",
          description:
            "Uploaded documents are scanned, OCR'd and indexed on MT infrastructure located in the Republic of Mauritius. No third-party OCR or NER service receives the document body; only customer-controlled redactions are exposed via the API.",
          referenceUrl: "https://dataprotection.govmu.org",
          referenceIdentifier: "DPA 2017",
          issuingBody: "Data Protection Office, Republic of Mauritius"
        }
      },
      {
        slug: "mytgpt-enterprise",
        title: "MytGPT Enterprise",
        typeCode: "agent",
        shortDescription: "A secure, enterprise-ready chat platform powered by advanced AI.",
        longDescription:
          "MytGPT Enterprise provides a user-friendly chat interface that allows teams to interact with AI for tasks like answering questions, generating content, and analysing data. It's designed for business use, with features like data privacy, customisation, and integration with internal systems. Users can easily upload documents and ask questions, making it easy to bring AI into everyday workflows across an organisation.",
        sovereigntyBasis: "local_system",
        license: "Commercial",
        versionLabel: "200k tokens",
        latencyTier: "1.1s",
        evidence: {
          typeCode: "system_topology",
          title: "MT-operated chat platform on the sovereign stack",
          description:
            "Front-end, model serving, conversation logs and identity all run on MT-managed infrastructure within Mauritius. Tenants are logically isolated; no conversation telemetry is forwarded to vendor clouds.",
          referenceUrl: "https://www.telecom.mu",
          referenceIdentifier: "MT-CLOUD-EBN",
          issuingBody: "Mauritius Telecom Ltd"
        }
      },
      {
        slug: "vision-models",
        title: "Vision Models",
        typeCode: "model",
        shortDescription: "AI that can see and understand images and visual content.",
        longDescription:
          "Vision Models analyse images and videos to detect objects, read text, recognise patterns, and interpret visual information. They can be used for applications like quality inspection, facial recognition, medical imaging, and content moderation. By turning visual data into actionable insights, they unlock new possibilities for automation and decision-making.",
        sovereigntyBasis: "local_data",
        license: "Commercial",
        versionLabel: "Image + Video",
        latencyTier: "0.9s",
        evidence: {
          typeCode: "data_locality",
          title: "Image data residency on Mauritius Telecom infrastructure",
          description:
            "Inference and any retained imagery remain inside the MT environment. The service is positioned for use cases that need national data residency: quality inspection, regulated content review, public-sector vision workflows.",
          referenceUrl: "https://dataprotection.govmu.org",
          referenceIdentifier: "DPA 2017",
          issuingBody: "Data Protection Office, Republic of Mauritius"
        }
      },
      {
        slug: "mauritius-mobile-operator",
        title: "mauritius-mobile-operator",
        typeCode: "skill",
        shortDescription:
          "Determine which mobile operator a Mauritian phone number belongs to, using the ICTA (Information and Communication Technologies Authority of Mauritius) number-range allocation table.",
        longDescription:
          "Identify the Mauritian mobile operator (Emtel, my.t mobile / Cellplus, or Chili / MTML) for a Mauritian phone number, based on ICTA-assigned number-range prefixes. Trigger whenever the user gives a phone number with the +230 country code, or any 8-digit Mauritian-looking mobile number starting with 5 or 7, and asks which operator, carrier, network, or SIM provider it belongs to. Also trigger for bulk operator lookups (e.g. \"tag each number in this list with its operator\"), for sorting/filtering contact lists by carrier, for checking whether a number was ported or which range it sits in, and for any question of the form \"is +230 5xxx xxxx Emtel or my.t?\" Use this skill instead of guessing - the lookup is deterministic and based on the official ICTA number-range allocation table.",
        sovereigntyBasis: "local_data",
        license: "Proprietary - Mauritius Telecom",
        versionLabel: "Python 3.9+",
        latencyTier: "<10ms",
        versionNumber: "0.1.0",
        accessUrl: "https://github.com/MauritiusTelecom/mauritius-mobile-operator",
        sourceCodeUrl: "https://github.com/MauritiusTelecom/mauritius-mobile-operator",
        documentationUrl:
          "https://github.com/MauritiusTelecom/mauritius-mobile-operator#readme",
        evidence: {
          typeCode: "regulatory_reference",
          title: "ICTA mobile number-range allocation",
          description:
            "Operator assignment is derived from the public ICTA mobile number-range allocations and is refreshed when ICTA publishes new ranges. The skill carries no PII and performs no third-party lookups - resolution runs against the locally-bundled allocation table.",
          referenceUrl: "https://www.icta.mu",
          referenceIdentifier: "ICTA mobile number-range allocation",
          issuingBody: "ICT Authority, Republic of Mauritius"
        },
        languageCodes: ["en"],
        sectorCodes: ["telecom"]
      }
    ];

    // Defensive cleanup: any historical "Phase 1 evidence stub" rows that
    // earlier seed versions left behind, anywhere in the DB. Safe to run
    // every seed - the new seed re-creates the per-resource rows below.
    const legacyEvidenceDeleted = await prisma.sovereigntyEvidence.deleteMany({
      where: {
        OR: [
          { description: { contains: "Phase 1 evidence stub" } },
          { title: { endsWith: "sovereignty evidence (stub)" } }
        ]
      }
    });
    if (legacyEvidenceDeleted.count > 0) {
      console.log(
        `  ✓ removed ${legacyEvidenceDeleted.count} legacy stub evidence row(s)`
      );
    }

    for (const seed of resourceSeeds) {
      const existing = await prisma.resource.findUnique({
        where: { providerId_slug: { providerId: provider.id, slug: seed.slug } }
      });
      const data = {
        slug: seed.slug,
        title: seed.title,
        shortDescription: seed.shortDescription,
        longDescription: seed.longDescription,
        resourceTypeId: resourceTypeIds.get(seed.typeCode)!,
        providerId: provider.id,
        primaryJurisdictionId: jurisdiction.id,
        listingOriginId: listingOriginIds.get("local")!,
        lifecycleStatusId: lifecycleStatusIds.get("listed")!,
        riskLevelId: riskLevelIds.get("low")!,
        publicVisibility: true,
        license: seed.license,
        versionLabel: seed.versionLabel,
        versionNumber: seed.versionNumber ?? null,
        latencyTier: seed.latencyTier,
        accessUrl: seed.accessUrl ?? null,
        sourceCodeUrl: seed.sourceCodeUrl ?? null,
        documentationUrl: seed.documentationUrl ?? null,
        airId: `air://${process.env.IDENTITY_DOMAIN ?? "air.local"}/${seed.typeCode}/${provider.slug}/${seed.slug}`
      };
      const resource = existing
        ? await prisma.resource.update({ where: { id: existing.id }, data })
        : await prisma.resource.create({ data });

      // Sovereignty basis link + per-resource evidence (real references,
      // not a stub - the lookup keys on (resourceId, sovereigntyBasisId)
      // so older stub rows get upgraded on re-seed).
      const basis = await prisma.sovereigntyBasis.findUnique({
        where: { code: seed.sovereigntyBasis }
      });
      if (basis) {
        await prisma.resourceSovereigntyBasis.upsert({
          where: {
            resourceId_sovereigntyBasisId: {
              resourceId: resource.id,
              sovereigntyBasisId: basis.id
            }
          },
          create: { resourceId: resource.id, sovereigntyBasisId: basis.id },
          update: {}
        });

        // Bulletproof against historical duplicates: wipe every evidence
        // row for this (resource, basis) pair, then create exactly one
        // with the current content. Any orphan stub rows left over from
        // earlier seed versions disappear in a single re-seed.
        await prisma.sovereigntyEvidence.deleteMany({
          where: { resourceId: resource.id, sovereigntyBasisId: basis.id }
        });
        await prisma.sovereigntyEvidence.create({
          data: {
            resourceId: resource.id,
            sovereigntyBasisId: basis.id,
            evidenceTypeId: evidenceTypeIds.get(seed.evidence.typeCode)!,
            title: seed.evidence.title,
            description: seed.evidence.description,
            referenceUrl: seed.evidence.referenceUrl ?? null,
            referenceIdentifier: seed.evidence.referenceIdentifier ?? null,
            issuingBody: seed.evidence.issuingBody ?? null,
            publicVisibility: true
          }
        });
      }

      // One REST endpoint stub so the resource has at least one ResourceEndpoint.
      const existingEndpoint = await prisma.resourceEndpoint.findFirst({
        where: { resourceId: resource.id }
      });
      if (!existingEndpoint) {
        await prisma.resourceEndpoint.create({
          data: {
            resourceId: resource.id,
            protocolId: protocolIds.get("rest")!,
            endpointUrl: `https://${providerSlug}.example/api/${seed.slug}`,
            documentationUrl: seed.documentationUrl ?? null,
            authMethodId: authMethodIds.get("api_key")!,
            accessModelId: accessModelIds.get("registered")!,
            primary: true,
            active: true,
            lastCheckStatusId: endpointHealthIds.get("unknown")!
          }
        });
      }

      if (seed.languageCodes?.length) {
        for (const code of seed.languageCodes) {
          const lang = await prisma.language.findUnique({ where: { code } });
          if (lang) {
            await prisma.resourceLanguage.upsert({
              where: {
                resourceId_languageId: { resourceId: resource.id, languageId: lang.id }
              },
              create: { resourceId: resource.id, languageId: lang.id },
              update: {}
            });
          }
        }
      }
      if (seed.sectorCodes?.length) {
        for (const code of seed.sectorCodes) {
          const sector = await prisma.sector.findUnique({ where: { code } });
          if (sector) {
            await prisma.resourceSector.upsert({
              where: { resourceId_sectorId: { resourceId: resource.id, sectorId: sector.id } },
              create: { resourceId: resource.id, sectorId: sector.id },
              update: {}
            });
          }
        }
      }

      console.log(`  ✓ resource seeded: ${resource.title} (slug=${resource.slug})`);
    }

    // ─── Smoke check: ensure user role + status ids exist for downstream phases ─
    if (!userRoleIds.has("admin") || !userStatusIds.has("active")) {
      throw new Error(
        "Reference data inconsistency: expected user 'admin' role and 'active' status."
      );
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (adminPassword) {
      const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@registry.com")
        .toLowerCase()
        .trim();
      const adminName = process.env.SEED_ADMIN_NAME?.trim() ?? adminEmail;
      const passwordHash = await hashPassword(adminPassword);
      const adminRoleId = userRoleIds.get("admin")!;
      const activeStatusId = userStatusIds.get("active")!;

      const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (existingAdmin) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            name: adminName,
            passwordHash,
            roleId: adminRoleId,
            statusId: activeStatusId,
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
            resetToken: null,
            resetTokenExpiry: null,
            onboardingComplete: true
          }
        });
        console.log(`\n  ✓ bootstrap admin updated: ${adminEmail}`);
      } else {
        await prisma.user.create({
          data: {
            email: adminEmail,
            name: adminName,
            passwordHash,
            roleId: adminRoleId,
            statusId: activeStatusId,
            emailVerified: true,
            onboardingComplete: true
          }
        });
        console.log(`\n  ✓ bootstrap admin created: ${adminEmail}`);
      }
    } else {
      console.log(
        "\n  (bootstrap admin skipped - set SEED_ADMIN_PASSWORD to create or refresh operator admin)"
      );
    }

  console.log("\n✓ Phase 1 seed complete.");
}

main()
  .catch((error) => {
    console.error("\n✗ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
