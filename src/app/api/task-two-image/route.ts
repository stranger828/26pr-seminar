import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { saveDataUrlGalleryItem } from "@/lib/gallery-store";

export const runtime = "nodejs";

type Provider = "openai" | "gemini";

export async function POST(request: Request) {
  const { prompt, provider = "openai" } = (await request.json()) as {
    prompt?: string;
    provider?: Provider;
  };

  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "이미지 설명을 먼저 적어주세요." },
      { status: 400 },
    );
  }

  try {
    const enhancedPrompt = buildImagePrompt(prompt);
    const imageDataUrl =
      provider === "gemini"
        ? await generateWithGemini(enhancedPrompt)
        : await generateWithOpenAI(enhancedPrompt);

    let galleryItem = null;
    let galleryWarning: string | undefined;

    try {
      galleryItem = await saveDataUrlGalleryItem({
        taskStep: "2",
        provider,
        prompt,
        secondaryPrompt: enhancedPrompt,
        dataUrl: imageDataUrl,
        type: "image",
      });
    } catch (galleryError) {
      console.error("Failed to save task 2 gallery item:", galleryError);
      galleryWarning =
        galleryError instanceof Error
          ? galleryError.message
          : "갤러리 저장에 실패했습니다.";
    }

    return NextResponse.json({
      imageDataUrl,
      savedAssetUrl: galleryItem?.assetUrl,
      galleryItem,
      galleryWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function buildImagePrompt(prompt: string) {
  return [
    prompt.trim(),
    "가로형 16:9 영상 표지 이미지 구도로 만들어주세요.",
    "이미지 안에 글자, 문장, 제목, 간판 문구, 로고, 워터마크, 포스터 타이포그래피를 넣지 마세요.",
    "텍스트 오버레이 없이 순수한 이미지 장면만 만들어주세요.",
  ].join(" ");
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1536x1024",
    }),
  });

  const data = (await upstream.json()) as {
    data?: Array<{
      b64_json?: string;
    }>;
  };

  if (!upstream.ok) {
    throw new Error("OpenAI 이미지 응답을 가져오지 못했습니다.");
  }

  const base64 = data.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("OpenAI 이미지 응답에서 데이터를 찾지 못했습니다.");
  }

  return `data:image/png;base64,${base64}`;
}

async function generateWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  const firstCandidate = response.candidates?.[0];
  const parts = firstCandidate?.content?.parts || [];
  const inlineImage = parts.find((part) => part.inlineData?.data)?.inlineData;
  const base64 = inlineImage?.data || response.data;
  const mimeType = inlineImage?.mimeType || "image/png";

  if (!base64) {
    throw new Error("Gemini 이미지 응답에서 데이터를 찾지 못했습니다.");
  }

  return `data:${mimeType};base64,${base64}`;
}
