export type RegistryItem = {
  name: string;
  type: "model" | "agent" | "tool" | "skill";
  provider: string;
  jurisdiction: string;
  status: "listed" | "reviewed" | "declared";
  summary: string;
};

export const registryItems: RegistryItem[] = [
  {
    name: "National Helpdesk Assistant",
    type: "agent",
    provider: "Mauritius Telecom",
    jurisdiction: "MU",
    status: "reviewed",
    summary: "Citizen support assistant for public services discovery."
  },
  {
    name: "IslandSpeech v2",
    type: "model",
    provider: "Gov AI Lab",
    jurisdiction: "MU",
    status: "declared",
    summary: "Speech recognition model tuned for English/French/Creole code-mix."
  },
  {
    name: "Compliance Summarizer",
    type: "tool",
    provider: "RegTech Partners",
    jurisdiction: "MU",
    status: "listed",
    summary: "Summarizes AI policy updates with traceable citations."
  }
];

export const ecosystemPartners = [
  "National Digital Authority",
  "Mauritius Telecom",
  "University AI Research Group",
  "Certified Cloud Partners"
];

export const docsSections = [
  {
    id: "overview",
    title: "Overview",
    body: "AIR-SPEC defines registry scope, governance labels, and interoperability expectations."
  },
  {
    id: "api",
    title: "API",
    body: "Public APIs provide list, detail, resolve, and discover endpoints for registered resources."
  },
  {
    id: "governance",
    title: "Governance",
    body: "Listing does not imply endorsement. Sovereignty review and official status remain separate."
  }
];
