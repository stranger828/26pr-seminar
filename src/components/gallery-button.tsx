import Link from "next/link";

export default function GalleryButton() {
  return (
    <div className="mt-6 flex justify-center">
      <Link
        href="/gallery"
        className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-6 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
      >
        갤러리
      </Link>
    </div>
  );
}
