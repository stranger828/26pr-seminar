import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient<any> | null = null;

export function hasSupabaseConfig() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseAdmin() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 먼저 설정해주세요.",
    );
  }

  cachedClient = createClient<any>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export function getGalleryBucketName() {
  return process.env.SUPABASE_GALLERY_BUCKET || "gallery-assets";
}
