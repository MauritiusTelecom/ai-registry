/**
 * Phase 1 seed.
 *
 * Loads reference taxonomies (every controlled vocabulary that lives in its
 * own table per the schema's "no SQL enums" convention), the deployment's
 * jurisdiction, languages, sectors, sovereignty bases, plus one exemplar
 * provider with one resource per AIR-SPEC §7 resource type and a sovereignty
 * evidence stub for each.
 *
 * Idempotent: every row is inserted via `upsert` keyed on its natural unique
 * (`code` for reference rows, slug-style identifiers for domain rows). Re-
 * running the script after a successful seed is a no-op for existing rows
 * and only fills new gaps.
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
    const upserted = (await table.upsert({
      where: { code: row.code },
      create: {
        code: row.code,
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
    result.set(row.code, upserted.id);
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

    const provider = await prisma.provider.upsert({
      where: { slug: providerSlug },
      create: {
        slug: providerSlug,
        displayName: providerName,
        legalName: providerName,
        typeId: providerTypeIds.get("sovereign")!,
        homeJurisdictionId: jurisdiction.id,
        websiteUrl: `https://${providerSlug}.example`,
        contactEmail: `contact@${providerSlug}.example`,
        statusId: providerStatusIds.get("verified")!,
        srcId: submissionSourceIds.get("operator_added")!,
        description:
          "Phase 1 exemplar provider seeded by src/prisma/seed.ts. Replace with production data."
      },
      update: {
        displayName: providerName,
        legalName: providerName
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

    type ResourceSeed = {
      slug: string;
      title: string;
      typeCode: "model" | "agent" | "tool" | "skill";
      shortDescription: string;
      longDescription: string;
      sovereigntyBasis: SovereigntyBasisCode;
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
        sovereigntyBasis: "local_data"
      },
      {
        slug: "ai-workflows",
        title: "AI Workflows",
        typeCode: "agent",
        shortDescription:
          "Automate complex tasks by connecting multiple AI steps into seamless workflows.",
        longDescription:
          "AI Workflows allow you to chain together different AI capabilities - like data processing, decision-making, and content generation - into a single automated process. This helps streamline repetitive or multi-step tasks, improving efficiency and consistency. Workflows can be customised to fit business processes, from customer support to data analysis pipelines.",
        sovereigntyBasis: "local_system"
      },
      {
        slug: "conversational-ai",
        title: "Conversational AI",
        typeCode: "tool",
        shortDescription:
          "Natural voice and text interactions, with experimental support for Kreol Morisien.",
        longDescription:
          "Conversational AI combines speech recognition (speech-to-text) and voice generation (text-to-speech) with intelligent dialogue systems. It allows users to talk to applications and receive spoken or written responses in real time. This is ideal for virtual assistants, call centres, and hands-free user experiences across devices.",
        sovereigntyBasis: "local_language_culture"
      },
      {
        slug: "automl",
        title: "AutoML",
        typeCode: "tool",
        shortDescription:
          "Build and deploy machine learning models without needing deep technical expertise.",
        longDescription:
          "AutoML (Automated Machine Learning) simplifies the process of creating AI models by automating tasks like data preparation, model selection, and tuning. Build machine learning solutions on raw data in a few lines of code. State-of-the-art techniques for tabular data, time series and multimodal. This accelerates innovation and makes AI more accessible across organisations.",
        sovereigntyBasis: "local_system"
      },
      {
        slug: "document-ai",
        title: "Document AI",
        typeCode: "tool",
        shortDescription:
          "Automatically read and extract key data from documents like PDFs, forms, and invoices.",
        longDescription:
          "Document AI uses machine learning and OCR (optical character recognition) to understand and process structured and unstructured documents. It can identify fields, extract important data, and organise information into usable formats. This reduces manual data entry and improves accuracy in workflows like finance, legal, and operations.",
        sovereigntyBasis: "local_data"
      },
      {
        slug: "mytgpt-enterprise",
        title: "MytGPT Enterprise",
        typeCode: "agent",
        shortDescription: "A secure, enterprise-ready chat platform powered by advanced AI.",
        longDescription:
          "MytGPT Enterprise provides a user-friendly chat interface that allows teams to interact with AI for tasks like answering questions, generating content, and analysing data. It's designed for business use, with features like data privacy, customisation, and integration with internal systems. Users can easily upload documents and ask questions, making it easy to bring AI into everyday workflows across an organisation.",
        sovereigntyBasis: "local_system"
      },
      {
        slug: "vision-models",
        title: "Vision Models",
        typeCode: "model",
        shortDescription: "AI that can see and understand images and visual content.",
        longDescription:
          "Vision Models analyse images and videos to detect objects, read text, recognise patterns, and interpret visual information. They can be used for applications like quality inspection, facial recognition, medical imaging, and content moderation. By turning visual data into actionable insights, they unlock new possibilities for automation and decision-making.",
        sovereigntyBasis: "local_data"
      }
    ];

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
        airId: `air://${process.env.IDENTITY_DOMAIN ?? "air.local"}/${seed.typeCode}/${provider.slug}/${seed.slug}`
      };
      const resource = existing
        ? await prisma.resource.update({ where: { id: existing.id }, data })
        : await prisma.resource.create({ data });

      // Sovereignty basis link + evidence stub.
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

        const evidenceTitle = `${seed.title} - sovereignty evidence (stub)`;
        const evidence = await prisma.sovereigntyEvidence.findFirst({
          where: { resourceId: resource.id, title: evidenceTitle }
        });
        if (!evidence) {
          await prisma.sovereigntyEvidence.create({
            data: {
              resourceId: resource.id,
              sovereigntyBasisId: basis.id,
              evidenceTypeId: evidenceTypeIds.get("regulatory_reference")!,
              title: evidenceTitle,
              description:
                "Phase 1 evidence stub. Production deployments must replace with real references.",
              publicVisibility: true
            }
          });
        }
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
            authMethodId: authMethodIds.get("api_key")!,
            accessModelId: accessModelIds.get("registered")!,
            primary: true,
            active: true,
            lastCheckStatusId: endpointHealthIds.get("unknown")!
          }
        });
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
