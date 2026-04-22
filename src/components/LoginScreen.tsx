import { useState, type FormEvent } from "react";
import { login } from "@/lib/auth";

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (login(user, pass)) {
      onSuccess();
    } else {
      setError("Usuário ou senha incorretos.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg space-y-5"
      >
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-2xl">
            R
          </div>
          <h1 className="mt-3 text-xl font-bold">RankingPlay</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Ferramenta interna YGX · Acesso restrito
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Usuário</label>
            <input
              autoFocus
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="YGX..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Senha</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="••••••"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
