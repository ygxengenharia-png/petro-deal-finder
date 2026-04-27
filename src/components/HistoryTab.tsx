import { useState, useMemo } from "react";
import { deleteOpportunity, profitOf, type Opportunity } from "@/lib/history-store";
import { formatBRL } from "@/lib/petronect-parser";
import { EditOpportunityModal } from "./EditOpportunityModal";

type Props = {
  opportunities: Opportunity[];
  onChange: () => void;
};

type Group = {
  opportunityNumber: string;
  items: Opportunity[];
  totalSale: number;
  totalCost: number;
  totalProfit: number;
  latest: number;
};

export function HistoryTab({ opportunities, onChange }: Props) {
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Opportunity[]>();
    for (const o of opportunities) {
      const key = o.opportunityNumber || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    const arr: Group[] = [];
    for (const [opportunityNumber, items] of map.entries()) {
      const sortedItems = [...items].sort((a, b) => {
        const ai = parseInt(a.itemNumber, 10);
        const bi = parseInt(b.itemNumber, 10);
        if (!isNaN(ai) && !isNaN(bi)) return ai - bi;
        return a.itemNumber.localeCompare(b.itemNumber);
      });
      const totalSale = sortedItems.reduce((s, o) => s + o.saleValueYGX, 0);
      const totalCost = sortedItems.reduce((s, o) => s + o.costValue, 0);
      const totalProfit = totalSale - totalCost;
      const latest = Math.max(...sortedItems.map((o) => o.updatedAt ?? o.createdAt));
      arr.push({ opportunityNumber, items: sortedItems, totalSale, totalCost, totalProfit, latest });
    }
    arr.sort((a, b) => b.latest - a.latest);
    return arr;
  }, [opportunities]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (o) =>
            g.opportunityNumber.toLowerCase().includes(q) ||
            o.title.toLowerCase().includes(q) ||
            o.itemNumber.toLowerCase().includes(q) ||
            (o.factory ?? "").toLowerCase().includes(q) ||
            (o.partNumber ?? "").toLowerCase().includes(q) ||
            (o.supplier ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0 || g.opportunityNumber.toLowerCase().includes(q));
  }, [groups, query]);

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <div className="text-4xl mb-3">📦</div>
        <h3 className="text-lg font-semibold">Nenhuma oportunidade salva</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Volte ao Analisador e clique em "Salvar Oportunidade" em qualquer item.
        </p>
      </div>
    );
  }

  const totalProfit = opportunities.reduce((s, o) => s + profitOf(o).profit, 0);
  const totalInvestment = opportunities.reduce((s, o) => s + (o.costValue || 0), 0);
  const totalRevenue = opportunities.reduce((s, o) => s + (o.saleValueYGX || 0), 0);

  const toggleGroup = (key: string) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const expandAll = () => setCollapsed({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    for (const g of groups) all[g.opportunityNumber] = true;
    setCollapsed(all);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
            Total acumulado (lucro)
          </div>
          <div
            className={`text-2xl font-bold ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}
          >
            {formatBRL(totalProfit)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
            Valor de investimento
          </div>
          <div className="text-2xl font-bold text-warning">{formatBRL(totalInvestment)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Soma dos custos</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
            Receita YGX
          </div>
          <div className="text-2xl font-bold text-info">{formatBRL(totalRevenue)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {groups.length} {groups.length === 1 ? "oportunidade" : "oportunidades"} •{" "}
            {opportunities.length} {opportunities.length === 1 ? "item" : "itens"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 Buscar por nº da oportunidade, item, título, fábrica…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
        <button
          onClick={expandAll}
          className="px-3 py-2 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-colors"
        >
          Expandir tudo
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-2 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-colors"
        >
          Recolher tudo
        </button>
      </div>

      <div className="space-y-3">
        {filteredGroups.map((g) => {
          const isCollapsed = collapsed[g.opportunityNumber];
          const margin = g.totalSale > 0 ? (g.totalProfit / g.totalSale) * 100 : 0;
          return (
            <div
              key={g.opportunityNumber}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => toggleGroup(g.opportunityNumber)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-muted-foreground text-xs">
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-info/15 text-info border border-info/30">
                        Oportunidade {g.opportunityNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30">
                        {g.items.length} {g.items.length === 1 ? "item" : "itens vinculados"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Atualizado {new Date(g.latest).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] uppercase text-muted-foreground">Venda</div>
                    <div className="text-xs font-mono font-semibold">{formatBRL(g.totalSale)}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] uppercase text-muted-foreground">Custo</div>
                    <div className="text-xs font-mono font-semibold">{formatBRL(g.totalCost)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground">Lucro</div>
                    <div
                      className={`text-sm font-bold ${g.totalProfit >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {formatBRL(g.totalProfit)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${margin >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {margin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </button>

              {!isCollapsed && (
                <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((o) => {
                    const { profit, margin: m } = profitOf(o);
                    return (
                      <div
                        key={o.id}
                        className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground border border-border mb-1.5">
                              Item {o.itemNumber}
                            </span>
                            <h4 className="text-sm font-semibold line-clamp-2">{o.title}</h4>
                            {o.supplier && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {o.supplier}
                              </p>
                            )}
                          </div>
                        </div>

                        {(o.factory || o.partNumber) && (
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {o.factory && (
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 font-semibold">
                                🏭 {o.factory}
                              </span>
                            )}
                            {o.partNumber && (
                              <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border font-mono">
                                P/N: {o.partNumber}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md bg-muted/50 p-2">
                            <div className="text-muted-foreground text-[10px]">Venda YGX</div>
                            <div className="font-mono font-semibold">
                              {formatBRL(o.saleValueYGX)}
                            </div>
                          </div>
                          <div className="rounded-md bg-muted/50 p-2">
                            <div className="text-muted-foreground text-[10px]">Custo</div>
                            <div className="font-mono font-semibold">{formatBRL(o.costValue)}</div>
                          </div>
                        </div>

                        {o.notes && (
                          <div className="text-[11px] text-muted-foreground border-l-2 border-info/40 pl-2 line-clamp-2 italic">
                            💭 {o.notes}
                          </div>
                        )}

                        <div className="border-t border-border pt-2 flex items-end justify-between">
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Lucro
                            </div>
                            <div
                              className={`text-base font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {formatBRL(profit)}
                            </div>
                          </div>
                          <div
                            className={`text-xs font-semibold ${m >= 0 ? "text-success" : "text-destructive"}`}
                          >
                            {m.toFixed(1)}%
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setEditing(o)}
                            className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Excluir item ${o.itemNumber} - "${o.title}"?`)) {
                                await deleteOpportunity(o.id);
                                onChange();
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                            title="Excluir item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum resultado para "{query}"
          </div>
        )}
      </div>

      <EditOpportunityModal
        open={editing !== null}
        opportunity={editing}
        onClose={() => setEditing(null)}
        onSaved={onChange}
      />
    </div>
  );
}
