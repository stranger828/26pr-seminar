import { NextResponse } from "next/server";
import { saveTextGalleryItem } from "@/lib/gallery-store";

export const runtime = "nodejs";

type Provider = "openai" | "gemini";

type ResponseContent = {
  type?: string;
  text?: string;
};

type ResponseOutput = {
  type?: string;
  content?: ResponseContent[];
};

function extractText(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text.trim();
  }

  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray(payload.output)
  ) {
    const chunks = payload.output.flatMap((entry: ResponseOutput) => {
      if (
        entry &&
        typeof entry === "object" &&
        "content" in entry &&
        Array.isArray(entry.content)
      ) {
        return entry.content
          .filter(
            (content: ResponseContent) =>
              content &&
              typeof content === "object" &&
              (content.type === "output_text" || content.type === undefined) &&
              "text" in content &&
              typeof content.text === "string",
          )
          .map((content: ResponseContent) => content.text as string);
      }
      return [];
    });

    return chunks.join("\n").trim();
  }

  return "";
}

export async function POST(request: Request) {
  const { prompt, provider = "openai" } = (await request.json()) as {
    prompt?: string;
    provider?: Provider;
  };

  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "요청 내용을 먼저 적어주세요." },
      { status: 400 },
    );
  }

  try {
    const reply =
      provider === "gemini"
        ? await generateWithGemini(prompt)
        : await generateWithOpenAI(prompt);

    let galleryItem = null;
    let galleryWarning: string | undefined;

    try {
      galleryItem = await saveTextGalleryItem({
        taskStep: "1",
        provider,
        prompt,
        resultText: reply,
      });
    } catch (galleryError) {
      console.error("Failed to save task 1 gallery item:", galleryError);
      galleryWarning =
        galleryError instanceof Error
          ? galleryError.message
          : "갤러리 저장에 실패했습니다.";
    }

    return NextResponse.json({ reply, galleryItem, galleryWarning });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 응답을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5-mini";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "당신은 중장년층 대상 교회 홍보 영상 실습을 돕는 글쓰기 도우미입니다. 답변은 항상 한국어로 하고, 따뜻하고 쉬운 표현을 사용하세요. 결과는 바로 영상에 넣을 수 있도록 짧고 또렷하게 작성하세요.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      reasoning: {
        effort: "low",
      },
      text: {
        verbosity: "low",
      },
      max_output_tokens: 1200,
    }),
  });

  const data = (await upstream.json()) as unknown;

  if (!upstream.ok) {
    throw new Error("OpenAI 응답을 가져오지 못했습니다.");
  }

  const reply = extractText(data);

  if (!reply) {
    throw new Error("응답에서 텍스트를 찾지 못했습니다.");
  }

  return reply;
}

async function generateWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 넣어주세요.",
    );
  }

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "당신은 중장년층 대상 교회 홍보 영상 실습을 돕는 글쓰기 도우미입니다. 답변은 항상 한국어로 하고, 따뜻하고 쉬운 표현을 사용하세요. 결과는 바로 영상에 넣을 수 있도록 짧고 또렷하게 작성하세요.",
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    },
  );

  const data = (await upstream.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  if (!upstream.ok) {
    throw new Error("Gemini 응답을 가져오지 못했습니다.");
  }

  const reply =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim() || "";

  if (!reply) {
    throw new Error("Gemini 응답에서 텍스트를 찾지 못했습니다.");
  }

  return reply;
}
