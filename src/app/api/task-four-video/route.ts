import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { saveBinaryGalleryItem } from "@/lib/gallery-store";

export const runtime = "nodejs";
export const maxDuration = 300;

type Provider = "openai" | "gemini";
const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  const { provider = "openai", script, motionPrompt, imageDataUrl } =
    (await request.json()) as {
      provider?: Provider;
      script?: string;
      motionPrompt?: string;
      imageDataUrl?: string;
    };

  if (!script?.trim()) {
    return NextResponse.json(
      { error: "참고할 대사를 먼저 적어주세요." },
      { status: 400 },
    );
  }

  if (!motionPrompt?.trim()) {
    return NextResponse.json(
      { error: "영상 움직임 설명을 먼저 적어주세요." },
      { status: 400 },
    );
  }

  if (!imageDataUrl?.trim()) {
    return NextResponse.json(
      { error: "대표 이미지를 먼저 업로드해주세요." },
      { status: 400 },
    );
  }

  try {
    const image = parseDataUrl(imageDataUrl);
    const prompt = buildVideoPrompt(script, motionPrompt);
    const videoBytes =
      provider === "gemini"
        ? await generateWithGemini(prompt, image)
        : await generateWithOpenAI(prompt, image);
    const galleryItem = await saveBinaryGalleryItem({
      taskStep: "4",
      provider,
      prompt: motionPrompt,
      secondaryPrompt: script,
      bytes: videoBytes,
      mimeType: "video/mp4",
      type: "video",
    });

    return NextResponse.json({
      videoUrl: galleryItem.assetUrl,
      galleryItem,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "영상 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

async function generateWithOpenAI(
  prompt: string,
  image: { mimeType: string; bytes: Buffer },
) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VIDEO_MODEL || "sora-2";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const normalizedImage = await normalizeImageForOpenAI(image);
  const formData = new FormData();
  formData.set("model", model);
  formData.set("prompt", prompt);
  formData.set("size", "1280x720");
  formData.set("seconds", "8");
  formData.set(
    "input_reference",
    new Blob([new Uint8Array(normalizedImage.bytes)], {
      type: normalizedImage.mimeType,
    }),
    `reference.${extensionForMime(normalizedImage.mimeType)}`,
  );

  const createResponse = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const createData = (await createResponse.json()) as {
    id?: string;
    status?: string;
    error?: { message?: string };
  };

  if (!createResponse.ok || !createData.id) {
    throw new Error(
      createData.error?.message || "OpenAI 비디오 생성을 시작하지 못했습니다.",
    );
  }

  let status = createData.status || "queued";
  const videoId = createData.id;
  const startedAt = Date.now();

  while (status === "queued" || status === "in_progress") {
    if (Date.now() - startedAt > 8 * 60 * 1000) {
      throw new Error("OpenAI 영상 생성 시간이 너무 오래 걸려 중단했습니다.");
    }

    await wait(5000);

    const retrieveResponse = await fetch(
      `https://api.openai.com/v1/videos/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    const retrieveData = (await retrieveResponse.json()) as {
      status?: string;
      error?: { message?: string };
    };

    if (!retrieveResponse.ok) {
      throw new Error(
        retrieveData.error?.message || "OpenAI 영상 상태를 확인하지 못했습니다.",
      );
    }

    status = retrieveData.status || "failed";

    if (status === "failed") {
      throw new Error(
        retrieveData.error?.message || "OpenAI 영상 생성이 실패했습니다.",
      );
    }
  }

  const contentResponse = await fetch(
    `https://api.openai.com/v1/videos/${videoId}/content`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!contentResponse.ok) {
    throw new Error("OpenAI 생성 영상을 다운로드하지 못했습니다.");
  }

  return Buffer.from(await contentResponse.arrayBuffer());
}

async function generateWithGemini(
  prompt: string,
  image: { mimeType: string; bytes: Buffer },
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_VIDEO_MODEL || "veo-3.1-generate-preview";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let operation = await ai.models.generateVideos({
    model,
    prompt,
    image: {
      imageBytes: image.bytes.toString("base64"),
      mimeType: image.mimeType,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: 8,
      resolution: "720p",
      personGeneration: "allow_adult",
      numberOfVideos: 1,
    },
  });

  const startedAt = Date.now();

  while (!operation.done) {
    if (Date.now() - startedAt > 8 * 60 * 1000) {
      throw new Error("Gemini 영상 생성 시간이 너무 오래 걸려 중단했습니다.");
    }

    await wait(10000);
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const videoFile = operation.response?.generatedVideos?.[0]?.video;
  const inlineBytes = videoFile?.videoBytes;

  if (!inlineBytes) {
    throw new Error("Gemini 영상 응답에서 결과 파일을 찾지 못했습니다.");
  }

  return Buffer.from(inlineBytes, "base64");
}

function buildVideoPrompt(script: string, motionPrompt: string) {
  return [
    "짧은 한국어 교회 홍보 영상 장면을 만들어주세요.",
    "입력된 대표 이미지의 인물, 공간, 색감, 분위기를 최대한 유지하면서 자연스럽게 움직이는 영상으로 만들어주세요.",
    "과한 장면 전환 없이 한 장면 안에서 부드러운 카메라 움직임과 미세한 인물/배경 움직임 중심으로 구성해주세요.",
    "글자, 자막, 로고, 워터마크, 간판 문구는 영상 안에 넣지 마세요.",
    "전체 분위기는 따뜻하고 신뢰감 있으며 중장년층에게 편안하게 느껴지도록 해주세요.",
    "",
    "[참고 대사]",
    script.trim(),
    "",
    "[원하는 움직임]",
    motionPrompt.trim(),
  ].join("\n");
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("이미지 데이터 형식을 읽지 못했습니다.");
  }

  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function normalizeImageForOpenAI(image: {
  mimeType: string;
  bytes: Buffer;
}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "task4-openai-"));
  const inputPath = path.join(tmpDir, `input.${extensionForMime(image.mimeType)}`);
  const outputPath = path.join(tmpDir, "output.png");

  try {
    await fs.writeFile(inputPath, image.bytes);

    await execFileAsync("/opt/homebrew/bin/ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
      "-frames:v",
      "1",
      outputPath,
    ]);

    const outputBytes = await fs.readFile(outputPath);

    return {
      mimeType: "image/png",
      bytes: outputBytes,
    };
  } catch {
    throw new Error(
      "OpenAI 영상용 이미지 크기를 자동으로 맞추지 못했습니다. 다른 이미지를 시도해주세요.",
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
