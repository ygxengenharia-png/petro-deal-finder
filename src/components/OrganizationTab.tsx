import { useEffect, useState } from "react";
import {
  createInvite,
  deleteInvite,
  loadInvites,
  loadMembers,
  loadMyRole,
  loadOrganization,
  removeMember,
  type OrgInvite,
  type OrgMember,
  type Organization,
  type OrgRole,
} from "@/lib/org-store";
import { supabase } from "@/integrations/supabase/client";

export function OrganizationTab({ orgId, currentUserId }: { orgId: string; currentUserId: string }) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [newRole, setNewRole] = useState<OrgRole>("member");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [o, m, i, r] = await Promise.all([
      loadOrganization(orgId),
      loadMembers(orgId),
      loadInvites(orgId),
      loadMyRole(orgId),
    ]);
    setOrg(o);
    setMembers(m);
    setInvites(i);
    setMyRole(r);
  };

  useEffect(() => { void refresh(); }, [orgId]);

  const isAdmin = myRole === "owner" || myRole === "admin";

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      await createInvite(orgId, newRole);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar convite.");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">{org?.name ?? "..."}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Seu papel: <strong className="text-foreground">{myRole ?? "—"}</strong>
        </p>
      </section>

      {isAdmin && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Convidar colega</h3>
          <p className="text-xs text-muted-foreground">
            Gere um código de 6 dígitos. Seu colega entra na conta dele e digita esse código em "Entrar com código de convite". O código vale por 7 dias.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-[11px] uppercase text-muted-foreground">Papel</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as OrgRole)}
                className="block mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="member">Member (edita dados)</option>
                <option value="admin">Admin (edita + convida)</option>
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {generating ? "Gerando..." : "🎟️ Gerar convite"}
            </button>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2">
              {error}
            </div>
          )}

          {invites.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Convites</h4>
              {invites.map((inv) => {
                const expired = inv.expiresAt < Date.now();
                const status = inv.usedAt ? "usado" : expired ? "expirado" : "ativo";
                return (
                  <div key={inv.id} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
                    <code className="px-2 py-1 rounded bg-muted text-base font-mono tracking-widest">{inv.code}</code>
                    <span className="text-[10px] uppercase text-muted-foreground">{inv.role}</span>
                    <span className={`text-[10px] uppercase ${inv.usedAt ? "text-success" : expired ? "text-destructive" : "text-info"}`}>
                      {status}
                    </span>
                    <div className="ml-auto flex gap-1">
                      {!inv.usedAt && !expired && (
                        <button onClick={() => copyCode(inv.code)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">
                          Copiar
                        </button>
                      )}
                      <button
                        onClick={async () => { await deleteInvite(inv.id); void refresh(); }}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-destructive/10 text-destructive"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Membros ({members.length})</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-md border border-border bg-background p-2">
              <div>
                <div className="text-sm font-mono">{m.userId === currentUserId ? "Você" : m.userId.slice(0, 8) + "…"}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{m.role}</div>
              </div>
              {isAdmin && m.userId !== currentUserId && m.role !== "owner" && (
                <button
                  onClick={async () => {
                    if (!confirm("Remover este membro? Ele perderá acesso aos dados da empresa.")) return;
                    await removeMember(orgId, m.userId);
                    void refresh();
                  }}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-destructive/10 text-destructive"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
