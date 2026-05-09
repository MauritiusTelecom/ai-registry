/**
 * §11 sovereignty review checklist — six yes/no (+ n/a) items stored as
 * ReviewChecklistItem rows keyed by `itemCode`.
 */
export const SOVEREIGNTY_CHECKLIST_ITEMS: { itemCode: string; question: string }[] = [
  { itemCode: "s11_local_law", question: "Local law / regulatory basis is documented and credible." },
  { itemCode: "s11_data_locality", question: "Data locality and residency claims match evidence." },
  { itemCode: "s11_language_culture", question: "Language / cultural fit is substantiated where claimed." },
  { itemCode: "s11_endpoints", question: "Declared endpoints are plausible and policy-appropriate." },
  { itemCode: "s11_risk", question: "Risk level is proportionate to described capability." },
  { itemCode: "s11_transparency", question: "Public description is not misleading vs internal notes." }
];

export type ChecklistAnswerCode = "yes" | "no" | "n_a";
