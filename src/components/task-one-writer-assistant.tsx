"use client";

import type { FormEvent } from "react";
import GalleryButton from "@/components/gallery-button";
import { useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
  provider: "openai" | "gemini";
};

const presetPrompts = [
  "여전도회 바자회 초청 영상을 만들려고 해. 따뜻하고 쉬운 한국어로 5문장짜리 홍보 문안을 써줘. 마지막 문장은 초대의 말로 마무리해줘.",
  "교회 행사 안내용 짧은 내레이션 원고가 필요해. 영상 길이는 30초 이내이고, 차분하고 정감 있는 말투로 써줘. 너무 어려운 단어는 쓰지 말아줘.",
  "짧은 묵상 영상에 넣을 소개 문장을 써줘. 중장년층이 공감하기 쉬운 표현으로 4문장 정도 부탁해.",
];

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
] as const;

type Provider = (typeof providers)[number]["id"];

export default function TaskOneWriterAssistant() {
  const [prompt, setPrompt] = useState(presetPrompts[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");

  const canSubmit = useMemo(
    () => prompt.trim().length > 0 && !isLoading,
    [prompt, isLoading],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return;
    }

    setIsLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/task-one-write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: cleanPrompt, provider }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "답변을 불러오지 못했습니다.");
      }

      setMessages((current) => [
        ...current,
        { role: "user", text: cleanPrompt, provider },
        { role: "assistant", text: data.reply as string, provider },
      ]);
      setAnswer(data.reply);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "알 수 없는 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyAnswer() {
    if (!answer) {
      return;
    }

    await navigator.clipboard.writeText(answer);
    setCopied(true);
  }

  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
            실습 실행 창
          </p>
          <h3 className="mt-2 text-xl font-semibold">AI와 직접 문안을 만들어보세요</h3>
        </div>
        <div className="flex items-center rounded-full bg-[var(--accent-soft)] p-1 text-xs font-semibold">
          {providers.map((item) => {
            const isActive = provider === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setProvider(item.id)}
                className={`rounded-full px-3 py-1 transition ${
                  isActive
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--accent-strong)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {presetPrompts.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setPrompt(preset)}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-left text-xs leading-5 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:text-sm"
          >
            예시 불러오기
          </button>
        ))}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            AI에게 요청할 내용을 적어주세요
          </span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={7}
            className="mt-2 w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--accent)]"
            placeholder="예: 여전도회 행사 초청 영상을 위한 따뜻한 소개 문안을 써주세요."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "작성 중..." : "AI에게 요청하기"}
          </button>
          <p className="text-sm text-[var(--muted)]">
            답변이 나오면 아래에서 바로 복사할 수 있습니다.
          </p>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.25rem] border border-[#e5b6b6] bg-[#fff5f5] px-4 py-3 text-sm leading-6 text-[#9a3d3d]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-medium text-[var(--muted)]">대화 기록</p>
          <div className="mt-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--muted)]">
                아직 대화를 시작하지 않았습니다. 위 입력창에 요청을 적고
                실행해보세요.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user"
                    ? "bg-[#eef4ff]"
                    : "bg-[#f8f5ef]"
                    }`}
                >
                  <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                    {message.role === "user"
                      ? `내 요청 · ${message.provider}`
                      : `AI 초안 · ${message.provider}`}
                  </p>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--muted)]">최신 결과</p>
            <button
              type="button"
              onClick={copyAnswer}
              disabled={!answer}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copied ? "복사됨" : "결과 복사하기"}
            </button>
          </div>
          <div className="mt-3 min-h-52 rounded-2xl bg-[#f8f5ef] p-4 text-sm leading-7">
            {answer ? (
              <p className="whitespace-pre-wrap">{answer}</p>
            ) : (
              <p className="text-[var(--muted)]">
                AI가 작성한 문안이 여기에 표시됩니다.
              </p>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            마음에 드는 결과가 나오면 복사해서 메모해두세요. 다음 단계에서
            이미지 생성 프롬프트의 재료로 사용합니다.
          </p>
        </article>
      </div>

      <GalleryButton />
    </section>
  );
}
