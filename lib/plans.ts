export type Plan = {
  id: number;
  name: string;
  count: number;
  price: string;
  priceYen: number;
  per: string;
  note: string;
  single: boolean;
};

// Static course catalog (単発 / 4回 / 8回 / 12回) — matches the design; there
// is no admin UI for editing these, so they live in code rather than the DB.
export const PLANS: Plan[] = [
  { id: 0, name: "単発", count: 1, price: "¥8,000", priceYen: 8000, per: "1回のみ", note: "", single: true },
  { id: 1, name: "4回コース", count: 4, price: "¥30,000", priceYen: 30000, per: "¥7,500 / 回", note: "", single: false },
  { id: 2, name: "8回コース", count: 8, price: "¥56,000", priceYen: 56000, per: "¥7,000 / 回", note: "人気", single: false },
  { id: 3, name: "12回コース", count: 12, price: "¥78,000", priceYen: 78000, per: "¥6,500 / 回", note: "お得", single: false },
];

export function getPlan(id: number): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan id: ${id}`);
  return plan;
}
