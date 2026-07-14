"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function PortfolioHero() {
  const [isHintHidden, setIsHintHidden] = useState(false);

  useEffect(() => {
    const updateHint = () => setIsHintHidden(window.scrollY > 70);
    const frame = window.requestAnimationFrame(updateHint);

    window.addEventListener("scroll", updateHint, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateHint);
    };
  }, []);

  const scrollToWork = () => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    document.getElementById("featured-work")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section className="portfolio-hero" aria-labelledby="portfolio-title">
      <div className="portfolio-hero__inner">
        <div className="portfolio-hero__copy portfolio-hero__enter">
          <h1 id="portfolio-title">小茄的网站作品集</h1>
          <p>收录站长正在运行的网站作品，也记录每一次认真完成的创作。</p>
        </div>
        <div className="portfolio-hero__art portfolio-hero__enter">
          <Image
            src="/portfolio/animal-icon.png"
            alt="小茄的网站作品集双角色插画"
            width={1634}
            height={1163}
            priority
            sizes="(max-width: 767px) 88vw, 48vw"
          />
        </div>
      </div>
      <button
        type="button"
        className={`portfolio-scroll-hint${isHintHidden ? " is-hidden" : ""}`}
        onClick={scrollToWork}
        aria-hidden={isHintHidden}
        tabIndex={isHintHidden ? -1 : 0}
      >
        <span>向下看看</span>
        <span className="portfolio-scroll-hint__arrow" aria-hidden="true" />
      </button>
    </section>
  );
}
