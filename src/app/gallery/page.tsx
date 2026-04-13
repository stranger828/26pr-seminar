import { connection } from "next/server";
import Link from "next/link";
import GalleryBoard from "@/components/gallery-board";
import { listGalleryItems, type GalleryItem } from "@/lib/gallery-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GalleryPage() {
  await connection();

  let items: GalleryItem[] = [];

  try {
    items = await listGalleryItems();
  } catch (error) {
    console.error("Failed to load gallery items:", error);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
              갤러리 게시판
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              실습 결과물을 한눈에 모아보세요
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
              실습 1부터 4까지 생성된 텍스트, 이미지, 오디오, 영상을 자동으로 저장합니다.
              항목을 클릭하면 사용한 프롬프트도 함께 확인할 수 있습니다.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 text-sm font-semibold"
          >
            홈으로
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] px-5 py-6 shadow-[0_18px_40px_rgba(73,52,30,0.06)] sm:px-8">
        <GalleryBoard items={items} />
      </section>
    </main>
  );
}
