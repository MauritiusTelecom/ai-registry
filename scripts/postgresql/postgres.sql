-- postgres.sql — PostgreSQL standalone script (DBeaver / psql).
-- Seeds ResourceType `skill` (if missing) and the Mauritius Mobile Operator packaged skill
-- plus ResourceSovereigntyBasis, SovereigntyEvidence, ResourceEndpoint, optional en + telecom sector.
--
-- Same logic as: src/prisma/migrations/20260512120000_seed_mauritius_mobile_operator_skill/migration.sql
--
-- Prerequisites: schema `registry`, Phase 1 reference data, Provider slug `mauritius-telecom`,
-- Jurisdiction `MU` (e.g. after `npm run db:seed`). Idempotent for the resource row (skips if exists).
--
-- If a previous statement failed in the same session: ROLLBACK;

-- ─── ResourceType: skill (insert only if missing) ───────────────────────────
INSERT INTO registry."ResourceType" ("id", "code", "name", "description", "active", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       'skill',
       'Skill',
       'Packaged local expertise or knowledge artefact.',
       true,
       4,
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM registry."ResourceType" t WHERE t."code" = 'skill');

-- ─── Resource + associated rows ─────────────────────────────────────────────
DO $$
DECLARE
  v_provider_id   text;
  v_jurisdiction_id text;
  v_resource_type_id text;
  v_listing_id    text;
  v_lifecycle_id  text;
  v_risk_id       text;
  v_basis_id      text;
  v_evidence_type_id text;
  v_protocol_id   text;
  v_auth_id       text;
  v_access_id     text;
  v_health_id     text;
  v_lang_en_id    text;
  v_sector_telecom_id text;
  v_resource_id   text;
  v_air_id        text;
BEGIN
  SELECT p."id" INTO v_provider_id
  FROM registry."Provider" p
  WHERE p."slug" = 'mauritius-telecom'
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'seed_mauritius_mobile_operator_skill: provider slug mauritius-telecom not found (run npm run db:seed first)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM registry."Resource" r
    WHERE r."providerId" = v_provider_id AND r."slug" = 'mauritius-mobile-operator'
  ) THEN
    RAISE NOTICE 'seed_mauritius_mobile_operator_skill: resource mauritius-mobile-operator already exists; skipping';
    RETURN;
  END IF;

  SELECT j."id" INTO v_jurisdiction_id FROM registry."Jurisdiction" j WHERE j."code" = 'MU' LIMIT 1;
  IF v_jurisdiction_id IS NULL THEN
    RAISE EXCEPTION 'seed_mauritius_mobile_operator_skill: jurisdiction MU not found';
  END IF;

  SELECT t."id" INTO v_resource_type_id FROM registry."ResourceType" t WHERE t."code" = 'skill' LIMIT 1;
  IF v_resource_type_id IS NULL THEN
    RAISE EXCEPTION 'seed_mauritius_mobile_operator_skill: ResourceType skill not found after upsert';
  END IF;

  SELECT l."id" INTO v_listing_id FROM registry."ListingOrigin" l WHERE l."code" = 'local' LIMIT 1;
  SELECT s."id" INTO v_lifecycle_id FROM registry."LifecycleStatus" s WHERE s."code" = 'listed' LIMIT 1;
  SELECT r."id" INTO v_risk_id FROM registry."RiskLevel" r WHERE r."code" = 'low' LIMIT 1;
  SELECT b."id" INTO v_basis_id FROM registry."SovereigntyBasis" b WHERE b."code" = 'local_data' LIMIT 1;
  SELECT e."id" INTO v_evidence_type_id FROM registry."EvidenceType" e WHERE e."code" = 'regulatory_reference' LIMIT 1;
  SELECT p."id" INTO v_protocol_id FROM registry."Protocol" p WHERE p."code" = 'rest' LIMIT 1;
  SELECT a."id" INTO v_auth_id FROM registry."AuthMethodType" a WHERE a."code" = 'api_key' LIMIT 1;
  SELECT m."id" INTO v_access_id FROM registry."AccessModelType" m WHERE m."code" = 'registered' LIMIT 1;
  SELECT h."id" INTO v_health_id FROM registry."EndpointHealthType" h WHERE h."code" = 'unknown' LIMIT 1;

  v_resource_id := gen_random_uuid()::text;
  v_air_id := 'air://air.local/skill/mauritius-telecom/mauritius-mobile-operator';

  INSERT INTO registry."Resource" (
    "id",
    "airId",
    "slug",
    "title",
    "shortDescription",
    "longDescription",
    "resourceTypeId",
    "providerId",
    "primaryJurisdictionId",
    "listingOriginId",
    "lifecycleStatusId",
    "riskLevelId",
    "publicVisibility",
    "license",
    "versionLabel",
    "latencyTier",
    "documentationUrl",
    "createdAt",
    "updatedAt"
  ) VALUES (
    v_resource_id,
    v_air_id,
    'mauritius-mobile-operator',
    'Mauritius Mobile Operator lookup',
    'Deterministic ICTA prefix lookup: map +230 mobile numbers to Emtel, my.t mobile (Mauritius Telecom), or Chili (MTML). Ships as Python library, CLI, and Claude skill bundle.',
    $desc$
Packaged skill derived from the open-source mauritius-mobile-operator project. Mauritian mobile numbers are 8 digits, dialled as +230 XXXX XXXX; the first four digits map to the operator range originally allocated by the ICTA (Information and Communication Technologies Authority of Mauritius). Covers 529 four-digit prefixes across Cellplus Mobile Communications Ltd (consumer brand my.t mobile / Mauritius Telecom), Emtel Ltd (Emtel), and Mahanagar Telephone (Mauritius) Ltd (Chili / MTML). Lookup is a single dictionary access after normalisation—suitable for bulk contact tagging. MIT license. Important: Mauritius supports mobile number portability; the library reports ICTA-allocated operator, which may differ from the live carrier—combine with HLR or operator queries when routing, fraud, or real-time billing require the current carrier.
$desc$,
    v_resource_type_id,
    v_provider_id,
    v_jurisdiction_id,
    v_listing_id,
    v_lifecycle_id,
    v_risk_id,
    true,
    'MIT',
    'ICTA prefix table',
    '<1ms',
    'https://pypi.org/project/mauritius-mobile-operator/',
    now(),
    now()
  );

  INSERT INTO registry."ResourceSovereigntyBasis" ("resourceId", "sovereigntyBasisId", "createdAt")
  VALUES (v_resource_id, v_basis_id, now());

  INSERT INTO registry."SovereigntyEvidence" (
    "id",
    "resourceId",
    "sovereigntyBasisId",
    "evidenceTypeId",
    "title",
    "description",
    "referenceUrl",
    "publicVisibility",
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    v_resource_id,
    v_basis_id,
    v_evidence_type_id,
    'Mauritius Mobile Operator lookup - sovereignty evidence (stub)',
    'Phase 1 evidence stub referencing ICTA number-range allocation as the authoritative prefix source. Replace with formal regulatory artefacts for production compliance.',
    'https://www.icta.mu/',
    true,
    now(),
    now()
  );

  INSERT INTO registry."ResourceEndpoint" (
    "id",
    "resourceId",
    "protocolId",
    "endpointUrl",
    "documentationUrl",
    "authMethodId",
    "accessModelId",
    "primary",
    "active",
    "lastCheckStatusId",
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    v_resource_id,
    v_protocol_id,
    'https://mauritius-telecom.example/api/mauritius-mobile-operator',
    'https://pypi.org/project/mauritius-mobile-operator/',
    v_auth_id,
    v_access_id,
    true,
    true,
    v_health_id,
    now(),
    now()
  );

  SELECT l."id" INTO v_lang_en_id FROM registry."Language" l WHERE l."code" = 'en' LIMIT 1;
  IF v_lang_en_id IS NOT NULL THEN
    INSERT INTO registry."ResourceLanguage" ("resourceId", "languageId")
    VALUES (v_resource_id, v_lang_en_id)
    ON CONFLICT ("resourceId", "languageId") DO NOTHING;
  END IF;

  SELECT s."id" INTO v_sector_telecom_id FROM registry."Sector" s WHERE s."code" = 'telecom' LIMIT 1;
  IF v_sector_telecom_id IS NOT NULL THEN
    INSERT INTO registry."ResourceSector" ("resourceId", "sectorId")
    VALUES (v_resource_id, v_sector_telecom_id)
    ON CONFLICT ("resourceId", "sectorId") DO NOTHING;
  END IF;
END $$;
