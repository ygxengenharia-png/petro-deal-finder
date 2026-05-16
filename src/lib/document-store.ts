import { supabase } from "@/integrations/supabase/client";

const DOCUMENTS_BUCKET = "company-documents";

export type DocumentFolder = {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  path: string;
  parentPath: string;
  createdAt: number;
  updatedAt: number;
};

export type StoredDocument = {
  id: string;
  organizationId: string;
  userId: string;
  folderPath: string;
  displayName: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: number;
  updatedAt: number;
};

type FolderRow = {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  path: string;
  parent_path: string;
  created_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  organization_id: string;
  user_id: string;
  folder_path: string;
  display_name: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentLibrary = {
  folders: DocumentFolder[];
  documents: StoredDocument[];
};

function folderFromRow(row: FolderRow): DocumentFolder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    name: row.name,
    path: row.path,
    parentPath: row.parent_path,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function documentFromRow(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    folderPath: row.folder_path,
    displayName: row.display_name,
    description: row.description ?? undefined,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function safeSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function buildFolderPath(parentPath: string, name: string): string {
  const cleanName = name.trim().replace(/\/+/g, " ");
  return [parentPath, cleanName].filter(Boolean).join("/");
}

function storageFolderPath(folderPath: string): string {
  return folderPath.split("/").map(safeSegment).filter(Boolean).join("/");
}

async function getUserAndOrg() {
  const [{ data: userData }, { data: orgId, error: orgError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("current_user_org_id"),
  ]);

  if (orgError) throw orgError;
  if (!userData.user || !orgId) throw new Error("Empresa não encontrada para o usuário atual.");

  return { userId: userData.user.id, orgId: orgId as string };
}

export async function loadDocumentLibrary(): Promise<DocumentLibrary> {
  const [{ data: folders, error: foldersError }, { data: documents, error: documentsError }] =
    await Promise.all([
      supabase.from("document_folders").select("*").order("name", { ascending: true }),
      supabase.from("storage_documents").select("*").order("created_at", { ascending: false }),
    ]);

  if (foldersError) {
    console.error("loadDocumentFolders", foldersError);
    return { folders: [], documents: [] };
  }
  if (documentsError) {
    console.error("loadStorageDocuments", documentsError);
    return { folders: ((folders ?? []) as FolderRow[]).map(folderFromRow), documents: [] };
  }

  return {
    folders: ((folders ?? []) as FolderRow[]).map(folderFromRow),
    documents: ((documents ?? []) as DocumentRow[]).map(documentFromRow),
  };
}

export async function createDocumentFolder(parentPath: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Informe o nome da pasta.");

  const { userId, orgId } = await getUserAndOrg();
  const path = buildFolderPath(parentPath, trimmed);

  const { error } = await supabase.from("document_folders").insert({
    organization_id: orgId,
    user_id: userId,
    name: trimmed,
    path,
    parent_path: parentPath,
  } as never);

  if (error) throw error;
}

export async function uploadDocument(input: {
  folderPath: string;
  file: File;
  displayName?: string;
  description?: string;
}): Promise<StoredDocument | null> {
  const { userId, orgId } = await getUserAndOrg();
  const safeName = safeSegment(input.file.name) || "documento";
  const folder = storageFolderPath(input.folderPath);
  const storagePath = [orgId, folder, `${Date.now()}_${crypto.randomUUID()}_${safeName}`]
    .filter(Boolean)
    .join("/");

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      upsert: false,
      contentType: input.file.type || "application/octet-stream",
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("storage_documents")
    .insert({
      organization_id: orgId,
      user_id: userId,
      folder_path: input.folderPath,
      display_name: input.displayName?.trim() || input.file.name,
      description: input.description?.trim() || null,
      file_name: input.file.name,
      file_path: storagePath,
      file_size: input.file.size,
      mime_type: input.file.type || null,
    } as never)
    .select()
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw error;
  }

  return documentFromRow(data as DocumentRow);
}

export async function updateDocument(
  id: string,
  patch: Partial<Pick<StoredDocument, "displayName" | "description" | "folderPath">>,
) {
  const payload: Record<string, unknown> = {};
  if (patch.displayName !== undefined) payload.display_name = patch.displayName.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.folderPath !== undefined) payload.folder_path = patch.folderPath;

  const { error } = await supabase
    .from("storage_documents")
    .update(payload as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(document: StoredDocument) {
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.filePath]);
  const { error } = await supabase.from("storage_documents").delete().eq("id", document.id);
  if (error) throw error;
}

export async function deleteDocumentFolder(folder: DocumentFolder) {
  const { error } = await supabase.from("document_folders").delete().eq("id", folder.id);
  if (error) throw error;
}

export async function createDocumentDownloadUrl(document: StoredDocument) {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.filePath, 60 * 5, {
      download: document.fileName,
    });

  if (error) throw error;
  return data.signedUrl;
}

export function formatBytes(value: number | null): string {
  if (!value) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
