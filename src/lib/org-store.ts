import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "owner" | "admin" | "member";

export type Organization = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
};

export type OrgMember = {
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: number;
};

export type OrgInvite = {
  id: string;
  organizationId: string;
  code: string;
  role: OrgRole;
  createdBy: string;
  expiresAt: number;
  usedAt: number | null;
  usedBy: string | null;
  createdAt: number;
};

export async function getCurrentOrgId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("current_user_org_id");
  if (error) {
    console.error("current_user_org_id", error);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function loadOrganization(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function loadMyRole(orgId: string): Promise<OrgRole | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}

export async function loadMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("loadMembers", error);
    return [];
  }
  return (data ?? []).map((m) => ({
    organizationId: m.organization_id,
    userId: m.user_id,
    role: m.role as OrgRole,
    createdAt: new Date(m.created_at).getTime(),
  }));
}

export async function loadInvites(orgId: string): Promise<OrgInvite[]> {
  const { data, error } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("loadInvites", error);
    return [];
  }
  return (data ?? []).map((i) => ({
    id: i.id,
    organizationId: i.organization_id,
    code: i.code,
    role: i.role as OrgRole,
    createdBy: i.created_by,
    expiresAt: new Date(i.expires_at).getTime(),
    usedAt: i.used_at ? new Date(i.used_at).getTime() : null,
    usedBy: i.used_by,
    createdAt: new Date(i.created_at).getTime(),
  }));
}

export async function createOrganization(name: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("create_organization", { _name: name });
  if (error) {
    console.error("create_organization", error);
    throw error;
  }
  return data as string;
}

export async function createInvite(
  orgId: string,
  role: OrgRole = "member",
): Promise<string | null> {
  const { data, error } = await supabase.rpc("create_invite", {
    _org_id: orgId,
    _role: role,
  });
  if (error) {
    console.error("create_invite", error);
    throw error;
  }
  return data as string;
}

export async function acceptInvite(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("accept_invite", { _code: code });
  if (error) {
    console.error("accept_invite", error);
    throw error;
  }
  return data as string;
}

export async function deleteInvite(id: string) {
  const { error } = await supabase.from("organization_invites").delete().eq("id", id);
  if (error) console.error("deleteInvite", error);
}

export async function removeMember(orgId: string, userId: string) {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) console.error("removeMember", error);
}
