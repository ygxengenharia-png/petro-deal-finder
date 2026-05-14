import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function logout() {
  await supabase.auth.signOut();
}
