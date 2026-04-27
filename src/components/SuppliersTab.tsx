import { useEffect, useRef, useState } from "react";
import {
  createSupplier,
  deleteSupplier,
  deleteSupplierFile,
  loadSuppliers,
  updateSupplier,
  uploadSupplierFile,
  type Supplier,
} from "@/lib/suppliers-store";

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const refresh = async () => {
    setLoading(true);
    setSuppliers(await loadSuppliers());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">Fornecedores</h2>
          <p className="text-xs text-muted-foreground">
            Cadastre fábricas e fornecedores, com logotipo, descrição e PDFs anexos.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          ➕ Novo fornecedor
        </button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {!loading && suppliers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="text-4xl mb-3">🏭</div>
          <h3 className="text-lg font-semibold">Nenhum fornecedor cadastrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Novo fornecedor" para criar o primeiro perfil.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => (
          <SupplierCard
            key={s.id}
            supplier={s}
            onEdit={() => setEditing(s)}
            onChanged={refresh}
          />
        ))}
      </div>

      {creating && (
        <SupplierFormModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {editing && (
        <SupplierFormModal
          supplier={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function SupplierCard({
  supplier,
  onEdit,
  onChanged,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    await uploadSupplierFile(supplier.id, file);
    setUploading(false);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {supplier.logoUrl ? (
          <img
            src={supplier.logoUrl}
            alt={`Logo ${supplier.name}`}
            className="w-14 h-14 rounded-md object-cover border border-border bg-muted shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-xl shrink-0">
            🏭
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
          {supplier.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
              {supplier.description}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            📎 Arquivos ({supplier.files?.length ?? 0})
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {uploading ? "Enviando…" : "+ PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
        <ul className="space-y-1 max-h-32 overflow-auto">
          {(supplier.files ?? []).map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 text-xs rounded bg-muted/40 px-2 py-1"
            >
              <a
                href={f.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-info hover:underline flex-1 min-w-0"
                title={f.fileName}
              >
                📄 {f.fileName}
              </a>
              <button
                onClick={async () => {
                  if (confirm(`Excluir ${f.fileName}?`)) {
                    await deleteSupplierFile(f);
                    onChanged();
                  }
                }}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title="Excluir"
              >
                ✕
              </button>
            </li>
          ))}
          {(!supplier.files || supplier.files.length === 0) && (
            <li className="text-[11px] text-muted-foreground italic px-1">
              Nenhum PDF anexado.
            </li>
          )}
        </ul>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={async () => {
            if (confirm(`Excluir fornecedor "${supplier.name}"? Os arquivos também serão removidos.`)) {
              await deleteSupplier(supplier.id);
              onChanged();
            }
          }}
          className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          🗑️
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
        >
          ✏️ Editar
        </button>
      </div>
    </div>
  );
}

function SupplierFormModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: Supplier;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [description, setDescription] = useState(supplier?.description ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (supplier) {
      await updateSupplier(supplier.id, {
        name: name.trim(),
        description: description.trim(),
        logoFile,
        clearLogo: clearLogo && !logoFile,
      });
    } else {
      await createSupplier({
        name: name.trim(),
        description: description.trim(),
        logoFile,
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl p-5 w-full max-w-md shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold">
          {supplier ? "Editar fornecedor" : "Novo fornecedor"}
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-semibold">Nome da empresa *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Fábrica Aço Brasil"
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Materiais, contato, observações…"
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">Logotipo (opcional)</label>
          {supplier?.logoUrl && !logoFile && !clearLogo && (
            <div className="flex items-center gap-2 mb-1">
              <img src={supplier.logoUrl} alt="" className="w-10 h-10 rounded object-cover border border-border" />
              <button
                type="button"
                onClick={() => setClearLogo(true)}
                className="text-xs text-destructive hover:underline"
              >
                Remover logo atual
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          {logoFile && (
            <p className="text-[11px] text-muted-foreground">Selecionado: {logoFile.name}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="px-4 py-1.5 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
