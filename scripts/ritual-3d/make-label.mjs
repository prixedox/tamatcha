import sharp from 'sharp'
// Cup wrap: 2048 wide (wraps 360°) x 1024 tall. TWO panels: a clean, large
// "tamatcha" wordmark faces the viewer at the front of each half-turn, with the
// whisk mark + tagline filling the rest so the cup always looks branded.
const W = 2048, H = 1024, PW = W / 2
const whisk = (cx, cy, s) => `
  <g transform="translate(${cx},${cy}) scale(${s})" fill="none" stroke="#ECE6D7" stroke-width="2.1" stroke-linecap="round">
    <path d="M16 9c-4 2-6 6-6 12"/><path d="M16 9c0 6 0 9 0 12"/><path d="M16 9c4 2 6 6 6 12"/><path d="M15 8l6-2"/>
  </g>`
const panel = (ox) => `
  ${whisk(ox + PW / 2 - 16 * 3.6, 235, 3.6)}
  <text x="${ox + PW / 2}" y="585" font-family="sans-serif" font-weight="800" font-size="196" fill="#ECE6D7" text-anchor="middle" letter-spacing="1">tamatcha</text>
  <text x="${ox + PW / 2}" y="682" font-family="sans-serif" font-weight="700" font-size="46" fill="#9FCB50" text-anchor="middle" letter-spacing="16">MATCHA BAR · OSTRAVA</text>`
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#123528"/>
  <rect width="${W}" height="11" y="0" fill="#5E8A34"/>
  <rect width="${W}" height="11" y="${H - 11}" fill="#5E8A34"/>
  ${panel(0)}${panel(PW)}
</svg>`
await sharp(Buffer.from(svg)).png().toFile('/tmp/claude-1000/-home-martin-projects-tamatcha/76f1450b-16fd-4142-83e0-83b82fb8c091/scratchpad/r3d/label.png')
console.log('label.png written (2 clean panels, large wordmark)')
