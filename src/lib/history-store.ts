import { supabase } from "@/integrations/supabase/client";

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

type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  item_number: string;
  opportunity_number: string;
  supplier: string;
  sale_value_ygx: number | string;
  cost_value: number | string;
  description: string | null;
  notes: string | null;
  factory: string | null;
  part_number: string | null;
};

function rowToOpp(r: Row): Opportunity {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    title: r.title,
    itemNumber: r.item_number,
    opportunityNumber: r.opportunity_number,
    supplier: r.supplier,
    saleValueYGX: Number(r.sale_value_ygx) || 0,
    costValue: Number(r.cost_value) || 0,
    description: r.description ?? undefined,
    notes: r.notes ?? undefined,
    factory: r.factory ?? undefined,
    partNumber: r.part_number ?? undefined,
  };
}

export async function loadOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("loadOpportunities", error);
    return [];
  }
  return (data as Row[]).map(rowToOpp);
}

export type NewOpportunity = Omit<Opportunity, "id" | "createdAt" | "updatedAt">;

export async function saveOpportunity(o: NewOpportunity): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      title: o.title,
      item_number: o.itemNumber,
      opportunity_number: o.opportunityNumber,
      supplier: o.supplier,
      sale_value_ygx: o.saleValueYGX,
      cost_value: o.costValue,
      description: o.description ?? null,
      notes: o.notes ?? null,
      factory: o.factory ?? null,
      part_number: o.partNumber ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("saveOpportunity", error);
    return null;
  }
  return rowToOpp(data as Row);
}

export async function updateOpportunity(id: string, patch: Partial<Opportunity>) {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.itemNumber !== undefined) payload.item_number = patch.itemNumber;
  if (patch.opportunityNumber !== undefined) payload.opportunity_number = patch.opportunityNumber;
  if (patch.supplier !== undefined) payload.supplier = patch.supplier;
  if (patch.saleValueYGX !== undefined) payload.sale_value_ygx = patch.saleValueYGX;
  if (patch.costValue !== undefined) payload.cost_value = patch.costValue;
  if (patch.description !== undefined) payload.description = patch.description || null;
  if (patch.notes !== undefined) payload.notes = patch.notes || null;
  if (patch.factory !== undefined) payload.factory = patch.factory || null;
  if (patch.partNumber !== undefined) payload.part_number = patch.partNumber || null;

  const { error } = await supabase.from("opportunities").update(payload).eq("id", id);
  if (error) console.error("updateOpportunity", error);
}

export async function deleteOpportunity(id: string) {
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) console.error("deleteOpportunity", error);
}

export function profitOf(o: Opportunity) {
  const profit = o.saleValueYGX - o.costValue;
  const margin = o.saleValueYGX > 0 ? (profit / o.saleValueYGX) * 100 : 0;
  return { profit, margin };
}
