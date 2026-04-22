import { deleteOpportunity, profitOf, type Opportunity } from "@/lib/history-store";
import { formatBRL } from "@/lib/petronect-parser";

type Props = {
  opportunities: Opportunity[];
  onChange: () => void;
};

export function HistoryTab({ opportunities, onChange }: Props) {
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground tracking-wide">
            Total acumulado
          </div>
          <div
            className={`text-2xl font-bold ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}
          >
            {formatBRL(totalProfit)}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {opportunities.length} {opportunities.length === 1 ? "oportunidade" : "oportunidades"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((o) => {
          const { profit, margin } = profitOf(o);
          return (
            <div
              key={o.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex gap-1.5 mb-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-info/15 text-info border border-info/30">
                      Opp. {o.opportunityNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                      Item {o.itemNumber}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold line-clamp-2">{o.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{o.supplier}</p>
                </div>
                <button
                  onClick={() => {
                    deleteOpportunity(o.id);
                    onChange();
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/50 p-2">
                  <div className="text-muted-foreground">Venda YGX</div>
                  <div className="font-mono font-semibold">{formatBRL(o.saleValueYGX)}</div>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <div className="text-muted-foreground">Custo</div>
                  <div className="font-mono font-semibold">{formatBRL(o.costValue)}</div>
                </div>
              </div>

              <div className="border-t border-border pt-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Lucro
                  </div>
                  <div
                    className={`text-lg font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {formatBRL(profit)}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold ${margin >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {margin.toFixed(1)}%
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground">
                {new Date(o.createdAt).toLocaleString("pt-BR")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
