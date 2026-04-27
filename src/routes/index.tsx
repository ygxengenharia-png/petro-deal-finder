import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  findYGX,
  parsePetronectCSV,
  readFileAsLatin1,
  type ParseResult,
} from "@/lib/petronect-parser";
import { loadOpportunities, type Opportunity } from "@/lib/history-store";
import { isAuthenticated, logout } from "@/lib/auth";
import { RankingItemCard } from "@/components/RankingItemCard";
import { SaveOpportunityModal } from "@/components/SaveOpportunityModal";
import { BulkSaveModal } from "@/components/BulkSaveModal";
import { HistoryTab } from "@/components/HistoryTab";
import { LoginScreen } from "@/components/LoginScreen";
import { SuppliersTab } from "@/components/SuppliersTab";

export const Route = createFileRoute("/")({
  component: RankingPlay,
  head: () => ({
    meta: [
      { title: "RankingPlay — Análise de Lances Petronect" },
      {
        name: "description",
        content:
          "Analise rankings de fornecedores Petronect e salve oportunidades com cálculo automático de lucro.",
      },
    ],
  }),
});

type Tab = "analyzer" | "history" | "suppliers";

function RankingPlay() {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("analyzer");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Opportunity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<{
    title: string;
    itemNumber: string;
    supplier: string;
    opportunityNumber?: string;
    suggestedSale?: number;
  } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleSelected = (itemNumber: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemNumber)) next.delete(itemNumber);
      else next.add(itemNumber);
      return next;
    });

  useEffect(() => {
    setAuthed(isAuthenticated());
    setAuthChecked(true);
    void refreshHistory();
  }, []);

  const refreshHistory = async () => {
    const list = await loadOpportunities();
    setHistory(list);
  };

  const stats = useMemo(() => {
    if (!result) return null;
    const totalBids = result.items.reduce((s, i) => s + i.bids.length, 0);
    let ygxWins = 0;
    let ygxParticipations = 0;
    let ygxWinTotal = 0;
    for (const item of result.items) {
      const ygx = findYGX(item);
      if (!ygx) continue;
      ygxParticipations++;
      if (ygx.position === 1) {
        ygxWins++;
        ygxWinTotal += ygx.value;
      }
    }
    return {
      items: result.items.length,
      bids: totalBids,
      ygxWins,
      ygxParticipations,
      ygxWinTotal,
    };
  }, [result]);

  if (!authChecked) return null;
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await readFileAsLatin1(file);
      const parsed = parsePetronectCSV(text);
      setResult(parsed);
      setFileName(file.name);
      setSelected(new Set());
      if (parsed.items.length === 0) {
        setError(
          "Nenhum item válido encontrado. Verifique se o CSV é a exportação Petronect (delimitador ;).",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao ler arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-lg">
              R
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">RankingPlay</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Análise de lances · Petronect
              </p>
            </div>
          </div>
          <nav className="flex gap-1 p-1 rounded-lg bg-muted">
            <TabButton active={tab === "analyzer"} onClick={() => setTab("analyzer")}>
              Analisador
            </TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>
              Histórico
              {history.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-info text-info-foreground text-[10px] font-bold">
                  {history.length}
                </span>
              )}
            </TabButton>
          </nav>
          <button
            onClick={() => {
              logout();
              setAuthed(false);
            }}
            className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border"
            title="Sair"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {tab === "analyzer" && (
          <>
            {/* Upload */}
            <section
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-xl border-2 border-dashed border-border bg-card/50 p-6 sm:p-8 text-center hover:border-info/60 transition-colors"
            >
              <div className="text-4xl mb-3">📊</div>
              <h2 className="text-base font-semibold">Importar exportação Petronect</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Arraste o CSV aqui ou selecione o arquivo (delimitador <code>;</code>, ISO-8859-1).
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="px-4 py-2 rounded-md bg-info text-info-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Selecionar arquivo
                </button>
                {result && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setFileName("");
                      setError(null);
                    }}
                    className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
              {fileName && (
                <p className="text-xs text-muted-foreground mt-3">
                  📄 {fileName}
                </p>
              )}
            </section>

            {loading && (
              <div className="text-center text-sm text-muted-foreground">Processando…</div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {result && stats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Itens" value={String(stats.items)} />
                  <StatCard label="Lances" value={String(stats.bids)} />
                  <StatCard
                    label="YGX venceu"
                    value={`${stats.ygxWins}/${stats.ygxParticipations}`}
                    highlight={stats.ygxWins > 0 ? "success" : stats.ygxParticipations > 0 ? "warning" : "muted"}
                  />
                  <StatCard
                    label="Soma vitórias YGX"
                    value={stats.ygxWinTotal.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                    highlight={stats.ygxWinTotal > 0 ? "success" : "muted"}
                  />
                </div>

                {result.detectedOpportunity && (
                  <div className="rounded-md bg-info/10 border border-info/30 px-3 py-2 text-xs text-info">
                    Nº de oportunidade detectado: <strong>{result.detectedOpportunity}</strong>
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
                    {result.warnings.map((w, i) => (
                      <div key={i}>⚠️ {w}</div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-[73px] z-[5]">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary cursor-pointer"
                      checked={
                        result.items.length > 0 && selected.size === result.items.length
                      }
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            selected.size > 0 && selected.size < result.items.length;
                      }}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? new Set(result.items.map((i) => i.itemNumber))
                            : new Set(),
                        )
                      }
                    />
                    Selecionar tudo
                    <span className="text-xs text-muted-foreground font-normal">
                      ({selected.size}/{result.items.length})
                    </span>
                  </label>
                  <button
                    disabled={selected.size === 0}
                    onClick={() => setBulkOpen(true)}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    💾 Salvar selecionados ({selected.size})
                  </button>
                </div>

                <div className="space-y-4">
                  {result.items.map((item) => (
                    <div key={item.itemNumber} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-5 w-5 h-5 accent-primary cursor-pointer shrink-0"
                        checked={selected.has(item.itemNumber)}
                        onChange={() => toggleSelected(item.itemNumber)}
                        title="Selecionar para salvar em lote"
                      />
                      <div className="flex-1 min-w-0">
                        <RankingItemCard
                          item={item}
                          onSave={(d) => {
                            setModalDefaults({
                              ...d,
                              opportunityNumber:
                                d.opportunityNumber ?? result.detectedOpportunity,
                            });
                            setModalOpen(true);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "history" && (
          <HistoryTab opportunities={history} onChange={refreshHistory} />
        )}
      </div>

      {modalDefaults && (
        <SaveOpportunityModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={refreshHistory}
          defaults={modalDefaults}
        />
      )}

      {result && (
        <BulkSaveModal
          open={bulkOpen}
          items={result.items.filter((i) => selected.has(i.itemNumber))}
          defaultOpportunityNumber={result.detectedOpportunity}
          onClose={() => setBulkOpen(false)}
          onSaved={(count) => {
            refreshHistory();
            setSelected(new Set());
            setTab("history");
            console.log(`${count} oportunidades salvas`);
          }}
        />
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "warning" | "muted";
}) {
  const valueColor =
    highlight === "success"
      ? "text-success"
      : highlight === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold mt-0.5 truncate ${valueColor}`}>{value}</div>
    </div>
  );
}
