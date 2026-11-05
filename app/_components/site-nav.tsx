"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { introSession } from "@/app/_lib/scene/intro-session";

const items = [
  { href: "/", label: "首页" },
  { href: "/works", label: "作品" },
  { href: "/about", label: "关于" },
];

export function SiteNav() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") introSession.finish();
  }, [pathname]);

  return (
    <nav className="site-nav" aria-label="主导航">
      <Link href="/" className="site-nav__brand" aria-label="小茄，首页">
        <span>小茄 <sup>©</sup> 26′</span>
      </Link>
      <div className="site-nav__links">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "is-active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
                if (item.href !== "/") introSession.finish();

              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
