import Link from "next/link";
import { notFound } from "next/navigation";
import TaskFourVideoAssistant from "@/components/task-four-video-assistant";
import TaskOneWriterAssistant from "@/components/task-one-writer-assistant";
import TaskThreeAudioAssistant from "@/components/task-three-audio-assistant";
import TaskTwoImageAssistant from "@/components/task-two-image-assistant";

const taskMap = {
  "1": {
    title: "AI로 글쓰기",
    intro: "짧은 홍보 문장과 내레이션 원고를 만드는 단계입니다.",
    purpose: "영상의 전체 분위기와 메시지를 정하는 가장 중요한 출발점입니다.",
    output: "완성 문장 1개",
  },
  "2": {
    title: "AI로 이미지 만들기",
    intro: "문장의 분위기에 어울리는 대표 이미지를 만드는 단계입니다.",
    purpose: "영상 첫인상을 정하고, 이후 영상 생성 단계의 시각 재료가 됩니다.",
    output: "대표 이미지 1~2장",
  },
  "3": {
    title: "AI로 오디오 만들기",
    intro: "문장을 음성으로 바꾸어 내레이션을 만드는 단계입니다.",
    purpose: "영상이 훨씬 친근하고 전달력 있게 느껴지도록 도와줍니다.",
    output: "음성 파일 1개",
  },
  "4": {
    title: "AI로 영상 만들기",
    intro: "이미지와 오디오를 바탕으로 영상 초안을 만드는 단계입니다.",
    purpose: "앞 단계의 결과물을 하나의 움직이는 콘텐츠로 연결합니다.",
    output: "영상 초안 1개",
  },
  "5": {
    title: "영상 편집하기",
    intro: "CapCut에서 자막과 마무리 문구를 더해 완성도를 높이는 단계입니다.",
    purpose: "AI가 만든 초안을 사람이 보기 좋고 전하기 좋은 영상으로 다듬습니다.",
    output: "완성 영상 1개",
  },
} as const;

type StepKey = keyof typeof taskMap;

export default async function TaskDetail({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const task = taskMap[step as StepKey];

  if (!task) {
    notFound();
  }

  const currentStep = Number(step);
  const prevHref = currentStep > 1 ? `/task/${currentStep - 1}` : "/";
  const nextHref = currentStep < 5 ? `/task/${currentStep + 1}` : "/final";
  const isFirstTask = step === "1";
  const isSecondTask = step === "2";
  const isThirdTask = step === "3";
  const isFourthTask = step === "4";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
          실습 과제 {step}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{task.title}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">
          {task.intro}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
            <p className="text-sm font-medium text-[var(--muted)]">왜 필요한가요?</p>
            <p className="mt-2 text-base leading-7">{task.purpose}</p>
          </article>
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
            <p className="text-sm font-medium text-[var(--muted)]">이번 단계 결과물</p>
            <p className="mt-2 text-base leading-7">{task.output}</p>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
          실습 튜토리얼
        </p>
        {isFirstTask ? (
          <div className="mt-4 space-y-5">
            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h2 className="text-xl font-semibold">이번 과제에서 할 일</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                오늘 만들 영상의 첫 문장을 AI와 함께 다듬습니다. 너무 길게
                쓰기보다 30초 안에 읽을 수 있는 짧은 소개글과 내레이션 원고를
                만드는 것이 목표입니다.
              </p>
            </article>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">따라하기 순서</h3>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>1. 아래 예시 주제 중 하나를 고르거나 직접 주제를 적습니다.</li>
                  <li>2. 말투는 따뜻하고 쉬운 한국어로 요청합니다.</li>
                  <li>3. AI가 준 초안을 읽고 마음에 드는 문장을 고릅니다.</li>
                  <li>4. 너무 길면 “조금 더 짧게”라고 다시 요청합니다.</li>
                  <li>5. 최종 문장을 다음 단계 이미지 생성에 사용합니다.</li>
                </ol>
              </article>

              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">예시 주제</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>여전도회 바자회 초청 영상</li>
                  <li>교회 행사 안내를 위한 따뜻한 소개 영상</li>
                  <li>짧은 묵상과 위로의 메시지 영상</li>
                  <li>위로가 되는 성경 구절 소개 영상</li>
                </ul>
              </article>
            </div>

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">복사해서 바로 써도 되는 요청 예시</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  여전도회 바자회 초청 영상을 만들려고 해. 40대 이상도
                  편하게 들을 수 있는 따뜻하고 쉬운 한국어로 5문장짜리 홍보
                  문장을 써줘. 마지막 문장은 초대의 말로 마무리해줘.
                </div>
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  교회 행사 안내용 짧은 내레이션 원고가 필요해. 영상 길이는
                  30초 이내이고, 차분하고 정감 있는 말투로 써줘. 너무
                  어려운 단어는 쓰지 말아줘.
                </div>
              </div>
            </article>

            <TaskOneWriterAssistant />

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">다음 단계로 가져갈 것</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                가장 마음에 드는 최종 문장 1개를 정해두세요. 다음 단계에서는 그
                문장을 바탕으로 대표 이미지를 만들게 됩니다.
              </p>
            </article>
          </div>
        ) : isSecondTask ? (
          <div className="mt-4 space-y-5">
            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h2 className="text-xl font-semibold">이번 과제에서 할 일</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                1단계에서 만든 문장을 바탕으로 영상의 표지가 될 대표 이미지를
                만듭니다. 한 장을 잘 고르면 이후 오디오와 영상 만들기 단계가
                훨씬 쉬워집니다.
              </p>
            </article>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">따라하기 순서</h3>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>1. 1단계에서 만든 핵심 문장을 짧게 요약합니다.</li>
                  <li>2. 어떤 분위기인지 먼저 정합니다. 따뜻함, 평안함, 초대, 위로 같은 단어가 좋습니다.</li>
                  <li>3. 인물, 장소, 빛, 색감 같은 요소를 함께 적어줍니다.</li>
                  <li>4. 결과가 너무 복잡하면 “더 단순하게” 또는 “따뜻한 교회 포스터 느낌”이라고 다시 요청합니다.</li>
                  <li>5. 가장 마음에 드는 1장을 저장해서 다음 단계로 가져갑니다.</li>
                </ol>
              </article>

              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">프롬프트에 넣으면 좋은 요소</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>주제: 여전도회 바자회, 교회 초청, 묵상, 위로</li>
                  <li>분위기: 따뜻한, 평안한, 부드러운, 환영하는</li>
                  <li>장면: 교회 앞, 환하게 웃는 성도들, 햇살, 꽃, 다과</li>
                  <li>스타일: 포스터 느낌, 수채화 느낌, 사실적인 사진 느낌</li>
                </ul>
              </article>
            </div>

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">복사해서 바로 써도 되는 요청 예시</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  따뜻한 봄날 교회로 초대하는 느낌의 대표 이미지를 만들어줘.
                  부드러운 햇살이 비치는 교회 입구 앞에 미소 짓는 중장년 여성들이
                  서 있고, 환영하는 분위기의 포스터 같은 이미지로 표현해줘.
                </div>
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  짧은 묵상 영상의 표지 이미지를 만들고 싶어. 새벽빛이 비치는
                  조용한 예배당, 따뜻한 베이지와 하늘색 계열, 평안하고 위로가
                  느껴지는 분위기로 만들어줘.
                </div>
              </div>
            </article>

            <TaskTwoImageAssistant />

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">다음 단계로 가져갈 것</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                가장 마음에 드는 대표 이미지 1장을 정해두세요. 다음 단계에서는
                이 이미지와 1단계 문장을 바탕으로 음성과 영상을 이어서 만들게
                됩니다.
              </p>
            </article>
          </div>
        ) : isThirdTask ? (
          <div className="mt-4 space-y-5">
            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h2 className="text-xl font-semibold">이번 과제에서 할 일</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                1단계에서 만든 문장을 실제 내레이션 음성으로 바꿉니다. 영상에
                바로 넣을 수 있도록 너무 빠르지 않고, 또렷하며, 따뜻한 느낌의
                오디오 파일을 준비하는 것이 목표입니다.
              </p>
            </article>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">따라하기 순서</h3>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>1. 1단계에서 정리한 최종 문장을 대본 칸에 붙여넣습니다.</li>
                  <li>2. 말투 가이드에 따뜻함, 차분함, 밝음 같은 분위기를 적습니다.</li>
                  <li>3. OpenAI 또는 Gemini 중 하나를 골라 오디오를 생성합니다.</li>
                  <li>4. 바로 재생해서 속도와 톤이 자연스러운지 확인합니다.</li>
                  <li>5. 가장 마음에 드는 파일을 다운로드해서 다음 단계로 가져갑니다.</li>
                </ol>
              </article>

              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">자연스럽게 만들 때 팁</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>한 문장은 너무 길지 않게 나누면 듣기 편해집니다.</li>
                  <li>쉼표와 마침표를 적절히 넣으면 호흡이 자연스러워집니다.</li>
                  <li>“또렷하게”, “천천히”, “따뜻하게” 같은 지시를 함께 적어보세요.</li>
                  <li>안내 멘트는 너무 감정적이기보다 안정적이고 편안한 톤이 좋습니다.</li>
                </ul>
              </article>
            </div>

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">복사해서 바로 써도 되는 요청 예시</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  안녕하세요. 4월 27일 월요일, 여전도회 바자회가 여전도회관 동편 주차장에서
                  열립니다. 정성껏 준비한 먹거리와 따뜻한 만남이 기다리고
                  있습니다. 가족과 이웃과 함께 오셔서 기쁜 시간을 나누세요.
                  여러분을 반갑게 초대합니다.
                </div>
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  따뜻하고 다정한 톤으로, 천천히 또렷하게 읽어줘. 중장년층이
                  편하게 들을 수 있도록 안정적인 속도로 자연스럽게 말해줘.
                </div>
              </div>
            </article>

            <TaskThreeAudioAssistant />

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">다음 단계로 가져갈 것</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                가장 마음에 드는 오디오 파일 1개를 준비해두세요. 다음 단계에서는
                대표 이미지와 이 오디오를 합쳐 짧은 영상 초안을 만들게 됩니다.
              </p>
            </article>
          </div>
        ) : isFourthTask ? (
          <div className="mt-4 space-y-5">
            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h2 className="text-xl font-semibold">이번 과제에서 할 일</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                앞에서 만든 대표 이미지와 대사를 참고 자료로 사용해 짧은 영상
                초안을 만듭니다. 이번 단계에서는 오디오 파일을 직접 넣기보다,
                이미지의 분위기와 문장의 메시지를 바탕으로 AI가 자연스럽게
                움직이는 장면을 생성하도록 요청합니다.
              </p>
            </article>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">따라하기 순서</h3>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>1. 2단계에서 만든 대표 이미지를 저장한 뒤 다시 업로드합니다.</li>
                  <li>2. 1단계에서 만든 핵심 문장을 참고 대사 칸에 넣습니다.</li>
                  <li>3. 화면이 어떻게 움직였으면 좋은지 자연어로 적습니다.</li>
                  <li>4. OpenAI 또는 Gemini 중 하나를 골라 영상을 생성합니다.</li>
                  <li>5. 가장 마음에 드는 초안을 내려받아 마지막 편집 단계로 가져갑니다.</li>
                </ol>
              </article>

              <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
                <h3 className="text-lg font-semibold">프롬프트에 넣으면 좋은 요소</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
                  <li>카메라 움직임: 천천히 다가가기, 부드럽게 뒤로 빠지기</li>
                  <li>장면 움직임: 햇살 흔들림, 미소, 옷자락, 나뭇잎, 꽃장식</li>
                  <li>분위기: 따뜻한, 평안한, 초대하는, 정갈한</li>
                  <li>제한 조건: 글자 없이, 장면 전환 없이, 과하지 않게</li>
                </ul>
              </article>
            </div>

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">복사해서 바로 써도 되는 요청 예시</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  대표 이미지의 분위기를 유지하면서 인물과 햇살이 아주 천천히
                  자연스럽게 움직이는 짧은 홍보 영상으로 만들어줘. 카메라는
                  부드럽게 앞으로 다가가고, 따뜻하고 환영하는 분위기를 유지해줘.
                </div>
                <div className="rounded-2xl bg-[#f7f3ec] p-4 text-sm leading-7 text-[var(--foreground)]">
                  조용한 묵상 영상처럼 차분하게 움직여줘. 빛이 은은하게
                  흔들리고, 화면 전환 없이 한 장면 안에서 미세한 카메라 움직임만
                  들어가게 해줘.
                </div>
              </div>
            </article>

            <TaskFourVideoAssistant />

            <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
              <h3 className="text-lg font-semibold">다음 단계로 가져갈 것</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                가장 마음에 드는 영상 초안 1개를 저장해두세요. 마지막 단계에서는
                CapCut에서 자막과 마무리 문구를 넣어 완성 영상을 다듬게 됩니다.
              </p>
            </article>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-[var(--muted)]">
            <p>이 단계의 상세 실습 화면은 다음 순서로 확장할 예정입니다.</p>
            <ul className="space-y-2 text-sm leading-6 sm:text-base">
              <li>무엇을 만드는지</li>
              <li>복사해서 쓰는 프롬프트</li>
              <li>모델 선택 UI</li>
              <li>결과물 저장 안내</li>
              <li>다음 단계로 가져갈 준비물</li>
            </ul>
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between gap-3">
        <Link
          href={prevHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] px-5 text-sm font-semibold"
        >
          이전으로
        </Link>
        <Link
          href={nextHref}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          다음 단계
        </Link>
      </nav>
    </main>
  );
}
