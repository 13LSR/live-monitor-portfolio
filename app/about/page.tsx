import Link from "next/link";
import { SiteNav } from "@/app/_components/site-nav";

export default function AboutPage() {
  return (
    <main className="public-page--about">
      <SiteNav />
      <section className="about-content" aria-labelledby="about-title">
        <p className="about-content__eyebrow">INDEPENDENT MAKER / ALWAYS CURIOUS</p>
        <h1 id="about-title"><span aria-hidden="true">XIAOJIA</span><span className="sr-only">你好，我是小茄。</span><sup>小茄</sup></h1>
        <div className="about-content__columns">
          <div>
            <h2>你好，我是小茄。<br />喜欢把好奇心，写成代码。</h2>
            <p>这里记录我做过并持续维护的网站。从一个小小的想法，到第一个可以打开的页面，再到真实运行的作品，这个过程总能让我保持兴奋。</p>
            <p>我关注网站、在线工具与 AI 应用，也喜欢探索交互的可能性。希望做出的东西既有趣，也能在某个时刻帮上忙。</p>
          </div>
          <div>
            <span>01 / CREATE</span>
            <p>把想法做成可以体验的东西。<br />从一页网站开始，一点点完善。</p>
            <span>02 / KEEP IT ALIVE</span>
            <p>上线以后，故事还在继续。<br />保持运行、观察反馈、持续迭代。</p>
            <span>03 / EXPLORE</span>
            <p>保持好奇，继续尝试。<br />下一件作品，也许就来自一次偶然的灵感。</p>
          </div>
        </div>
        <footer className="about-content__footer">
          <Link className="about-content__link" href="/works">[ 浏览作品 ↗ ]</Link>
          <p>一个持续生长的个人空间。<br /><span>SMALL IDEAS. REAL EXPERIENCES.</span></p>
        </footer>
      </section>
    </main>
  );
}
