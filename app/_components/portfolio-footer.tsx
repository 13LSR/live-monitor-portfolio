import Link from "next/link";

export function PortfolioFooter() {
  return (
    <footer className="portfolio-footer">
      <p>认真完成，也持续生长。</p>
      <div className="portfolio-footer__links">
        <p>小茄的网站作品集</p>
        <Link href="/demo" className="portfolio-footer__demo-link">
          评审导览
        </Link>
      </div>
    </footer>
  );
}
