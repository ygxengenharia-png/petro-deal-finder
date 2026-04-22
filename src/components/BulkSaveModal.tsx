import { useEffect, useMemo, useState } from "react";
import { findYGX, formatBRL, type RankedItem } from "@/lib/petronect-parser";
import { saveOpportunity, type Opportunity } from "@/lib/history-store";

type Props = {
  open: boolean;
  items: RankedItem[];
  defaultOpportunityNumber?: string;
  onClose: () => void;
  onSaved: (count: number) => void;
};

export function BulkSaveModal({
  open,
  items,
  defaultOpportunityNumber,
  onClose,
  onSaved,
}: Props) {
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [costs, setCosts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setOpportunityNumber(defaultOpportunityNumber ?? "");
      setCosts({});
    }
  }, [open, defaultOpportunityNumber]);

  const rows = useMemo(
    () =>
      items.map((it) => {
        const ygx = findYGX(it);
        const sale = ygx?.value ?? it.bids[0]?.value ?? 0;
        const supplier = ygx?.supplier ?? it.bids[0]?.supplier ?? "";
        return { item: it, sale, supplier, ygxWon: ygx?.position === 1 };
      }),
    [items],
  );

  if (!open) return null;

  const totalSale = rows.reduce((s, r) => s + r.sale, 0);
  const totalCost = rows.reduce(
    (s, r) => s + (Number((costs[r.item.itemNumber] ?? "").replace(",", ".")) || 0),
    0,
  );
  const totalProfit = totalSale - totalCost;

  const handleSave = () => {
    if (!opportunityNumber.trim() || rows.length === 0) return;
    const opp = opportunityNumber.trim();
    const now = Date.now();
    rows.forEach((r) => {
      const cost = Number((costs[r.item.itemNumber] ?? "").replace(",", ".")) || 0;
      const o: Opportunity = {
        id: crypto.randomUUID(),
        createdAt: now,
        title: r.item.description || `Item ${r.item.itemNumber}`,
        itemNumber: r.item.itemNumber,
        opportunityNumber: opp,
        supplier: r.supplier,
        saleValueYGX: r.sale,
        costValue: cost,
      };
      saveOpportunity(o);
    });
    onSaved(rows.length);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold">
            Salvar {rows.length} {rows.length === 1 ? "Oportunidade" : "Oportunidades"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Você pode editar custo, descrição, fábrica e P/N depois no Histórico.
          </p>
        </div>

        <div className="px-6 py-4 border-b border-border">
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Número da Oportunidade
            </span>
            <input
              value={opportunityNumber}
              onChange={(e) => setOpportunityNumber(e.target.value)}
              placeholder="Ex.: 7004584613"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-info"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {rows.map((r) => (
            <div
              key={r.item.itemNumber}
              className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-12 gap-3 items-center"
            >
              <div className="col-span-12 sm:col-span-6 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-info/15 text-info border border-info/30">
                    Item {r.item.itemNumber}
                  </span>
                  {r.ygxWon && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success border border-success/40">
                      🏆 YGX
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium line-clamp-2">
                  {r.item.description || "(sem descrição)"}
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {r.supplier}
                </div>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <div className="text-[10px] uppercase text-muted-foreground">Venda</div>
                <div className="font-mono text-sm font-semibold">{formatBRL(r.sale)}</div>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="block">
                  <span className="text-[10px] uppercase text-muted-foreground">Custo</span>
                  <input
                    type="number"
                    value={costs[r.item.itemNumber] ?? ""}
                    onChange={(e) =>
                      setCosts((prev) => ({ ...prev, [r.item.itemNumber]: e.target.value }))
                    }
                    placeholder="0,00"
                    className="w-full mt-0.5 px-2 py-1.5 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-info"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-border bg-muted/20 grid grid-cols-3 gap-3 text-xs">
          <Stat label="Soma Venda" value={formatBRL(totalSale)} />
          <Stat label="Soma Custo" value={formatBRL(totalCost)} />
          <Stat
            label="Lucro Total"
            value={formatBRL(totalProfit)}
            tone={totalProfit >= 0 ? "success" : "destructive"}
          />
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!opportunityNumber.trim() || rows.length === 0}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar {rows.length} na YGX
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
}) {
  const color =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
    </div>
  );
}
