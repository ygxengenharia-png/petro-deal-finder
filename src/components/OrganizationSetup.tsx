import { useState, type FormEvent } from "react";
import { acceptInvite, createOrganization } from "@/lib/org-store";
import { logout } from "@/lib/auth";

type Mode = "choose" | "create" | "join";

export function OrganizationSetup({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "create") {
        if (!name.trim()) throw new Error("Informe o nome da empresa.");
        await createOrganization(name.trim());
      } else if (mode === "join") {
        const c = code.trim().replace(/\D/g, "");
        if (c.length !== 6) throw new Error("O código deve ter 6 dígitos.");
        await acceptInvite(c);
      }
      onReady();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-2xl">
            🏢
          </div>
          <h1 className="mt-3 text-xl font-bold">Sua empresa</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Para compartilhar histórico e fornecedores com colegas, vincule-se a uma empresa.
          </p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full px-4 py-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity text-left"
            >
              ➕ Criar uma nova empresa
              <div className="text-[11px] opacity-80 font-normal mt-0.5">
                Você será o owner. Seus registros antigos serão migrados.
              </div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full px-4 py-3 rounded-md border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors text-left"
            >
              🔑 Entrar com código de convite
              <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                Use o código de 6 dígitos enviado por um colega.
              </div>
            </button>
          </div>
        )}

        {mode !== "choose" && (
          <form onSubmit={submit} className="space-y-3">
            {mode === "create" ? (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nome da empresa</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ex.: YGX Comércio"
                  maxLength={120}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Código de convite</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode("choose"); setError(null); }}
                className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-muted"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Aguarde..." : mode === "create" ? "Criar empresa" : "Entrar"}
              </button>
            </div>
          </form>
        )}

        <button
          onClick={() => void logout()}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Sair desta conta
        </button>
      </div>
    </main>
  );
}
