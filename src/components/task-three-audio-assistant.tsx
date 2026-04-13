"use client";

import type { FormEvent } from "react";
import GalleryButton from "@/components/gallery-button";
import { useMemo, useState } from "react";

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
] as const;

const genderOptions = ["남자", "여자"] as const;
const ageOptions = ["10대", "20대", "30대", "40대"] as const;
const toneOptions = ["활기찬", "씩씩한", "따뜻한", "조용한", "차분한"] as const;

const stylePresets = [
  {
    label: "따뜻한 초대",
    text: "따뜻하고 다정한 톤으로, 천천히 또렷하게 읽어줘. 교회에 처음 오는 분도 편안하게 느끼도록 자연스럽고 부드럽게 말해줘.",
  },
  {
    label: "차분한 묵상",
    text: "조용하고 평안한 분위기로 읽어줘. 문장 사이에 약간의 여유를 두고, 위로가 느껴지는 말투로 들려줘.",
  },
  {
    label: "행사 안내",
    text: "밝고 반가운 안내 멘트처럼 읽어줘. 너무 빠르지 않게, 중장년층이 듣기 편한 속도로 또렷하게 말해줘.",
  },
] as const;

const scriptPresets = [
  "안녕하세요. 이번 주 토요일, 여전도회 바자회가 교회 마당에서 열립니다. 정성껏 준비한 먹거리와 따뜻한 만남이 기다리고 있습니다. 가족과 이웃과 함께 오셔서 기쁜 시간을 나누세요. 여러분을 반갑게 초대합니다.",
  "지친 마음에 작은 위로가 필요한 날, 잠시 멈추어 하나님의 평안을 떠올려 보세요. 오늘도 우리를 지키시고 인도하시는 주님의 사랑은 변함이 없습니다. 조용한 마음으로 말씀 앞에 머물 때 다시 힘을 얻게 됩니다.",
  "사랑하는 성도 여러분, 이번 주일 오후에는 전교인 찬양예배가 준비되어 있습니다. 함께 찬양하고 기도하며 은혜를 나누는 시간에 꼭 함께해 주세요. 기쁜 마음으로 여러분을 기다리겠습니다.",
] as const;

type Provider = (typeof providers)[number]["id"];
type GenderOption = (typeof genderOptions)[number];
type AgeOption = (typeof ageOptions)[number];
type ToneOption = (typeof toneOptions)[number];

type AudioResult = {
  audioDataUrl?: string;
  mimeType?: string;
  fileExtension?: string;
  providerLabel?: string;
  appliedVoiceHint?: string;
  error?: string;
};

export default function TaskThreeAudioAssistant() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [gender, setGender] = useState<GenderOption>("여자");
  const [age, setAge] = useState<AgeOption>("40대");
  const [tone, setTone] = useState<ToneOption>("따뜻한");
  const [script, setScript] = useState<string>(scriptPresets[0]);
  const [styleGuide, setStyleGuide] = useState<string>(stylePresets[0].text);
  const [audioUrl, setAudioUrl] = useState("");
  const [mimeType, setMimeType] = useState("audio/wav");
  const [fileExtension, setFileExtension] = useState("wav");
  const [providerLabel, setProviderLabel] = useState("OpenAI");
  const [appliedVoiceHint, setAppliedVoiceHint] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(
    () => script.trim().length > 0 && !isLoading,
    [script, isLoading],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanScript = script.trim();
    const cleanStyleGuide = styleGuide.trim();

    if (!cleanScript) {
      return;
    }

    setIsLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/task-three-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: cleanScript,
          styleGuide: cleanStyleGuide,
          provider,
          gender,
          age,
          tone,
        }),
      });

      const data = (await response.json()) as AudioResult;

      if (!response.ok || !data.audioDataUrl) {
        throw new Error(data.error || "오디오를 생성하지 못했습니다.");
      }

      setAudioUrl(data.audioDataUrl);
      setMimeType(data.mimeType || "audio/wav");
      setFileExtension(data.fileExtension || "wav");
      setProviderLabel(data.providerLabel || provider.toUpperCase());
      setAppliedVoiceHint(data.appliedVoiceHint || "");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "오디오 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyScript() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
  }

  function downloadName() {
    return `task-3-audio-${provider}.${fileExtension}`;
  }

  const estimatedSeconds = useMemo(() => {
    const text = script.trim();
    if (!text) {
      return 0;
    }

    const syllableLikeLength = text.replace(/\s+/g, "").length;
    return Math.max(8, Math.round(syllableLikeLength / 4.2));
  }, [script]);

  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card-strong)] p-5 text-[var(--foreground)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
            실습 실행 창
          </p>
          <h3 className="mt-2 text-xl font-semibold">AI로 내레이션 오디오를 만들어보세요</h3>
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
            대본 예시 {index + 1}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {stylePresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setStyleGuide(preset.text)}
            className="rounded-full border border-[var(--line)] bg-[#f8f5ef] px-3 py-2 text-left text-xs leading-5 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:text-sm"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">성별 느낌</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {genderOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGender(item)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    gender === item
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--line)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">연령대 느낌</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ageOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAge(item)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    age === item
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--line)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--muted)]">톤</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {toneOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTone(item)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    tone === item
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--line)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            읽어줄 대본을 적어주세요
          </span>
          <textarea
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={7}
            className="mt-2 w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 text-[var(--foreground)] outline-none transition placeholder:text-[#9b8f80] focus:border-[var(--accent)]"
            placeholder="예: 여전도회 바자회 초청 내레이션 문장을 적어주세요."
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted)]">
            말투와 분위기 가이드
          </span>
          <textarea
            value={styleGuide}
            onChange={(event) => setStyleGuide(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 text-[var(--foreground)] outline-none transition placeholder:text-[#9b8f80] focus:border-[var(--accent)]"
            placeholder="예: 따뜻하고 천천히, 또렷하게 읽어줘."
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "오디오 생성 중..." : "오디오 만들기"}
          </button>
          <button
            type="button"
            onClick={copyScript}
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            {copied ? "대본 복사됨" : "대본 복사하기"}
          </button>
          <p className="text-sm text-[var(--muted)]">
            예상 길이 약 {estimatedSeconds}초
          </p>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.25rem] border border-[#e5b6b6] bg-[#fff5f5] px-4 py-3 text-sm leading-6 text-[#9a3d3d]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4 text-[var(--foreground)]">
          <p className="text-sm font-medium text-[var(--muted)]">사용한 대본과 안내</p>
          <div className="mt-3 rounded-2xl bg-[#f8f5ef] p-4 text-sm leading-7">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              대본
            </p>
            <p className="mt-2 whitespace-pre-wrap">{script || "아직 대본이 없습니다."}</p>
            <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              선택한 음성 설정
            </p>
            <p className="mt-2">
              {gender} · {age} · {tone}
            </p>
            <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              말투 가이드
            </p>
            <p className="mt-2 whitespace-pre-wrap">
              {styleGuide || "기본 말투로 생성됩니다."}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            한 문장은 너무 길지 않게 나누고, 쉼표를 넣으면 AI가 더 자연스럽게
            읽는 데 도움이 됩니다.
          </p>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4 text-[var(--foreground)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">생성된 오디오</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                현재 provider: {providerLabel}
              </p>
              {appliedVoiceHint ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  적용 힌트: {appliedVoiceHint}
                </p>
              ) : null}
            </div>
            {audioUrl ? (
              <a
                href={audioUrl}
                download={downloadName()}
                className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                오디오 다운로드
              </a>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl bg-[#f8f5ef] p-4">
            {audioUrl ? (
              <audio key={audioUrl} controls className="w-full">
                <source src={audioUrl} type={mimeType} />
                브라우저가 오디오 재생을 지원하지 않습니다.
              </audio>
            ) : (
              <div className="flex min-h-32 items-center justify-center text-center text-sm leading-6 text-[var(--muted)]">
                생성된 내레이션 오디오가 여기에 표시됩니다.
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4 text-xs leading-6 text-[var(--muted)]">
            <p>OpenAI는 WAV 오디오를 바로 생성합니다.</p>
            <p>Gemini는 TTS 오디오를 WAV로 변환해 바로 재생할 수 있게 준비합니다.</p>
            <p>성별, 연령대, 톤 선택은 실제 음성 스타일을 유도하는 가이드로 함께 전달됩니다.</p>
            <p>마음에 들지 않으면 대본을 짧게 다듬거나 말투 가이드를 더 구체적으로 적어보세요.</p>
          </div>
        </article>
      </div>

      <GalleryButton />
    </section>
  );
}
