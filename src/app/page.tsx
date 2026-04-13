import Image from "next/image";

const tasks = [
  {
    step: "1",
    title: "AI로 글쓰기",
    description: "짧은 홍보 문장과 내레이션 원고를 만듭니다.",
    output: "완성 문장 1개",
    status: "시작 전",
  },
  {
    step: "2",
    title: "AI로 이미지 만들기",
    description: "문장 분위기에 어울리는 대표 이미지를 만듭니다.",
    output: "대표 이미지 1~2장",
    status: "시작 전",
  },
  {
    step: "3",
    title: "AI로 오디오 만들기",
    description: "문장을 음성으로 바꾸어 내레이션 파일을 준비합니다.",
    output: "음성 파일 1개",
    status: "시작 전",
  },
  {
    step: "4",
    title: "AI로 영상 만들기",
    description: "이미지와 오디오로 짧은 영상 초안을 생성합니다.",
    output: "영상 초안 1개",
    status: "시작 전",
  },
  {
    step: "5",
    title: "영상 편집하기",
    description: "CapCut으로 자막과 마무리 문구를 더해 완성합니다.",
    output: "완성 영상 1개",
    status: "시작 전",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--card)] shadow-[0_20px_60px_rgba(73,52,30,0.08)]">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-[0.18em] text-[var(--olive)] uppercase">
                제25회 홍보매체 세미나
              </p>
              <div className="mt-4 w-full max-w-4xl">
                <Image
                  src="/images/heroes/home-hero-title-character.png"
                  alt="AI 콘텐츠 만들기 실습 타이틀과 안내 캐릭터"
                  width={3914}
                  height={1680}
                  priority
                  className="h-auto w-full"
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 80vw, 900px"
                />
              </div>
              <h1 className="mt-3 max-w-xl text-3xl leading-tight font-semibold sm:text-5xl">
                AI로 만들어보는
                <br />
                여전도회 홍보영상
              </h1>
            </div>
          </div>

          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            오늘은 5단계를 차례로 따라가며 글, 그림, 음성, 영상 초안을 만들고
            마지막에는 편집까지 연결합니다. 각 단계의 결과물이 다음 단계의
            재료가 되도록 설계했습니다.
          </p>

          <div className="grid gap-3 sm:grid-cols-[1.4fr_0.9fr]">
            <a
              href="#tasks"
              className="flex min-h-14 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-base font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              실습 시작하기
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_12px_30px_rgba(73,52,30,0.05)] sm:px-7">
          <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
            실습 순서
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold sm:text-base">
            <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2">
              1 글쓰기
            </span>
            <span className="text-[var(--muted)]">→</span>
            <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2">
              2 이미지
            </span>
            <span className="text-[var(--muted)]">→</span>
            <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2">
              3 오디오
            </span>
            <span className="text-[var(--muted)]">→</span>
            <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2">
              4 영상
            </span>
            <span className="text-[var(--muted)]">→</span>
            <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2">
              5 편집
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-[var(--muted)]">
              <span>진행률</span>
              <span>0 / 5 완료</span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-white/80">
              <div className="h-3 w-[12%] rounded-full bg-[var(--accent)]" />
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_12px_30px_rgba(73,52,30,0.05)] sm:px-7">
          <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
            실습 안내
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
            <li>천천히 따라오셔도 괜찮습니다.</li>
            <li>각 단계마다 복사해서 쓰는 예시 문구를 제공합니다.</li>
            <li>완료할 때마다 다음 단계에 가져갈 결과물을 알려드립니다.</li>
          </ul>
        </article>
      </section>

      <section
        id="tasks"
        className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-4 py-5 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-6 sm:py-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
              실습 과제
            </p>
            <h2 className="mt-2 text-2xl font-semibold">5개의 결과물을 순서대로 만들어보세요</h2>
          </div>
          <a
            href="/final"
            className="hidden rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)] sm:inline-flex"
          >
            최종 결과 보기
          </a>
        </div>

        <div className="mt-5 grid gap-4">
          {tasks.map((task) => (
            <article
              key={task.step}
              className="grid gap-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                {task.step}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold">{task.title}</h3>
                  <span className="rounded-full bg-[#f4eee6] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                    {task.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  {task.description}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--olive)]">
                  결과물: {task.output}
                </p>
              </div>

              <a
                href={`/task/${task.step}`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                과제 열기
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
