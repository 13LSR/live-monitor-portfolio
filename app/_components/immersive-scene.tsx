"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { createSceneRuntime } from "@/app/_lib/scene/scene-runtime";
import { afterPaint } from "@/app/_lib/after-paint";
import { introSession } from "@/app/_lib/scene/intro-session";
import type { SceneView } from "@/app/_lib/scene/camera-flight";
import { HomeGallery } from "@/app/_components/home-gallery";
import { usePortfolioData } from "@/app/_components/portfolio-data";
import type { NpcDialogue } from "@/app/_lib/scene/scene-npcs";

const directions = [
  { key: "w", arrow: "↑", label: "向前" },
  { key: "a", arrow: "←", label: "向左" },
  { key: "s", arrow: "↓", label: "向后" },
  { key: "d", arrow: "→", label: "向右" },
];

export function ImmersiveScene({ view }: { view: SceneView }) {
  const { sites, isLoading } = usePortfolioData();
  const hostRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof createSceneRuntime> | null>(null);
  const router = useRouter();
  const initialView = useRef(view);
  const countdown = useSyncExternalStore(introSession.subscribe, introSession.getSnapshot, introSession.getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [dialogue, setDialogue] = useState<NpcDialogue | null>(null);
  const tutorialVisible = view === "home" && countdown > 0;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    if (initialView.current === "home") introSession.start();
    else introSession.finish();
    const cancelStart = afterPaint(() => {
      void import("@/app/_lib/scene/scene-runtime").then(({ createSceneRuntime }) => {
        if (cancelled) return;
        runtime.current = createSceneRuntime(host, {
          onReady: () => { setReady(true); setPressedKeys([]); },
          onKeys: setPressedKeys,
          onDialogue: setDialogue,
        }, initialView.current);
      }).catch((error) => {
        if (cancelled) return;
        console.error("3D 场景暂时无法启动", error);
        setUnavailable(true);
        introSession.finish();
      });
    });
    return () => { cancelled = true; cancelStart(); runtime.current?.dispose(); runtime.current = null; };
  }, []);

  useEffect(() => { initialView.current = view; runtime.current?.setView(view); }, [view]);

  // Keep the keyboard tutorial usable while the WebGL chunk downloads.
  useEffect(() => {
    if (view !== "home") return;
    const keys = new Set<string>();
    const keyMap: Record<string, string> = { KeyW: "w", ArrowUp: "w", KeyA: "a", ArrowLeft: "a", KeyS: "s", ArrowDown: "s", KeyD: "d", ArrowRight: "d", Space: "space" };
    const change = (event: KeyboardEvent) => {
      if (runtime.current || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = keyMap[event.code];
      if (!key) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === "keydown") keys.add(key); else keys.delete(key);
      setPressedKeys([...keys]);
    };
    window.addEventListener("keydown", change, true);
    window.addEventListener("keyup", change, true);
    return () => { window.removeEventListener("keydown", change, true); window.removeEventListener("keyup", change, true); };
  }, [view]);
  const enterWorks = () => { introSession.finish(); router.push("/works"); };

  return (
    <section ref={hostRef} data-view={view} className={`immersive-scene${tutorialVisible ? " is-tutorial" : ""}${unavailable ? " is-unavailable" : ""}`} aria-label="3D 创作空间">
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-scanlines" aria-hidden="true" />
      <HomeGallery active={view === "home" && !tutorialVisible} />
      <div className="scene-identity">
        <p>独立创作者 · 好奇心驱动</p>
        <p>WEB DEVELOPMENT<br />&amp; INTERACTIVE EXPERIENCES</p>
        <span>把想法，做成可以体验的作品。</span>
      </div>

      <div className="immersive-scene__controls" aria-label="移动控制" inert={view !== "home"}>
        <div className="scene-control-row">
          <div className="immersive-scene__dpad">
            {directions.map(({ key, arrow, label }) => <button key={key} type="button" data-control={key} className={pressedKeys.includes(key) ? "is-pressed" : ""} aria-label={label}>{arrow}</button>)}
          </div>
          <span>移动 <small>WASD / ARROWS</small></span>
        </div>
        <div className="scene-control-row">
          <button type="button" className={`immersive-scene__jump${pressedKeys.includes("space") ? " is-pressed" : ""}`} data-control="space">SPACE</button>
          <span>跳跃 <small>JUMP</small></span>
        </div>
      </div>

      {tutorialVisible ? (
        <div className="scene-tutorial" aria-label="入场操作引导">
          <div className="scene-tutorial__wordmark" aria-hidden="true">XIAOJIA</div>
          <p className="scene-tutorial__intro">在进入之前，试着动一动。</p>
          <div className="scene-tutorial__movement">
            <div className="scene-tutorial__keys">
              {directions.map(({ key, arrow, label }) => <button key={key} type="button" data-control={key} className={pressedKeys.includes(key) ? "is-pressed" : ""} aria-label={label}><span>{arrow}</span><small>{key.toUpperCase()}</small></button>)}
            </div>
            <p>移动 <span>MOVE</span></p>
          </div>
          <div className="scene-tutorial__jump">
            <button type="button" data-control="space" className={pressedKeys.includes("space") ? "is-pressed" : ""}>SPACE <span>⎵</span></button>
            <p>跳跃 <span>JUMP</span></p>
          </div>
          <p className="scene-tutorial__countdown" role="status"><strong>{String(countdown).padStart(2, "0")}</strong><span>秒后自动进入<br /><small>无需完成全部操作</small></span></p>
          <button type="button" className="scene-tutorial__skip" onClick={introSession.finish}>跳过引导 <span aria-hidden="true">↗</span></button>
        </div>
      ) : null}

      <div className="scene-npc-overlay" inert={view !== "home" || tutorialVisible || !dialogue}>
        <div className="scene-dialogue" hidden={!dialogue?.text}>
          <strong>{dialogue?.name ?? ""}</strong>
          <p role="status" aria-live="polite" aria-atomic="true">{dialogue?.text ?? ""}</p>
        </div>
        <button type="button" className="scene-interaction-hint" hidden={!dialogue || !!dialogue.text}
          aria-label={`与${dialogue?.name ?? "附近角色"}交谈`} aria-keyshortcuts="F" onClick={() => runtime.current?.interact()}>
          <kbd>F</kbd><span>交谈</span>
        </button>
      </div>
      {unavailable ? <p className="scene-unavailable">当前设备暂时无法显示 3D 场景，可以直接浏览作品。</p> : null}
      {!ready && !unavailable && !tutorialVisible ? <p className="scene-unavailable" role="status">场景正在载入，可以先浏览作品。</p> : null}
      <div className="scene-footer" inert={view !== "home"}>
        <p className="immersive-scene__hint">拖动转动视角 · 靠近角色按 F 交谈 <span>DRAG TO LOOK AROUND</span></p>
        <div className="scene-footer__works">
          <span>{isLoading ? "正在打开作品…" : `${String(sites.length).padStart(2, "0")} 个网站 · 持续生长`}</span>
          <button type="button" className="immersive-scene__portal-link" onClick={enterWorks}>浏览作品 <span aria-hidden="true">↗</span></button>
          <small>悬停旋转 · 拖动图库 · 点击封面</small>
        </div>
        <span className="scene-footer__coordinate" aria-hidden="true">XQ — DIGITAL DISTRICT / 01</span>
      </div>
    </section>
  );
}
