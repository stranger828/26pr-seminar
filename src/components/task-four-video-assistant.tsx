"use client";

import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import GalleryButton from "@/components/gallery-button";
import { useMemo, useState } from "react";

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
] as const;

const scriptPresets = [
  "안녕하세요. 4월 27일 월요일, 여전도회 바자회가 여전도회관 동편 주차장에서 열립니다. 정성껏 준비한 먹거리와 따뜻한 만남이 기다리고 있습니다. 가족과 이웃과 함께 오셔서 기쁜 시간을 나누세요. 여러분을 반갑게 초대합니다.",
  "지친 마음에 작은 위로가 필요한 날, 잠시 멈추어 하나님의 평안을 떠올려 보세요. 오늘도 우리를 지키시고 인도하시는 주님의 사랑은 변함이 없습니다.",
  "사랑하는 성도 여러분, 이번 주일 오후에는 전교인 찬양예배가 준비되어 있습니다. 함께 찬양하고 기도하며 은혜를 나누는 시간에 꼭 함께해 주세요.",
] as const;

const motionPresets = [
  "대표 이미지의 분위기를 유지하면서 인물과 햇살이 아주 천천히 자연스럽게 움직이는 짧은 홍보 영상으로 만들어줘. 카메라는 부드럽게 앞으로 다가가고, 따뜻하고 환영하는 분위기를 유지해줘.",
  "조용한 묵상 영상처럼 차분하게 움직여줘. 빛이 은은하게 흔들리고, 화면 전환 없이 한 장면 안에서 미세한 카메라 움직임만 들어가게 해줘.",
  "행사 초청 영상 느낌으로 밝고 생기 있게 움직여줘. 인물의 미소와 주변 소품이 자연스럽게 살아나는 정도의 부드러운 움직임을 넣어줘.",
] as const;

type Provider = (typeof providers)[number]["id"];

export default function TaskFourVideoAssistant() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [script, setScript] = useState<string>(scriptPresets[0]);
  const [motionPrompt, setMotionPrompt] = useState<string>(motionPresets[0]);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () =>
      script.trim().length > 0 &&
      motionPrompt.trim().length > 0 &&
      imageDataUrl.length > 0 &&
      !isLoading,
    [script, motionPrompt, imageDataUrl, isLoading],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const originalDataUrl = await readFileAsDataUrl(file);
      const normalizedDataUrl = await normalizeImageForVideo(originalDataUrl);

      setImageDataUrl(normalizedDataUrl);
      setImageName(file.name);
      setError("");
    } catch (fileError) {
      setImageDataUrl("");
      setImageName("");
      setError(
        fileError instanceof Error
          ? fileError.message
          : "이미지 파일을 읽지 못했습니다.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanScript = script.trim();
    const cleanMotionPrompt = motionPrompt.trim();

    if (!cleanScript || !cleanMotionPrompt || !imageDataUrl) {
      return;
    }

    setIsLoading(true);
    setError("");
    setVideoUrl("");
    setStatusMessage("영상 생성을 시작하는 중입니다...");

    try {
      const startResponse = await fetch("/api/task-four-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          script: cleanScript,
          motionPrompt: cleanMotionPrompt,
          imageDataUrl,
        }),
      });

      if (!startResponse.ok) {
        const data = (await startResponse.json()) as { error?: string };
        throw new Error(data.error || "영상 생성에 실패했습니다.");
      }

      const startData = (await startResponse.json()) as {
        jobToken?: string;
        message?: string;
        error?: string;
      };

      if (!startData.jobToken) {
        throw new Error(startData.error || "영상 생성 작업을 시작하지 못했습니다.");
      }

      setStatusMessage(
        startData.message || "영상 생성을 시작했습니다. 잠시만 기다려주세요.",
      );

      await pollVideoResult(startData.jobToken);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "영상 생성 중 오류가 발생했습니다.",
      );
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  }

  async function pollVideoResult(jobToken: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await wait(5000);

      const response = await fetch(
        `/api/task-four-video?job=${encodeURIComponent(jobToken)}`,
        {
          cache: "no-store",
        },
      );

      const data = (await response.json()) as {
        status?: "queued" | "processing" | "completed" | "failed";
        videoUrl?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "영상 상태를 확인하지 못했습니다.");
      }

      if (data.status === "completed" && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setStatusMessage("영상 생성이 완료되었습니다.");
        return;
      }

      if (data.status === "failed") {
        throw new Error(data.error || "영상 생성에 실패했습니다.");
      }

      setStatusMessage(
        data.message || "영상을 생성 중입니다. 잠시만 기다려주세요.",
      );
    }

    throw new Error(
      "영상 생성 시간이 오래 걸리고 있습니다. 잠시 후 다시 상태를 확인해주세요.",
    );
  }

  function buildDownloadName() {
    return `task-4-video-${provider}.mp4`;
  }

  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card-strong)] p-5 text-[var(--foreground)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
            실습 실행 창
          </p>
          <h3 className="mt-2 text-xl font-semibold">AI로 짧은 영상 초안을 만들어보세요</h3>
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
        {scriptPresets.map((preset, index) => (
          <button
            key={preset}
            type="button"
            onClick={() => setScript(preset)}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-left text-xs leading-5 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:text-sm"
          >
            대사 예시 {index + 1}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {motionPresets.map((preset, index) => (
          <button
            key={preset}
            type="button"
            onClick={() => setMotionPrompt(preset)}
            className="rounded-full border border-[var(--line)] bg-[#f8f5ef] px-3 py-2 text-left text-xs leading-5 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:text-sm"
          >
            움직임 예시 {index + 1}
          </button>
        ))}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            대표 이미지 업로드
          </span>
          <div className="mt-2 rounded-[1.5rem] border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/45 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--accent-strong)]">
                  이미지 파일을 선택해주세요
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)] sm:text-sm">
                  과제 2에서 만든 이미지를 저장한 뒤 업로드하면 가장 안정적입니다.
                  현재 구현은 16:9 대표 이미지 기준으로 맞춰져 있습니다.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]">
                파일 선택
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-[var(--muted)]">
              {imageName ? (
                <p>
                  선택한 파일: <span className="font-medium text-[var(--foreground)]">{imageName}</span>
                </p>
              ) : (
                <p>아직 선택한 이미지가 없습니다.</p>
              )}
            </div>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            참고할 대사
          </span>
          <textarea
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={6}
            className="mt-2 w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 text-[var(--foreground)] outline-none transition placeholder:text-[#9b8f80] focus:border-[var(--accent)]"
            placeholder="예: 초청 문안이나 묵상 문장을 붙여넣어 주세요."
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            영상 움직임 설명
          </span>
          <textarea
            value={motionPrompt}
            onChange={(event) => setMotionPrompt(event.target.value)}
            rows={6}
            className="mt-2 w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 text-[var(--foreground)] outline-none transition placeholder:text-[#9b8f80] focus:border-[var(--accent)]"
            placeholder="예: 햇살이 은은하게 움직이고 카메라가 천천히 앞으로 다가오는 따뜻한 초청 영상"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "영상 생성 중... 잠시 기다려주세요" : "영상 만들기"}
          </button>
          <p className="text-sm text-[var(--muted)]">
            영상 생성은 보통 수십 초에서 몇 분 정도 걸릴 수 있습니다.
          </p>
        </div>

        {statusMessage ? (
          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[#f8f5ef] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            {statusMessage}
          </div>
        ) : null}
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.25rem] border border-[#e5b6b6] bg-[#fff5f5] px-4 py-3 text-sm leading-6 text-[#9a3d3d]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4 text-[var(--foreground)]">
          <p className="text-sm font-medium text-[var(--muted)]">참고 자료</p>
          <div className="mt-3 space-y-4">
            <div className="overflow-hidden rounded-2xl bg-[#f8f5ef]">
              {imageDataUrl ? (
                <Image
                  src={imageDataUrl}
                  alt="업로드한 대표 이미지"
                  width={1280}
                  height={720}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm leading-6 text-[var(--muted)]">
                  업로드한 대표 이미지가 여기에 표시됩니다.
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-[#f8f5ef] p-4 text-sm leading-7">
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                이미지 파일
              </p>
              <p className="mt-2">{imageName || "아직 업로드하지 않았습니다."}</p>
              <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                참고 대사
              </p>
              <p className="mt-2 whitespace-pre-wrap">{script}</p>
              <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                움직임 설명
              </p>
              <p className="mt-2 whitespace-pre-wrap">{motionPrompt}</p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4 text-[var(--foreground)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">생성된 영상</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                현재 provider: {provider === "openai" ? "OpenAI Sora" : "Gemini Veo"}
              </p>
            </div>
            {videoUrl ? (
              <a
                href={videoUrl}
                download={buildDownloadName()}
                className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                영상 다운로드
              </a>
            ) : null}
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl bg-[#f8f5ef]">
            {videoUrl ? (
              <video
                key={videoUrl}
                controls
                className="aspect-video w-full bg-black"
                playsInline
              >
                <source src={videoUrl} type="video/mp4" />
                브라우저가 영상 재생을 지원하지 않습니다.
              </video>
            ) : (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm leading-6 text-[var(--muted)]">
                생성된 영상이 여기에 표시됩니다.
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4 text-xs leading-6 text-[var(--muted)]">
            <p>OpenAI는 Sora 계열 비디오 API를 사용합니다.</p>
            <p>Gemini는 Veo 계열 비디오 API를 사용합니다.</p>
            <p>오디오 파일은 직접 넣지 않고, 1단계 대사와 2단계 이미지를 참고 자료로 사용합니다.</p>
          </div>
        </article>
      </div>

      <GalleryButton />
    </section>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };

    reader.onerror = () => {
      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };

    reader.readAsDataURL(file);
  });
}

function normalizeImageForVideo(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      const width = 1280;
      const height = 720;
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("영상용 이미지를 준비하지 못했습니다."));
        return;
      }

      context.fillStyle = "#f4efe6";
      context.fillRect(0, 0, width, height);

      const scale = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      resolve(canvas.toDataURL("image/png"));
    };

    image.onerror = () => {
      reject(new Error("업로드한 이미지를 열지 못했습니다."));
    };

    image.src = dataUrl;
  });
}
