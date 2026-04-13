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
export const dynamic = "force-dynamic";

type Provider = "openai" | "gemini";

type VideoJobToken = {
  provider: Provider;
  externalJobId: string;
  script: string;
  motionPrompt: string;
};

type JobStartResult = {
  externalJobId: string;
  provider: Provider;
  status: "queued" | "processing";
};

type JobPollResult =
  | {
      status: "queued" | "processing";
      provider: Provider;
    }
  | {
      status: "failed";
      provider: Provider;
      error: string;
    }
  | {
      status: "completed";
      provider: Provider;
      bytes: Buffer;
      mimeType: string;
    };

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
    const job =
      provider === "gemini"
        ? await startGeminiJob(prompt, image)
        : await startOpenAIJob(prompt, image);

    const jobToken = encodeJobToken({
      provider: job.provider,
      externalJobId: job.externalJobId,
      script: script.trim(),
      motionPrompt: motionPrompt.trim(),
    });

    return NextResponse.json({
      status: job.status,
      provider: job.provider,
      jobToken,
      message:
        "영상 생성을 시작했습니다. 잠시 뒤 자동으로 상태를 확인합니다.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "영상 생성을 시작하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobToken = searchParams.get("job");

  if (!jobToken) {
    return NextResponse.json(
      { error: "조회할 작업 정보가 없습니다." },
      { status: 400 },
    );
  }

  let job: VideoJobToken;

  try {
    job = decodeJobToken(jobToken);
  } catch {
    return NextResponse.json(
      { error: "작업 정보를 읽지 못했습니다." },
      { status: 400 },
    );
  }

  try {
    const result =
      job.provider === "gemini"
        ? await getGeminiJobResult(job.externalJobId)
        : await getOpenAIJobResult(job.externalJobId);

    if (result.status === "queued" || result.status === "processing") {
      return NextResponse.json({
        status: result.status,
        provider: result.provider,
        message: "영상을 생성 중입니다. 잠시만 기다려주세요.",
      });
    }

    if (result.status === "failed") {
      return NextResponse.json({
        status: result.status,
        provider: result.provider,
        error: result.error,
      });
    }

    if (result.status !== "completed") {
      throw new Error("영상 완료 상태를 확인하지 못했습니다.");
    }

    let galleryItem = null;
    let galleryWarning: string | undefined;

    try {
      galleryItem = await saveBinaryGalleryItem({
        taskStep: "4",
        provider: result.provider,
        externalJobId: job.externalJobId,
        prompt: job.motionPrompt,
        secondaryPrompt: job.script,
        bytes: result.bytes,
        mimeType: result.mimeType,
        type: "video",
      });
    } catch (galleryError) {
      console.error("Failed to save task 4 gallery item:", galleryError);
      galleryWarning =
        galleryError instanceof Error
          ? galleryError.message
          : "갤러리 저장에 실패했습니다.";
    }

    return NextResponse.json({
      status: "completed",
      provider: result.provider,
      videoUrl: galleryItem?.assetUrl,
      galleryItem,
      galleryWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "영상 상태를 확인하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

async function startOpenAIJob(
  prompt: string,
  image: { mimeType: string; bytes: Buffer },
): Promise<JobStartResult> {
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

  return {
    externalJobId: createData.id,
    provider: "openai",
    status:
      createData.status === "succeeded" ? "processing" : mapPendingStatus(createData.status),
  };
}

async function getOpenAIJobResult(externalJobId: string): Promise<JobPollResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const retrieveResponse = await fetch(
    `https://api.openai.com/v1/videos/${externalJobId}`,
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

  const status = retrieveData.status || "failed";

  if (status === "queued") {
    return { status: "queued", provider: "openai" };
  }

  if (status === "in_progress") {
    return { status: "processing", provider: "openai" };
  }

  if (status === "failed" || status === "cancelled") {
    return {
      status: "failed",
      provider: "openai",
      error: retrieveData.error?.message || "OpenAI 영상 생성이 실패했습니다.",
    };
  }

  const contentResponse = await fetch(
    `https://api.openai.com/v1/videos/${externalJobId}/content`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!contentResponse.ok) {
    throw new Error("OpenAI 생성 영상을 다운로드하지 못했습니다.");
  }

  return {
    status: "completed",
    provider: "openai",
    bytes: Buffer.from(await contentResponse.arrayBuffer()),
    mimeType: "video/mp4",
  };
}

async function startGeminiJob(
  prompt: string,
  image: { mimeType: string; bytes: Buffer },
): Promise<JobStartResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_VIDEO_MODEL || "veo-3.1-generate-preview";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const operation = await ai.models.generateVideos({
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

  if (!operation.name) {
    throw new Error("Gemini 영상 작업 정보를 받지 못했습니다.");
  }

  return {
    externalJobId: operation.name,
    provider: "gemini",
    status: operation.done ? "processing" : "queued",
  };
}

async function getGeminiJobResult(externalJobId: string): Promise<JobPollResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const operation = await ai.operations.getVideosOperation({
    operation: { name: externalJobId } as Parameters<
      typeof ai.operations.getVideosOperation
    >[0]["operation"],
  });

  if (!operation.done) {
    return { status: "processing", provider: "gemini" };
  }

  const video = operation.response?.generatedVideos?.[0]?.video;

  if (!video?.videoBytes) {
    return {
      status: "failed",
      provider: "gemini",
      error: "Gemini 영상 응답에서 결과 파일을 찾지 못했습니다.",
    };
  }

  return {
    status: "completed",
    provider: "gemini",
    bytes: Buffer.from(video.videoBytes, "base64"),
    mimeType: video.mimeType || "video/mp4",
  };
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

function encodeJobToken(job: VideoJobToken) {
  return Buffer.from(JSON.stringify(job), "utf8").toString("base64url");
}

function decodeJobToken(jobToken: string) {
  return JSON.parse(
    Buffer.from(jobToken, "base64url").toString("utf8"),
  ) as VideoJobToken;
}

function mapPendingStatus(status?: string) {
  return status === "in_progress" ? "processing" : "queued";
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

    await execFileAsync("ffmpeg", [
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
  } catch (error) {
    console.warn("Failed to normalize OpenAI reference image, using original:", error);

    return image;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
