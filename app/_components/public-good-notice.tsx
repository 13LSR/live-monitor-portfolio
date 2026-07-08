/* eslint-disable @next/next/no-img-element */
"use client";

import { startTransition, useEffect, useState } from "react";
import { Button, Card, Tag } from "animal-island-ui";
import {
  getPublicGood,
  getPublicGoodFallbackBatch,
} from "@/app/_lib/api-client";
import type { PublicGoodPerson } from "@/shared/contracts";

export function PublicGoodNotice() {
  const [batch, setBatch] = useState(getPublicGoodFallbackBatch);
  const [selectedId, setSelectedId] = useState(batch.items[0]?.id ?? "");
  const items = batch.items.slice(0, 5);
  const selectedPerson =
    items.find((person) => person.id === selectedId) ?? items[0];

  useEffect(() => {
    let mounted = true;

    getPublicGood().then((nextBatch) => {
      if (!mounted) {
        return;
      }

      startTransition(() => {
        setBatch(nextBatch);
        setSelectedId(nextBatch.items[0]?.id ?? "");
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  function selectPerson(person: PublicGoodPerson) {
    setSelectedId(person.id);
  }

  return (
    <section
      aria-labelledby="public-good-title"
      className="mb-10 rounded-[2rem] border border-[var(--line)] bg-[#fff7df] p-4 shadow-[8px_8px_0_rgba(31,37,35,0.18)] md:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase text-[var(--muted)]">
            Public notice
          </p>
          <h2
            id="public-good-title"
            className="mt-1 text-2xl font-semibold text-[var(--ink)] md:text-3xl"
          >
            公益公告
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <Tag color="app-teal" variant="outlined" size="small">
            {batch.sourceName}
          </Tag>
          {batch.isFallback ? (
            <span className="leading-5">{batch.message}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {items.map((person) => {
            const selected = person.id === selectedPerson.id;

            return (
              <button
                key={person.id}
                type="button"
                onMouseEnter={() => selectPerson(person)}
                onClick={() => selectPerson(person)}
                className={`flex min-w-40 items-center gap-3 rounded-full border px-3 py-2 text-left transition ${
                  selected
                    ? "border-[var(--line)] bg-[#f7d879] shadow-[4px_4px_0_rgba(31,37,35,0.22)]"
                    : "border-[rgba(31,37,35,0.22)] bg-[#fffaf0] hover:border-[var(--line)]"
                }`}
              >
                <PublicGoodPhoto
                  src={person.childPic}
                  alt={person.name}
                  compact
                  className="h-14 w-14 shrink-0 rounded-full text-sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                    {person.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--muted)]">
                    {person.lostTime || "时间暂缺"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <Card
          color="app-yellow"
          pattern="app-yellow"
          className="min-w-0 border border-[var(--line)] p-4 md:p-5"
        >
          {selectedPerson ? (
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <PublicGoodPhoto
                src={selectedPerson.childPic}
                alt={selectedPerson.name}
                className="aspect-[4/5] rounded-2xl text-sm"
              />

              <div className="min-w-0 space-y-3">
                <div>
                  <p className="font-mono text-xs uppercase text-[var(--muted)]">
                    {selectedPerson.sex || "信息待补充"}
                  </p>
                  <h3 className="mt-1 break-words text-2xl font-semibold text-[var(--ink)]">
                    {selectedPerson.name}
                  </h3>
                </div>
                <dl className="grid gap-2 text-sm leading-6 text-[var(--ink)]">
                  <NoticeRow label="出生时间" value={selectedPerson.birthTime} />
                  <NoticeRow label="走失时间" value={selectedPerson.lostTime} />
                  <NoticeRow label="走失地点" value={selectedPerson.lostPlace} />
                </dl>
                <p className="break-words text-sm leading-6 text-[var(--muted)]">
                  {selectedPerson.childFeature || "暂无特征摘要。"}
                </p>
                <Button
                  htmlType="button"
                  type="primary"
                  size="small"
                  disabled={!selectedPerson.detailUrl}
                  onClick={() => {
                    if (selectedPerson.detailUrl) {
                      window.open(
                        selectedPerson.detailUrl,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }
                  }}
                >
                  查看详情
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}

function NoticeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{value || "暂缺"}</dd>
    </div>
  );
}

function PublicGoodPhoto({
  src,
  alt,
  compact = false,
  className,
}: {
  src: string | null;
  alt: string;
  compact?: boolean;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden border border-[var(--line)] bg-[#dfe7dd] font-semibold text-[var(--muted)] ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : compact ? (
        <span className="text-[var(--ink)]">{getAvatarText(alt)}</span>
      ) : (
        <span className="px-4 text-center">暂无照片</span>
      )}
    </div>
  );
}

function getAvatarText(name: string) {
  return name.trim().slice(0, 2) || "公益";
}
