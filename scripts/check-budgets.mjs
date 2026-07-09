import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const dir = 'dist/assets'
let jsTotal = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue
  const gz = gzipSync(readFileSync(`${dir}/${f}`)).length
  jsTotal += gz
  console.log(`${f}: ${(gz / 1024).toFixed(1)} kB gz`)
}
console.log(`TOTAL JS: ${(jsTotal / 1024).toFixed(1)} kB gz (budget 120)`)
if (jsTotal > 120 * 1024) {
  console.error('BUDGET EXCEEDED')
  process.exit(1)
}
