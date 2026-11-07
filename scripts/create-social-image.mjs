import sharp from "sharp";
import { fileURLToPath } from "node:url";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#141d32"/><stop offset="1" stop-color="#070911"/></linearGradient><linearGradient id="line"><stop stop-color="#7cc5d2"/><stop offset="1" stop-color="#ba668d"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<g fill="none" stroke="#395168" opacity=".5"><path d="M0 490H1200M0 530H1200M0 580H1200M600 350L150 630M600 350L400 630M600 350L800 630M600 350L1050 630"/><path d="M870 70L1090 150V390L870 310ZM850 90L1070 170V410L850 330Z"/></g>
<path d="M68 80H1132" stroke="url(#line)" stroke-width="2"/>
<text x="70" y="133" fill="#9aafc6" font-family="sans-serif" font-size="18" letter-spacing="5">INDEPENDENT MAKER / DIGITAL SPACE</text>
<text x="62" y="322" fill="#dce4ef" font-family="sans-serif" font-weight="800" font-size="148" letter-spacing="-8">XIAOJIA</text>
<text x="73" y="389" fill="#9dbbce" font-family="sans-serif" font-size="29">Small ideas. Real experiences.</text>
<rect x="72" y="453" width="205" height="44" rx="22" fill="#18303b" stroke="#6298aa"/><text x="97" y="482" fill="#b7d8e0" font-family="sans-serif" font-size="17" letter-spacing="2">LIVE PORTFOLIO</text>
<text x="72" y="572" fill="#8c9db1" font-family="sans-serif" font-size="18">proj.331106.xyz</text>
<circle cx="1094" cy="566" r="6" fill="#86c7ad"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL("../public/social-card.png", import.meta.url)));
