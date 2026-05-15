import { supabase } from "@/integrations/supabase/client";

export type SupplierFileCategory = "certificate" | "catalog" | "document";

export type SupplierFile = {
  id: string;
  supplierId: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  category: SupplierFileCategory;
  createdAt: number;
  publicUrl: string;
};

export type Supplier = {
  id: string;
  name: string;
  description?: string;
  country?: string;
  logoUrl?: string;
  createdAt: number;
  updatedAt: number;
  files?: SupplierFile[];
};

const FILES_BUCKET = "supplier-files";
const LOGOS_BUCKET = "supplier-logos";

function publicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function loadSuppliers(): Promise<Supplier[]> {
  const { data: supRows, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("loadSuppliers", error);
    return [];
  }
  const { data: fileRows } = await supabase
    .from("supplier_files")
    .select("*")
    .order("created_at", { ascending: false });

  const filesBySupplier = new Map<string, SupplierFile[]>();
  (fileRows ?? []).forEach((f) => {
    const arr = filesBySupplier.get(f.supplier_id) ?? [];
    arr.push({
      id: f.id,
      supplierId: f.supplier_id,
      fileName: f.file_name,
      filePath: f.file_path,
      fileSize: f.file_size as number | null,
      category: ((f as { category?: string }).category as SupplierFileCategory) ?? "document",
      createdAt: new Date(f.created_at).getTime(),
      publicUrl: publicUrl(FILES_BUCKET, f.file_path),
    });
    filesBySupplier.set(f.supplier_id, arr);
  });

  return (supRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? undefined,
    country: (s as { country?: string | null }).country ?? undefined,
    logoUrl: s.logo_url ?? undefined,
    createdAt: new Date(s.created_at).getTime(),
    updatedAt: new Date(s.updated_at).getTime(),
    files: filesBySupplier.get(s.id) ?? [],
  }));
}

export async function createSupplier(input: {
  name: string;
  description?: string;
  country?: string;
  logoFile?: File | null;
}): Promise<Supplier | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const userId = u.user.id;

  let logo_url: string | null = null;
  if (input.logoFile) {
    const ext = input.logoFile.name.split(".").pop() || "png";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(LOGOS_BUCKET)
      .upload(path, input.logoFile, { upsert: false, contentType: input.logoFile.type });
    if (upErr) {
      console.error("upload logo", upErr);
    } else {
      logo_url = publicUrl(LOGOS_BUCKET, path);
    }
  }

  const { data: orgId } = await supabase.rpc("current_user_org_id");
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      user_id: userId,
      organization_id: (orgId as string | null) ?? null,
      name: input.name,
      description: input.description ?? null,
      country: input.country ?? null,
      logo_url,
    } as never)
    .select()
    .single();
  if (error) {
    console.error("createSupplier", error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    country: (data as { country?: string | null }).country ?? undefined,
    logoUrl: data.logo_url ?? undefined,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    files: [],
  };
}

export async function updateSupplier(
  id: string,
  patch: {
    name?: string;
    description?: string;
    country?: string;
    logoFile?: File | null;
    clearLogo?: boolean;
  },
) {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description || null;
  if (patch.country !== undefined) payload.country = patch.country || null;

  if (patch.clearLogo) {
    payload.logo_url = null;
  } else if (patch.logoFile) {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id ?? "anon";
    const ext = patch.logoFile.name.split(".").pop() || "png";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(LOGOS_BUCKET)
      .upload(path, patch.logoFile, { upsert: false, contentType: patch.logoFile.type });
    if (!upErr) payload.logo_url = publicUrl(LOGOS_BUCKET, path);
  }

  const { error } = await supabase.from("suppliers").update(payload as never).eq("id", id);
  if (error) console.error("updateSupplier", error);
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) console.error("deleteSupplier", error);
}

export async function uploadSupplierFile(
  supplierId: string,
  file: File,
  category: SupplierFileCategory = "document",
): Promise<SupplierFile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const userId = u.user.id;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${supplierId}/${category}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || "application/pdf" });
  if (upErr) {
    console.error("uploadSupplierFile", upErr);
    return null;
  }
  const { data: orgId } = await supabase.rpc("current_user_org_id");
  const { data, error } = await supabase
    .from("supplier_files")
    .insert({
      user_id: userId,
      organization_id: (orgId as string | null) ?? null,
      supplier_id: supplierId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      category,
    } as never)
    .select()
    .single();
  if (error) {
    console.error("insert supplier_files", error);
    return null;
  }
  return {
    id: data.id,
    supplierId: data.supplier_id,
    fileName: data.file_name,
    filePath: data.file_path,
    fileSize: data.file_size as number | null,
    category: ((data as { category?: string }).category as SupplierFileCategory) ?? category,
    createdAt: new Date(data.created_at).getTime(),
    publicUrl: publicUrl(FILES_BUCKET, data.file_path),
  };
}

export async function deleteSupplierFile(file: SupplierFile) {
  await supabase.storage.from(FILES_BUCKET).remove([file.filePath]);
  const { error } = await supabase.from("supplier_files").delete().eq("id", file.id);
  if (error) console.error("deleteSupplierFile", error);
}
