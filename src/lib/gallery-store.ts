import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

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

const dataDir = path.join(process.cwd(), "data");
const publicDir = path.join(process.cwd(), "public");
const metadataPath = path.join(dataDir, "gallery-items.json");
const assetsRootDir = path.join(publicDir, "gallery-assets");

const taskTitles: Record<GalleryTaskStep, string> = {
  "1": "AI로 글쓰기",
  "2": "AI로 이미지 만들기",
  "3": "AI로 오디오 만들기",
  "4": "AI로 영상 만들기",
};

export async function listGalleryItems() {
  await ensureStore();
  const raw = await fs.readFile(metadataPath, "utf8");
  const items = JSON.parse(raw) as GalleryItem[];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveTextGalleryItem(input: {
  taskStep: GalleryTaskStep;
  provider: "openai" | "gemini";
  prompt: string;
  resultText: string;
}) {
  return appendItem({
    id: randomUUID(),
    taskStep: input.taskStep,
    taskTitle: taskTitles[input.taskStep],
    type: "text",
    provider: input.provider,
    prompt: input.prompt.trim(),
    resultText: input.resultText.trim(),
    createdAt: new Date().toISOString(),
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
  const fileName = buildFileName(input.taskStep, input.provider, parsed.extension);
  const folderPath = path.join(assetsRootDir, `task-${input.taskStep}`);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, fileName), parsed.bytes);

  return appendItem({
    id: randomUUID(),
    taskStep: input.taskStep,
    taskTitle: taskTitles[input.taskStep],
    type: input.type,
    provider: input.provider,
    prompt: input.prompt.trim(),
    secondaryPrompt: input.secondaryPrompt?.trim() || undefined,
    assetUrl: `/gallery-assets/task-${input.taskStep}/${fileName}`,
    mimeType: parsed.mimeType,
    createdAt: new Date().toISOString(),
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
  const items = await listGalleryItems();
  const existingItem = input.externalJobId
    ? items.find(
        (item) =>
          item.type === "video" &&
          item.provider === input.provider &&
          item.externalJobId === input.externalJobId,
      )
    : undefined;

  if (existingItem) {
    return existingItem;
  }

  const extension = extensionForMimeType(input.mimeType);
  const fileName = buildFileName(input.taskStep, input.provider, extension);
  const folderPath = path.join(assetsRootDir, `task-${input.taskStep}`);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, fileName), input.bytes);

  return appendItem({
    id: randomUUID(),
    taskStep: input.taskStep,
    taskTitle: taskTitles[input.taskStep],
    type: input.type,
    provider: input.provider,
    externalJobId: input.externalJobId,
    prompt: input.prompt.trim(),
    secondaryPrompt: input.secondaryPrompt?.trim() || undefined,
    assetUrl: `/gallery-assets/task-${input.taskStep}/${fileName}`,
    mimeType: input.mimeType,
    createdAt: new Date().toISOString(),
  });
}

async function appendItem(item: GalleryItem) {
  const items = await listGalleryItems();
  items.unshift(item);
  await fs.writeFile(metadataPath, JSON.stringify(items, null, 2), "utf8");
  return item;
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(assetsRootDir, { recursive: true });

  try {
    await fs.access(metadataPath);
  } catch {
    await fs.writeFile(metadataPath, "[]", "utf8");
  }
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

function buildFileName(step: GalleryTaskStep, provider: string, extension: string) {
  return `task-${step}-${provider}-${Date.now()}.${extension}`;
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
