import { findYGX, formatBRL, isYGX, type RankedItem } from "@/lib/petronect-parser";

type Props = {
  item: RankedItem;
  onSave: (args: {
    title: string;
    itemNumber: string;
    supplier: string;
    opportunityNumber?: string;
    suggestedSale?: number;
  }) => void;
};

export function RankingItemCard({ item, onSave }: Props) {
  const lowest = item.bids[0]?.value ?? 0;
  const ygx = findYGX(item);
  const ygxWon = ygx?.position === 1;
  const suggestedSale = ygx?.value ?? lowest;

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden shadow-sm">
      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-info/15 text-info border border-info/30">
              Item {item.itemNumber}
            </span>
            {item.opportunityNumber && (
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
                Opp. {item.opportunityNumber}
              </span>
            )}
            {ygx ? (
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                  ygxWon
                    ? "bg-success/15 text-success border-success/40"
                    : "bg-warning/15 text-warning border-warning/40"
                }`}
              >
                YGX: {ygxWon ? "🏆 1º (vencedora)" : `${ygx.position}º lugar`}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                YGX não participou
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {item.bids.length} {item.bids.length === 1 ? "lance" : "lances"}
            </span>
          </div>
          <h3 className="text-sm md:text-base font-medium text-foreground line-clamp-2">
            {item.description || "(sem descrição)"}
          </h3>
        </div>
        <button
          onClick={() =>
            onSave({
              title: item.description || `Item ${item.itemNumber}`,
              itemNumber: item.itemNumber,
              supplier: ygx?.supplier ?? item.bids[0]?.supplier ?? "",
              opportunityNumber: item.opportunityNumber,
              suggestedSale,
            })
          }
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          💾 Salvar Oportunidade
        </button>
      </div>

      <div className="divide-y divide-border">
        <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Fornecedor</div>
          <div className="col-span-3 text-right">Proposta</div>
          <div className="col-span-2 text-right">Diferença</div>
        </div>
        {item.bids.map((bid, idx) => {
          const diff = bid.value - lowest;
          const diffPct = lowest > 0 ? (diff / lowest) * 100 : 0;
          const rowStyle =
            idx === 0
              ? "bg-success/10"
              : idx === 1
                ? "bg-info/10"
                : idx === 2
                  ? "bg-warning/10"
                  : "";
          const isYgxRow = isYGX(bid.supplier);
          return (
            <div
              key={`${bid.supplier}-${idx}`}
              className={`grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm ${rowStyle} ${
                isYgxRow ? "ring-2 ring-inset ring-primary/60" : ""
              }`}
            >
              <div className="col-span-1 font-bold">
                {idx === 0 ? (
                  <span className="text-success">👑</span>
                ) : (
                  <span className="text-muted-foreground">{idx + 1}º</span>
                )}
              </div>
              <div className="col-span-6 min-w-0">
                <div className="font-medium truncate flex items-center gap-1.5">
                  {bid.supplier}
                  {isYgxRow && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-primary-foreground">
                      YGX
                    </span>
                  )}
                </div>
                {idx === 0 && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-success text-success-foreground">
                    Melhor Lance
                  </span>
                )}
              </div>
              <div className="col-span-3 text-right font-mono font-semibold">
                {formatBRL(bid.value)}
              </div>
              <div className="col-span-2 text-right text-xs">
                {idx === 0 ? (
                  <span className="text-muted-foreground">Referência</span>
                ) : (
                  <span className="text-destructive">
                    +{diffPct.toFixed(1)}%
                    <div className="text-[10px] text-muted-foreground">{formatBRL(diff)}</div>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
