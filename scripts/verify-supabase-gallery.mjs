import { randomUUID } from "node:crypto";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const requiredEnvKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const bucket = process.env.SUPABASE_GALLERY_BUCKET || "gallery-assets";
const missingKeys = requiredEnvKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error(
    `Missing environment variables: ${missingKeys.join(", ")}. Copy them into .env.local first.`,
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const probeId = randomUUID();
const probeAssetPath = `healthcheck/${probeId}.txt`;
const probeContent = Buffer.from(
  `supabase gallery probe ${new Date().toISOString()}\n`,
  "utf8",
);

const summary = [];

try {
  const { error: tableReadError } = await supabase
    .from("gallery_items")
    .select("id", { count: "exact", head: true });

  if (tableReadError) {
    throw new Error(`gallery_items read failed: ${tableReadError.message}`);
  }

  summary.push("gallery_items table read: ok");

  const { error: bucketListError } = await supabase.storage.listBuckets();

  if (bucketListError) {
    throw new Error(`storage bucket lookup failed: ${bucketListError.message}`);
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(probeAssetPath, probeContent, {
      contentType: "text/plain",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`storage upload failed: ${uploadError.message}`);
  }

  summary.push(`storage upload to bucket "${bucket}": ok`);

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(probeAssetPath);

  if (!publicUrlData.publicUrl) {
    throw new Error("public URL generation failed");
  }

  summary.push(`public URL generation: ok (${publicUrlData.publicUrl})`);

  const probeRow = {
    id: probeId,
    task_step: "1",
    task_title: "Supabase 연결 확인",
    type: "text",
    provider: "openai",
    external_job_id: `probe-${probeId}`,
    prompt: "Supabase 연결 확인용 테스트 프롬프트",
    secondary_prompt: null,
    result_text: "Supabase gallery probe row",
    asset_path: probeAssetPath,
    mime_type: "text/plain",
  };

  const { error: insertError } = await supabase
    .from("gallery_items")
    .insert(probeRow);

  if (insertError) {
    throw new Error(`gallery_items insert failed: ${insertError.message}`);
  }

  summary.push("gallery_items insert: ok");

  const { data: insertedRow, error: fetchError } = await supabase
    .from("gallery_items")
    .select("id, asset_path, created_at")
    .eq("id", probeId)
    .single();

  if (fetchError) {
    throw new Error(`gallery_items readback failed: ${fetchError.message}`);
  }

  summary.push(
    `gallery_items readback: ok (${insertedRow.id} at ${insertedRow.created_at})`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Supabase verification failed.",
  );
  process.exitCode = 1;
} finally {
  const cleanupTasks = [
    supabase.from("gallery_items").delete().eq("id", probeId),
    supabase.storage.from(bucket).remove([probeAssetPath]),
  ];

  const [deleteRowResult, deleteAssetResult] = await Promise.all(cleanupTasks);

  if (deleteRowResult.error) {
    console.error(`Cleanup warning (row): ${deleteRowResult.error.message}`);
  } else {
    summary.push("cleanup row: ok");
  }

  if (deleteAssetResult.error) {
    console.error(`Cleanup warning (asset): ${deleteAssetResult.error.message}`);
  } else {
    summary.push("cleanup asset: ok");
  }
}

for (const line of summary) {
  console.log(`- ${line}`);
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
