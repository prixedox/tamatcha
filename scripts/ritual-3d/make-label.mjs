import sharp from 'sharp'
// Cup wrap texture: 2048 wide (wraps 360°) x 1024 tall. Two identical panels so
// the wordmark faces the camera twice per rotation (makes the spin read).
const W = 2048, H = 1024
const whisk = (cx, cy, s) => `
  <g transform="translate(${cx},${cy}) scale(${s})" fill="none" stroke="#ECE6D7" stroke-width="2.1" stroke-linecap="round">
    <path d="M16 9c-4 2-6 6-6 12"/><path d="M16 9c0 6 0 9 0 12"/><path d="M16 9c4 2 6 6 6 12"/><path d="M15 8l6-2"/>
  </g>`
const panel = (ox) => `
  ${whisk(ox + 512 - 16 * 3.4, 250, 3.4)}
  <text x="${ox + 512}" y="560" font-family="sans-serif" font-weight="800" font-size="168" fill="#ECE6D7" text-anchor="middle" letter-spacing="1">tamatcha</text>
  <text x="${ox + 512}" y="648" font-family="sans-serif" font-weight="700" font-size="40" fill="#9FCB50" text-anchor="middle" letter-spacing="16">MATCHA BAR · OSTRAVA</text>
  <line x1="${ox + 330}" y1="720" x2="${ox + 694}" y2="720" stroke="#9FCB50" stroke-width="3" opacity="0.7"/>
  <text x="${ox + 512}" y="800" font-family="sans-serif" font-weight="600" font-size="34" fill="#ECE6D7" text-anchor="middle" letter-spacing="8" opacity="0.75">PRÉMIOVÁ · ČERSTVĚ NAŠLEHÁNO</text>`
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#123528"/>
  <rect width="${W}" height="10" y="0" fill="#5E8A34"/>
  <rect width="${W}" height="10" y="${H - 10}" fill="#5E8A34"/>
  ${panel(0)}${panel(1024)}
</svg>`
await sharp(Buffer.from(svg)).png().toFile('/tmp/claude-1000/-home-martin-projects-tamatcha/76f1450b-16fd-4142-83e0-83b82fb8c091/scratchpad/r3d/label.png')
console.log('label.png written')
