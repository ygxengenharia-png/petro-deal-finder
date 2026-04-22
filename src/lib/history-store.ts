export type Opportunity = {
  id: string;
  createdAt: number;
  updatedAt?: number;
  title: string;
  itemNumber: string;
  opportunityNumber: string;
  supplier: string;
  saleValueYGX: number;
  costValue: number;
  description?: string;
  notes?: string;
  factory?: string;
  partNumber?: string;
};

const KEY = "rankingplay:opportunities:v1";

export function loadOpportunities(): Opportunity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveOpportunity(o: Opportunity) {
  const list = loadOpportunities();
  list.unshift(o);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function updateOpportunity(id: string, patch: Partial<Opportunity>) {
  const list = loadOpportunities().map((o) =>
    o.id === id ? { ...o, ...patch, id: o.id, updatedAt: Date.now() } : o,
  );
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteOpportunity(id: string) {
  const list = loadOpportunities().filter((o) => o.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function profitOf(o: Opportunity) {
  const profit = o.saleValueYGX - o.costValue;
  const margin = o.saleValueYGX > 0 ? (profit / o.saleValueYGX) * 100 : 0;
  return { profit, margin };
}
