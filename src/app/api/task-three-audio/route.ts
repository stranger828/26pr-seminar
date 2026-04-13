import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { saveDataUrlGalleryItem } from "@/lib/gallery-store";

export const runtime = "nodejs";

type Provider = "openai" | "gemini";
type GenderOption = "남자" | "여자";
type AgeOption = "10대" | "20대" | "30대" | "40대";
type ToneOption = "활기찬" | "씩씩한" | "따뜻한" | "조용한" | "차분한";

export async function POST(request: Request) {
  const {
    script,
    styleGuide = "",
    provider = "openai",
    gender = "여자",
    age = "40대",
    tone = "따뜻한",
  } =
    (await request.json()) as {
      script?: string;
      styleGuide?: string;
      provider?: Provider;
      gender?: GenderOption;
      age?: AgeOption;
      tone?: ToneOption;
    };

  if (!script?.trim()) {
    return NextResponse.json(
      { error: "읽어줄 대본을 먼저 적어주세요." },
      { status: 400 },
    );
  }

  try {
    const result =
      provider === "gemini"
        ? await generateWithGemini(script, styleGuide, gender, age, tone)
        : await generateWithOpenAI(script, styleGuide, gender, age, tone);

    const galleryItem = await saveDataUrlGalleryItem({
      taskStep: "3",
      provider,
      prompt: script,
      secondaryPrompt: [
        `성별 느낌: ${gender}`,
        `연령대 느낌: ${age}`,
        `톤: ${tone}`,
        `말투 가이드: ${styleGuide || "기본"}`,
      ].join("\n"),
      dataUrl: result.audioDataUrl,
      type: "audio",
    });

    return NextResponse.json({
      ...result,
      savedAssetUrl: galleryItem.assetUrl,
      galleryItem,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "오디오 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

async function generateWithOpenAI(
  script: string,
  styleGuide: string,
  gender: GenderOption,
  age: AgeOption,
  tone: ToneOption,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_AUDIO_MODEL || "gpt-4o-mini-tts";
  const voice = pickOpenAIVoice(gender, tone);

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      voice,
      input: buildOpenAIScript(script),
      instructions: buildSpeechInstructions(styleGuide, gender, age, tone),
      response_format: "wav",
    }),
  });

  if (!upstream.ok) {
    throw new Error("OpenAI 오디오 응답을 가져오지 못했습니다.");
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const base64 = buffer.toString("base64");

  if (!base64) {
    throw new Error("OpenAI 오디오 응답에서 데이터를 찾지 못했습니다.");
  }

  return {
    audioDataUrl: `data:audio/wav;base64,${base64}`,
    mimeType: "audio/wav",
    fileExtension: "wav",
    providerLabel: "OpenAI",
    appliedVoiceHint: `${voice} voice · ${gender} · ${age} · ${tone}`,
  };
}

async function generateWithGemini(
  script: string,
  styleGuide: string,
  gender: GenderOption,
  age: AgeOption,
  tone: ToneOption,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_AUDIO_MODEL || "gemini-2.5-flash-preview-tts";
  const voiceName = pickGeminiVoice(gender, age, tone);

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: buildGeminiContents(script, styleGuide, gender, age, tone),
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    },
  });

  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64) {
    throw new Error("Gemini 오디오 응답에서 데이터를 찾지 못했습니다.");
  }

  const pcmBuffer = Buffer.from(base64, "base64");
  const wavBuffer = pcmToWav(pcmBuffer);

  return {
    audioDataUrl: `data:audio/wav;base64,${wavBuffer.toString("base64")}`,
    mimeType: "audio/wav",
    fileExtension: "wav",
    providerLabel: "Gemini",
    appliedVoiceHint: `${voiceName} voice · ${gender} · ${age} · ${tone}`,
  };
}

function buildSpeechInstructions(
  styleGuide: string,
  gender: GenderOption,
  age: AgeOption,
  tone: ToneOption,
) {
  const guide = styleGuide.trim();

  return [
    "항상 한국어 발음이 자연스럽도록 읽어주세요.",
    "중장년층이 듣기 편하도록 또렷하고 안정적인 속도로 말해주세요.",
    `화자의 느낌은 ${gender}, ${age}, ${tone} 쪽에 가깝게 표현해주세요.`,
    guide || "따뜻하고 차분한 안내 음성으로 읽어주세요.",
  ].join(" ");
}

function buildOpenAIScript(script: string) {
  return script.trim();
}

function buildGeminiContents(
  script: string,
  styleGuide: string,
  gender: GenderOption,
  age: AgeOption,
  tone: ToneOption,
) {
  return [
    {
      parts: [
        {
          text: [
            "다음 한국어 문장을 그대로 또렷하게 읽어주세요.",
            "발음은 자연스럽고 편안하게 유지하고, 중장년층이 듣기 좋은 속도로 말해주세요.",
            `화자 느낌은 ${gender}, ${age}, ${tone}에 가깝게 맞춰주세요.`,
            styleGuide.trim() || "따뜻하고 차분한 안내 멘트처럼 읽어주세요.",
            "",
            "[읽을 대본]",
            script.trim(),
          ].join("\n"),
        },
      ],
    },
  ];
}

function pickOpenAIVoice(gender: GenderOption, tone: ToneOption) {
  if (gender === "남자") {
    if (tone === "조용한" || tone === "차분한") {
      return "sage";
    }

    if (tone === "활기찬") {
      return "verse";
    }

    return "ash";
  }

  if (tone === "활기찬") {
    return "coral";
  }

  if (tone === "조용한" || tone === "차분한") {
    return "shimmer";
  }

  return "coral";
}

function pickGeminiVoice(
  gender: GenderOption,
  age: AgeOption,
  tone: ToneOption,
) {
  if (age === "10대") {
    return tone === "활기찬" ? "Puck" : "Leda";
  }

  if (tone === "따뜻한") {
    return "Sulafat";
  }

  if (tone === "활기찬") {
    return "Sadachbia";
  }

  if (tone === "씩씩한") {
    return gender === "남자" ? "Fenrir" : "Kore";
  }

  if (tone === "조용한") {
    return "Achernar";
  }

  if (tone === "차분한") {
    return age === "40대" ? "Gacrux" : "Schedar";
  }

  return gender === "남자" ? "Iapetus" : "Sulafat";
}

function pcmToWav(
  pcmData: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}
