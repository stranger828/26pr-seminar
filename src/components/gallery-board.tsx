"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { GalleryItem } from "@/lib/gallery-store";

const filters = [
  { id: "all", label: "전체" },
  { id: "1", label: "실습1" },
  { id: "2", label: "실습2" },
  { id: "3", label: "실습3" },
  { id: "4", label: "실습4" },
] as const;

type FilterId = (typeof filters)[number]["id"];

export default function GalleryBoard({ items }: { items: GalleryItem[] }) {
  const [selectedFilter, setSelectedFilter] = useState<FilterId>("all");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const filteredItems = useMemo(() => {
    if (selectedFilter === "all") return items;
    return items.filter((item) => item.taskStep === selectedFilter);
  }, [items, selectedFilter]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = selectedFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--muted)]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full rounded-[1.5rem] border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
            아직 저장된 결과물이 없습니다. 실습을 완료하면 여기에 자동으로 모입니다.
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white text-left transition hover:-translate-y-0.5"
            >
              <div className="aspect-square overflow-hidden bg-[#f8f5ef]">
                {item.type === "image" && item.assetUrl ? (
                  <Image
                    src={item.assetUrl}
                    alt={item.taskTitle}
                    width={800}
                    height={800}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : item.type === "video" && item.assetUrl ? (
                  <video className="h-full w-full object-cover" muted playsInline>
                    <source src={item.assetUrl} type={item.mimeType || "video/mp4"} />
                  </video>
                ) : item.type === "audio" ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-[var(--muted)]">
                    오디오 결과물
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm leading-6 text-[var(--muted)]">
                    {item.resultText?.slice(0, 120) || "텍스트 결과물"}
                  </div>
                )}
              </div>
              <div className="border-t border-[var(--line)] px-3 py-3">
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--olive)] uppercase">
                  {item.taskTitle}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--foreground)]">
                  {item.prompt}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[2rem] bg-[var(--card)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium tracking-[0.14em] text-[var(--olive)] uppercase">
                  {selectedItem.taskTitle}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {selectedItem.provider === "openai" ? "OpenAI" : "Gemini"} 결과물
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-white">
              {selectedItem.type === "image" && selectedItem.assetUrl ? (
                <Image
                  src={selectedItem.assetUrl}
                  alt={selectedItem.taskTitle}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              ) : null}
              {selectedItem.type === "video" && selectedItem.assetUrl ? (
                <video controls className="aspect-video w-full bg-black" playsInline>
                  <source src={selectedItem.assetUrl} type={selectedItem.mimeType || "video/mp4"} />
                </video>
              ) : null}
              {selectedItem.type === "audio" && selectedItem.assetUrl ? (
                <div className="p-6">
                  <audio controls className="w-full">
                    <source src={selectedItem.assetUrl} type={selectedItem.mimeType || "audio/wav"} />
                  </audio>
                </div>
              ) : null}
              {selectedItem.type === "text" ? (
                <div className="whitespace-pre-wrap p-6 text-sm leading-7">
                  {selectedItem.resultText}
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-4">
                <p className="text-sm font-medium text-[var(--muted)]">사용한 프롬프트</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {selectedItem.prompt}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-4">
                <p className="text-sm font-medium text-[var(--muted)]">추가 설명</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {selectedItem.secondaryPrompt || "추가 설명 없이 저장된 결과물입니다."}
                </p>
                <p className="mt-4 text-xs text-[var(--muted)]">
                  저장 시각: {new Date(selectedItem.createdAt).toLocaleString("ko-KR")}
                </p>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
