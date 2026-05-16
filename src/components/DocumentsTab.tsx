import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDocumentDownloadUrl,
  createDocumentFolder,
  deleteDocument,
  deleteDocumentFolder,
  formatBytes,
  loadDocumentLibrary,
  updateDocument,
  uploadDocument,
  type DocumentFolder,
  type StoredDocument,
} from "@/lib/document-store";
import {
  Download,
  Edit3,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type EditorState =
  | { mode: "upload"; document?: never }
  | { mode: "edit"; document: StoredDocument }
  | null;

export function DocumentsTab() {
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [currentFolder, setCurrentFolder] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const library = await loadDocumentLibrary();
    setFolders(library.folders);
    setDocuments(library.documents);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const childFolders = useMemo(
    () => folders.filter((folder) => folder.parentPath === currentFolder),
    [folders, currentFolder],
  );

  const visibleDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((document) => {
      const inFolder = document.folderPath === currentFolder;
      if (!term) return inFolder;
      return (
        inFolder &&
        [document.displayName, document.fileName, document.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [documents, currentFolder, search]);

  const folderCrumbs = useMemo(() => {
    if (!currentFolder) return [];
    const parts = currentFolder.split("/");
    return parts.map((part, index) => ({
      name: part,
      path: parts.slice(0, index + 1).join("/"),
    }));
  }, [currentFolder]);

  const totalSize = documents.reduce((sum, document) => sum + (document.fileSize ?? 0), 0);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createDocumentFolder(currentFolder, newFolderName);
    setNewFolderName("");
    setCreatingFolder(false);
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Documentos</h2>
          <p className="text-xs text-muted-foreground">
            Biblioteca organizada por pastas, arquivos nomeados e acesso compartilhado pela empresa.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setCreateMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Criar
          </button>
          {createMenuOpen && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-border bg-card shadow-xl p-1">
              <button
                onClick={() => {
                  setCreateMenuOpen(false);
                  setCreatingFolder(true);
                }}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <FolderPlus className="w-4 h-4 text-primary" />
                <span>
                  <span className="block font-semibold">Criar pasta</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Organizar documentos por assunto.
                  </span>
                </span>
              </button>
              <button
                onClick={() => {
                  setCreateMenuOpen(false);
                  setEditor({ mode: "upload" });
                }}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Upload className="w-4 h-4 text-info" />
                <span>
                  <span className="block font-semibold">Criar arquivo</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Enviar arquivo para esta pasta.
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Pastas" value={String(folders.length)} />
        <SummaryCard label="Documentos" value={String(documents.length)} />
        <SummaryCard label="Volume" value={formatBytes(totalSize)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm min-w-0">
            <button
              onClick={() => setCurrentFolder("")}
              className={`px-2 py-1 rounded-md hover:bg-muted ${
                currentFolder ? "text-muted-foreground" : "font-semibold"
              }`}
            >
              Raiz
            </button>
            {folderCrumbs.map((crumb) => (
              <span key={crumb.path} className="flex items-center gap-1 min-w-0">
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => setCurrentFolder(crumb.path)}
                  className="px-2 py-1 rounded-md hover:bg-muted truncate max-w-[160px]"
                  title={crumb.path}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
          <label className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nesta pasta"
              className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>

        {creatingFolder && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3">
            <Folder className="w-4 h-4 text-primary" />
            <input
              autoFocus
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreateFolder();
                if (event.key === "Escape") setCreatingFolder(false);
              }}
              placeholder="Nome da pasta"
              className="flex-1 min-w-[220px] h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={() => void handleCreateFolder()}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            >
              Criar
            </button>
            <button
              onClick={() => setCreatingFolder(false)}
              className="px-3 py-2 rounded-md border border-border text-sm"
            >
              Cancelar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando documentos...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {childFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.path)}
                  className="group rounded-lg border border-border bg-background p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{folder.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {folder.path}
                        </div>
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        const hasChildren = folders.some(
                          (candidate) => candidate.parentPath === folder.path,
                        );
                        const hasDocuments = documents.some(
                          (candidate) => candidate.folderPath === folder.path,
                        );
                        if (hasChildren || hasDocuments) {
                          alert("Esvazie a pasta antes de excluí-la.");
                          return;
                        }
                        if (confirm(`Excluir a pasta "${folder.name}"?`)) {
                          void deleteDocumentFolder(folder).then(refresh);
                        }
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Excluir pasta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px_150px_112px] gap-3 px-3 py-2 bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Documento</span>
                <span className="hidden sm:block">Tamanho</span>
                <span className="hidden sm:block">Atualizado</span>
                <span className="text-right">Ações</span>
              </div>
              {visibleDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  onEdit={() => setEditor({ mode: "edit", document })}
                  onDeleted={refresh}
                />
              ))}
              {visibleDocuments.length === 0 && childFolders.length === 0 && (
                <div className="py-14 text-center">
                  <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold mt-3">Nenhum documento nesta pasta</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use "Criar" para adicionar uma pasta ou arquivo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editor && (
        <DocumentModal
          mode={editor.mode}
          currentFolder={currentFolder}
          folders={folders}
          document={editor.mode === "edit" ? editor.document : undefined}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function DocumentRow({
  document,
  onEdit,
  onDeleted,
}: {
  document: StoredDocument;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const url = await createDocumentDownloadUrl(document);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px_150px_112px] gap-3 px-3 py-3 border-t border-border items-center">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-md bg-info/10 text-info flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{document.displayName}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {document.description || document.fileName}
          </div>
        </div>
      </div>
      <span className="hidden sm:block text-xs text-muted-foreground">
        {formatBytes(document.fileSize)}
      </span>
      <span className="hidden sm:block text-xs text-muted-foreground">
        {new Date(document.updatedAt).toLocaleDateString("pt-BR")}
      </span>
      <div className="flex justify-end gap-1">
        <button
          onClick={() => void download()}
          disabled={busy}
          className="w-8 h-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted disabled:opacity-50"
          title="Baixar"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted"
          title="Editar"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={async () => {
            if (confirm(`Excluir "${document.displayName}"?`)) {
              await deleteDocument(document);
              onDeleted();
            }
          }}
          className="w-8 h-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DocumentModal({
  mode,
  currentFolder,
  folders,
  document,
  onClose,
  onSaved,
}: {
  mode: "upload" | "edit";
  currentFolder: string;
  folders: DocumentFolder[];
  document?: StoredDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState(document?.displayName ?? "");
  const [description, setDescription] = useState(document?.description ?? "");
  const [folderPath, setFolderPath] = useState(document?.folderPath ?? currentFolder);
  const [saving, setSaving] = useState(false);
  const isUpload = mode === "upload";

  const save = async () => {
    if (isUpload && !file) return;
    setSaving(true);
    try {
      if (isUpload && file) {
        await uploadDocument({ folderPath, file, displayName, description });
      } else if (document) {
        await updateDocument(document.id, { displayName, description, folderPath });
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{isUpload ? "Criar arquivo" : "Editar documento"}</h3>
            <p className="text-xs text-muted-foreground">
              Nomeie e posicione o arquivo dentro da biblioteca da empresa.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Fechar
          </button>
        </div>

        {isUpload && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-border bg-background p-5 text-center hover:border-primary/60 transition-colors"
          >
            <Upload className="w-6 h-6 mx-auto text-primary" />
            <div className="text-sm font-semibold mt-2">
              {file ? file.name : "Selecionar arquivo"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              PDFs, planilhas, imagens e documentos gerais.
            </div>
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                if (selected && !displayName) setDisplayName(selected.name);
              }}
            />
          </button>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Nome no armazenador</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Ex.: Proposta revisada - Petrobras"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Pasta</span>
          <select
            value={folderPath}
            onChange={(event) => setFolderPath(event.target.value)}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Raiz</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.path}>
                {folder.path}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">
            Descrição ou observação
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            placeholder="Detalhes úteis para encontrar o documento depois."
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-border text-sm">
            Cancelar
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || (isUpload && !file)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
