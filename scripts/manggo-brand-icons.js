const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'public', 'pwa');
const sizes = [180, 192, 512];

// 무채색(그레이스케일) 라운드 배경 + 벡터 망고. 브랜드 컬러 회남색(#4E5969) 톤.
function svg(size) {
  const rr = (size * 0.22 / size * 100).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5C6B7A"/>
      <stop offset="1" stop-color="#4E5969"/>
    </linearGradient>
    <linearGradient id="mango" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
      <stop offset="0" stop-color="#F2F4F6"/>
      <stop offset="0.55" stop-color="#D7DCE1"/>
      <stop offset="1" stop-color="#AEB6BE"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="${rr}" ry="${rr}" fill="url(#bg)"/>
  <path d="M50 20 C66 20 80 32 80 52 C80 72 64 84 48 84 C30 84 20 70 20 54 C20 34 34 20 50 20 Z" fill="url(#mango)" stroke="#8B95A0" stroke-width="2"/>
  <ellipse cx="42" cy="42" rx="10" ry="14" fill="#FFFFFF" opacity="0.5"/>
  <path d="M54 22 C58 12 70 10 76 14 C70 20 62 24 54 26 Z" fill="#9AA4AE" stroke="#6B7480" stroke-width="1.5"/>
  <path d="M53 22 C54 18 55 16 57 14" fill="none" stroke="#6B7480" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

(async () => {
  for (const s of sizes) {
    const out = path.join(OUT, `icon-${s}.png`);
    await sharp(Buffer.from(svg(s))).png().toFile(out);
    console.log(`wrote icon-${s}.png (${fs.statSync(out).size} bytes)`);
  }
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
