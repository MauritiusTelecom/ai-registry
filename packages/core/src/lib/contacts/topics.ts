export const CONTACT_TOPIC_CODES = [
  "general",
  "submit",
  "review",
  "report",
  "jurisdiction",
  "press"
] as const;

export type ContactTopicCode = (typeof CONTACT_TOPIC_CODES)[number];

export const CONTACT_TOPIC_LABELS: Record<ContactTopicCode, string> = {
  general: "General enquiry",
  submit: "Submit a resource",
  review: "Request a review",
  report: "Report an issue",
  jurisdiction: "Standing up a registry",
  press: "Press / media"
};

export const CONTACT_TOPICS = new Set<string>(CONTACT_TOPIC_CODES);
