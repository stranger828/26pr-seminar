import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

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
  assetPath?: string;
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
  created_at: Date | string;
};

const tableName = "gallery_items";

let cachedPool: Pool | null = null;

const taskTitles: Record<GalleryTaskStep, string> = {
  "1": "AI로 글쓰기",
  "2": "AI로 이미지 만들기",
  "3": "AI로 오디오 만들기",
  "4": "AI로 영상 만들기",
};

export async function listGalleryItems() {
  if (!hasDatabaseConfig()) {
    return [];
  }

  const { rows } = await getGalleryPool().query<GalleryItemRow>(
    `select *
       from ${tableName}
      order by created_at desc`,
  );

  return rows.map(mapRowToGalleryItem);
}

export async function deleteGalleryItem(itemId: string) {
  if (!hasDatabaseConfig()) {
    throw new Error("DB 설정이 없어 결과물을 삭제할 수 없습니다.");
  }

  const pool = getGalleryPool();
  const { rows } = await pool.query<GalleryItemRow>(
    `select *
       from ${tableName}
      where id = $1
      limit 1`,
    [itemId],
  );

  const data = rows[0];
  if (!data) {
    throw new Error("삭제할 결과물이 없습니다.");
  }

  if (data.asset_path) {
    await deleteAsset(data.asset_path);
  }

  await pool.query(
    `delete from ${tableName}
      where id = $1`,
    [itemId],
  );

  return mapRowToGalleryItem(data);
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
  const { rows } = await getGalleryPool().query<GalleryItemRow>(
    `select *
       from ${tableName}
      where external_job_id = $1
      limit 1`,
    [externalJobId],
  );

  return rows[0] ? mapRowToGalleryItem(rows[0]) : null;
}

async function insertGalleryItem(
  row: Omit<GalleryItemRow, "created_at">,
) {
  const { rows } = await getGalleryPool().query<GalleryItemRow>(
    `insert into ${tableName} (
       id,
       task_step,
       task_title,
       type,
       provider,
       external_job_id,
       prompt,
       secondary_prompt,
       result_text,
       asset_path,
       mime_type
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
     )
     returning *`,
    [
      row.id,
      row.task_step,
      row.task_title,
      row.type,
      row.provider,
      row.external_job_id,
      row.prompt,
      row.secondary_prompt,
      row.result_text,
      row.asset_path,
      row.mime_type,
    ],
  );

  return mapRowToGalleryItem(rows[0]);
}

async function uploadAsset(
  assetPath: string,
  bytes: Buffer,
  mimeType: string,
) {
  void mimeType;
  const filePath = resolveAssetFilePath(assetPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes, { flag: "wx" });
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
    assetPath: row.asset_path || undefined,
    mimeType: row.mime_type || undefined,
    createdAt: formatTimestamp(row.created_at),
  };
}

function getPublicAssetUrl(assetPath: string) {
  const baseUrl = process.env.GALLERY_ASSET_BASE_URL;

  if (!baseUrl) {
    throw new Error("GALLERY_ASSET_BASE_URL을 먼저 설정해주세요.");
  }

  return `${baseUrl.replace(/\/+$/, "")}/${assetPath}`;
}

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

function getGalleryPool() {
  if (cachedPool) {
    return cachedPool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL을 먼저 설정해주세요.");
  }

  cachedPool = new Pool({ connectionString });
  return cachedPool;
}

async function deleteAsset(assetPath: string) {
  try {
    await fs.unlink(resolveAssetFilePath(assetPath));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }

    throw new Error("파일 삭제에 실패했습니다.");
  }
}

function resolveAssetFilePath(assetPath: string) {
  const assetDir = process.env.GALLERY_ASSET_DIR;

  if (!assetDir) {
    throw new Error("GALLERY_ASSET_DIR을 먼저 설정해주세요.");
  }

  const root = path.resolve(assetDir);
  const filePath = path.resolve(root, assetPath);

  if (filePath !== root && filePath.startsWith(`${root}${path.sep}`)) {
    return filePath;
  }

  throw new Error("저장할 파일 경로가 올바르지 않습니다.");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
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
