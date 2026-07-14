"use client";

import { useEffect, useState } from "react";
import {
  refreshPublicGoodDirect,
  type PublicGoodDirectResult,
} from "@/app/_lib/public-good-direct";
import { createPublicGoodView } from "@/app/_lib/public-good-view";
import type { PublicGoodPerson } from "@/shared/contracts";

export function PublicGoodNotice() {
  const [result, setResult] = useState<PublicGoodDirectResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void refreshPublicGoodDirect()
      .then((nextResult) => {
        if (!active) return;
        setResult(nextResult);
        setSelectedId(nextResult.items[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setResult(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const view = createPublicGoodView(result, selectedId);
  if (!view) return null;
  const { people, selectedPerson } = view;

  return (
    <section className="public-good" aria-labelledby="public-good-title">
      <div className="public-good__heading">
        <p className="public-good__eyebrow">一处安静的关注</p>
        <h2 id="public-good-title">愿更多人被看见</h2>
      </div>
      <div className="public-good-portraits" aria-label="选择寻亲信息">
        {people.map((person) => {
          const selected = person.id === selectedPerson.id;
          return (
            <button
              key={person.id}
              type="button"
              className={selected ? "is-selected" : ""}
              aria-pressed={selected}
              onMouseEnter={() => setSelectedId(person.id)}
              onFocus={() => setSelectedId(person.id)}
              onClick={() => setSelectedId(person.id)}
            >
              <PublicGoodPhoto person={person} />
              <span>{person.name}</span>
            </button>
          );
        })}
      </div>
      <div className="public-good__detail" aria-live="polite">
        <div>
          <h3>{selectedPerson.name}</h3>
          <p>
            <strong>走失时间</strong>
            {selectedPerson.lostTime || "暂未提供"}
          </p>
          <p>
            <strong>走失地点</strong>
            {selectedPerson.lostPlace || "暂未提供"}
          </p>
          <p>
            <strong>体貌特征</strong>
            {selectedPerson.childFeature || "暂未提供"}
          </p>
        </div>
        {selectedPerson.detailUrl ? (
          <a href={selectedPerson.detailUrl} target="_blank" rel="noreferrer">
            查看详情<span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

function PublicGoodPhoto({ person }: { person: PublicGoodPerson }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="public-good__photo">
      {!failed && person.childPic ? (
        // Remote portrait domains vary by API record, so runtime image loading stays unoptimized.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.childPic}
          alt={`${person.name}的照片`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{getInitial(person.name)}</span>
      )}
    </span>
  );
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "寻";
}
