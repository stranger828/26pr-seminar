import { randomUUID } from "node:crypto";
import {
  getGalleryBucketName,
  getSupabaseAdmin,
  hasSupabaseConfig,
} from "@/lib/supabase-admin";

export type GalleryTaskStep = "1" | "2" | "3" | "4";
export type GalleryItemType = "text" | "image" | "audio" | "video";

export type GalleryItem = {
  id: string;
  taskStep: GalleryTaskStep;
  taskTitle: string;
  type: GalleryItemType;
  provider: "openai" | "gemini";
  externalJobId?: string;
  prompt: string;
  secondaryPrompt?: string;
  resultText?: string;
  assetUrl?: string;
  mimeType?: string;
  createdAt: string;
};

type GalleryItemRow = {
  id: string;
  task_step: GalleryTaskStep;
  task_title: string;
  type: GalleryItemType;
  provider: "openai" | "gemini";
  external_job_id: string | null;
  prompt: string;
  secondary_prompt: string | null;
  result_text: string | null;
  asset_path: string | null;
  mime_type: string | null;
  created_at: string;
};

const tableName = "gallery_items";

const taskTitles: Record<GalleryTaskStep, string> = {
  "1": "AI로 글쓰기",
  "2": "AI로 이미지 만들기",
  "3": "AI로 오디오 만들기",
  "4": "AI로 영상 만들기",
};

export async function listGalleryItems() {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`갤러리 목록을 불러오지 못했습니다: ${error.message}`);
  }

  return (data || []).map(mapRowToGalleryItem);
}

export async function saveTextGalleryItem(input: {
  taskStep: GalleryTaskStep;
  provider: "openai" | "gemini";
  prompt: string;
  resultText: string;
}) {
  return insertGalleryItem({
    id: randomUUID(),
    task_step: input.taskStep,
    task_title: taskTitles[input.taskStep],
    type: "text",
    provider: input.provider,
    external_job_id: null,
    prompt: input.prompt.trim(),
    secondary_prompt: null,
    result_text: input.resultText.trim(),
    asset_path: null,
    mime_type: null,
  });
}

export async function saveDataUrlGalleryItem(input: {
  taskStep: GalleryTaskStep;
  provider: "openai" | "gemini";
  prompt: string;
  secondaryPrompt?: string;
  dataUrl: string;
  type: "image" | "audio";
}) {
  const parsed = parseDataUrl(input.dataUrl);
  const assetPath = `${buildAssetPrefix(input.taskStep, input.provider)}/${randomUUID()}.${parsed.extension}`;

  await uploadAsset(assetPath, parsed.bytes, parsed.mimeType);

  return insertGalleryItem({
    id: randomUUID(),
    task_step: input.taskStep,
    task_title: taskTitles[input.taskStep],
    type: input.type,
    provider: input.provider,
    external_job_id: null,
    prompt: input.prompt.trim(),
    secondary_prompt: input.secondaryPrompt?.trim() || null,
    result_text: null,
    asset_path: assetPath,
    mime_type: parsed.mimeType,
  });
}

export async function saveBinaryGalleryItem(input: {
  taskStep: GalleryTaskStep;
  provider: "openai" | "gemini";
  externalJobId?: string;
  prompt: string;
  secondaryPrompt?: string;
  bytes: Buffer;
  mimeType: string;
  type: "video";
}) {
  if (input.externalJobId) {
    const existingItem = await findGalleryItemByExternalJobId(input.externalJobId);

    if (existingItem) {
      return existingItem;
    }
  }

  const assetPath = `${buildAssetPrefix(input.taskStep, input.provider)}/${randomUUID()}.${extensionForMimeType(input.mimeType)}`;

  await uploadAsset(assetPath, input.bytes, input.mimeType);

  return insertGalleryItem({
    id: randomUUID(),
    task_step: input.taskStep,
    task_title: taskTitles[input.taskStep],
    type: input.type,
    provider: input.provider,
    external_job_id: input.externalJobId || null,
    prompt: input.prompt.trim(),
    secondary_prompt: input.secondaryPrompt?.trim() || null,
    result_text: null,
    asset_path: assetPath,
    mime_type: input.mimeType,
  });
}

async function findGalleryItemByExternalJobId(externalJobId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("external_job_id", externalJobId)
    .maybeSingle();

  if (error) {
    throw new Error(`기존 영상 결과를 확인하지 못했습니다: ${error.message}`);
  }

  return data ? mapRowToGalleryItem(data) : null;
}

async function insertGalleryItem(
  row: Omit<GalleryItemRow, "created_at">,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(tableName)
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`갤러리 저장에 실패했습니다: ${error.message}`);
  }

  return mapRowToGalleryItem(data);
}

async function uploadAsset(
  assetPath: string,
  bytes: Buffer,
  mimeType: string,
) {
  const supabase = getSupabaseAdmin();
  const bucket = getGalleryBucketName();
  const { error } = await supabase.storage.from(bucket).upload(assetPath, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`파일 업로드에 실패했습니다: ${error.message}`);
  }
}

function mapRowToGalleryItem(row: GalleryItemRow): GalleryItem {
  return {
    id: row.id,
    taskStep: row.task_step,
    taskTitle: row.task_title,
    type: row.type,
    provider: row.provider,
    externalJobId: row.external_job_id || undefined,
    prompt: row.prompt,
    secondaryPrompt: row.secondary_prompt || undefined,
    resultText: row.result_text || undefined,
    assetUrl: row.asset_path ? getPublicAssetUrl(row.asset_path) : undefined,
    mimeType: row.mime_type || undefined,
    createdAt: row.created_at,
  };
}

function getPublicAssetUrl(assetPath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = getGalleryBucketName();
  const { data } = supabase.storage.from(bucket).getPublicUrl(assetPath);
  return data.publicUrl;
}

function buildAssetPrefix(step: GalleryTaskStep, provider: string) {
  return `task-${step}/${provider}`;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("저장할 데이터 형식을 읽지 못했습니다.");
  }

  const mimeType = match[1];

  return {
    mimeType,
    bytes: Buffer.from(match[2], "base64"),
    extension: extensionForMimeType(mimeType),
  };
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "audio/wav") return "wav";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "video/mp4") return "mp4";
  return "bin";
}
