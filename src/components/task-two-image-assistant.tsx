"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import GalleryButton from "@/components/gallery-button";
import { useMemo, useState } from "react";

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
] as const;

type Provider = (typeof providers)[number]["id"];

const presetPrompts: string[] = [
  "따뜻한 봄날 교회로 초대하는 느낌의 대표 이미지를 만들어줘. 부드러운 햇살이 비치는 교회 입구 앞에 미소 짓는 중장년 여성들이 서 있고, 환영하는 분위기의 포스터 같은 이미지로 표현해줘.",
  "짧은 묵상 영상의 표지 이미지를 만들고 싶어. 새벽빛이 비치는 조용한 예배당, 따뜻한 베이지와 하늘색 계열, 평안하고 위로가 느껴지는 분위기로 만들어줘.",
  "여전도회 바자회 홍보 이미지가 필요해. 아늑한 교회 마당, 꽃 장식, 밝은 미소, 따뜻한 커뮤니티 행사 느낌으로 만들어줘.",
];

export default function TaskTwoImageAssistant() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [prompt, setPrompt] = useState(presetPrompts[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const response = await fetch("/api/task-two-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: cleanPrompt, provider }),
      });

      const data = (await response.json()) as {
        imageDataUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(data.error || "이미지를 불러오지 못했습니다.");
      }

      setImageUrl(data.imageDataUrl);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "이미지를 생성하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  function buildDownloadName() {
    const providerLabel = provider === "openai" ? "openai" : "gemini";
    return `task-2-image-${providerLabel}.png`;
  }

  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
            실습 실행 창
          </p>
          <h3 className="mt-2 text-xl font-semibold">AI로 대표 이미지를 만들어보세요</h3>
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
        {presetPrompts.map((preset, index) => (
          <button
            key={preset}
            type="button"
            onClick={() => setPrompt(preset)}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-left text-xs leading-5 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:text-sm"
          >
            예시 {index + 1}
          </button>
        ))}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            이미지 설명을 적어주세요
          </span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={7}
            className="mt-2 w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--accent)]"
            placeholder="예: 따뜻한 햇살이 드는 교회 앞 풍경과 환영하는 성도들의 모습을 만들어줘."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "이미지 생성 중..." : "이미지 만들기"}
          </button>
          <button
            type="button"
            onClick={copyPrompt}
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            {copied ? "프롬프트 복사됨" : "프롬프트 복사하기"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.25rem] border border-[#e5b6b6] bg-[#fff5f5] px-4 py-3 text-sm leading-6 text-[#9a3d3d]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-medium text-[var(--muted)]">사용한 설명</p>
          <div className="mt-3 rounded-2xl bg-[#f8f5ef] p-4 text-sm leading-7">
            <p className="whitespace-pre-wrap">{prompt}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            결과가 마음에 들지 않으면 분위기, 인물, 색감, 장소를 더 구체적으로
            적어보세요.
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            현재 이미지는 자동 저장되지 않으며, 다운로드 버튼을 눌러 직접
            저장하는 방식입니다.
          </p>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-medium text-[var(--muted)]">생성된 이미지</p>
          <div className="mt-3 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-[#f8f5ef]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="AI가 생성한 실습 대표 이미지"
                width={1024}
                height={1024}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <p className="px-6 text-center text-sm leading-6 text-[var(--muted)]">
                생성된 이미지가 여기에 표시됩니다.
              </p>
            )}
          </div>
          {imageUrl ? (
            <a
              href={imageUrl}
              download={buildDownloadName()}
              className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              이미지 다운로드 하기
            </a>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            생성 이미지는 16:9 영상 표지 기준으로 미리보기 됩니다.
          </p>
        </article>
      </div>

      <GalleryButton />
    </section>
  );
}
