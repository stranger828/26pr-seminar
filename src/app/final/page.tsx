import Link from "next/link";

const results = [
  "완성 문안 1개",
  "대표 이미지 1~2장",
  "음성 파일 1개",
  "영상 초안 1개",
  "완성 영상 1개",
];

const referenceGroups = [
  {
    title: "글쓰기",
    sites: [
      { name: "ChatGPT", href: "https://chatgpt.com/" },
      { name: "Gemini", href: "https://gemini.google.com/" },
      { name: "Claude", href: "https://claude.ai/" },
    ],
  },
  {
    title: "이미지",
    sites: [
      { name: "ChatGPT", href: "https://chatgpt.com/" },
      { name: "Gemini (Nano Banana)", href: "https://gemini.google.com/" },
      { name: "Midjourney", href: "https://www.midjourney.com/" },
      { name: "Firefly", href: "https://www.adobe.com/firefly" },
      { name: "Freepik", href: "https://www.freepik.com/ai/image-generator" },
    ],
  },
  {
    title: "오디오",
    sites: [
      { name: "Suno AI", href: "https://about.suno.com/" },
      { name: "Google TTS", href: "https://cloud.google.com/text-to-speech/" },
      { name: "타입캐스트", href: "https://typecast.ai/" },
      { name: "CapCut (AI 성우)", href: "https://www.capcut.com/tools/ai-voice-generator" },
    ],
  },
  {
    title: "영상",
    sites: [
      { name: "Veo", href: "https://ai.google.dev/gemini-api/docs/video" },
      { name: "Sora", href: "https://platform.openai.com/docs/guides/video-generation" },
      { name: "Google Vids", href: "https://workspace.google.com/products/vids/" },
      { name: "Genspark", href: "https://www.genspark.im/" },
    ],
  },
] as const;

export default function FinalPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
          최종 결과
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          5개의 결과물을 연결해 하나의 영상으로 완성합니다
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">
          실습이 끝나면 아래 다섯 가지를 모두 손에 쥐게 됩니다. 이 화면은
          마지막 정리, 복습, 발표 준비를 돕는 공간으로 확장할 예정입니다.
        </p>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <div className="grid gap-3">
          {results.map((result, index) => (
            <article
              key={result}
              className="flex items-center gap-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">
                {index + 1}
              </div>
              <p className="text-base">{result}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
          참고 사이트
        </p>
        <h2 className="mt-3 text-2xl font-semibold">
          실습 후 더 써볼 만한 도구들
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
          오늘 실습한 흐름을 바탕으로, 글쓰기부터 영상까지 다른 서비스도 함께
          비교해보며 활용할 수 있습니다.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {referenceGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5"
            >
              <h3 className="text-lg font-semibold">{group.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.sites.map((site) => (
                  <a
                    key={site.name}
                    href={site.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  >
                    {site.name}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="flex justify-between gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] px-5 text-sm font-semibold"
        >
          홈으로
        </Link>
        <Link
          href="/task/1"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          첫 과제 다시 보기
        </Link>
      </div>
    </main>
  );
}
