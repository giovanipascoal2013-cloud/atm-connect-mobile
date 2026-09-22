import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcodeFactory from 'qrcode-generator'
import pngjs from 'pngjs'

const { PNG } = pngjs

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ── Config ─────────────────────────────────────────────────────────────
const URL = 'https://dinheiroemmao.com'
const EC_LEVEL = 'H'
const MODULE_SIZE = 14 // px por módulo
const QUIET_MODULES = 4
const LOGO_RATIO = 0.236 // tamanho do logo vs largura do núcleo do QR
const BRACKET_LENGTH_FACTOR = 6 // comprimento da quina em módulos
const BRACKET_THICKNESS = 18 // px
const BRACKET_GAP = 10 // px entre módulos (zona de silêncio) e start breathing

const MODULE_COLOR = { r: 17, g: 24, b: 39 } // #111827
const CORNER_COLOR = { r: 47, g: 123, b: 240 } // #2F7BF0

const LOGO_PATH = path.join(ROOT, 'assets', 'icon.png')
const OUT_PATH = path.join(ROOT, 'flyer-qr.png')
// ────────────────────────────────────────────────────────────────────────

const qr = qrcodeFactory(0, EC_LEVEL)
qr.addData(URL)
qr.make()

const n = qr.getModuleCount()

// Layout
const qzPx = QUIET_MODULES * MODULE_SIZE
const corePx = n * MODULE_SIZE
const bracketLen = BRACKET_LENGTH_FACTOR * MODULE_SIZE
const moduleStart = BRACKET_GAP + qzPx + BRACKET_GAP + bracketLen
const canvasSize = moduleStart + corePx + moduleStart
const frame = { x0: moduleStart - qzPx, x1: moduleStart + corePx + qzPx }

const png = new PNG({ width: canvasSize, height: canvasSize })
const setPx = (x, y, c, a = 255) => {
  if (x < 0 || y < 0 || x >= canvasSize || y >= canvasSize) return
  const i = (y * canvasSize + x) * 4
  png.data[i] = c.r
  png.data[i + 1] = c.g
  png.data[i + 2] = c.b
  png.data[i + 3] = a
}

const fillRect = (x0, y0, w, h, c) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(x, y, c)
}

const fillCircle = (cx, cy, r, c) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r) setPx(x, y, c)
    }
  }
}

const resample = (buf, size) => {
  const out = Buffer.alloc(size * size * 4)
  const s = buf.width
  for (let y = 0; y < size; y++) {
    const sy = Math.min(Math.floor((y / size) * s), s - 1)
    for (let x = 0; x < size; x++) {
      const sx = Math.min(Math.floor((x / size) * s), s - 1)
      const si = (sy * s + sx) * 4
      const di = (y * size + x) * 4
      out[di] = buf.data[si]
      out[di + 1] = buf.data[si + 1]
      out[di + 2] = buf.data[si + 2]
      out[di + 3] = buf.data[si + 3]
    }
  }
  return { width: size, height: size, data: out }
}

// 1) Módulos do QR
const m0 = moduleStart
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) fillRect(m0 + c * MODULE_SIZE, m0 + r * MODULE_SIZE, MODULE_SIZE, MODULE_SIZE, MODULE_COLOR)
  }
}

// 2) Logo central — disco branco + icon.png
const logoSize = Math.round(LOGO_RATIO * corePx)
const cx = canvasSize / 2
const cy = canvasSize / 2
fillCircle(cx, cy, logoSize * 0.68, { r: 255, g: 255, b: 255 })
const logo = resample(PNG.sync.read(fs.readFileSync(LOGO_PATH)), logoSize)
for (let y = 0; y < logoSize; y++) {
  for (let x = 0; x < logoSize; x++) {
    const i = (y * logoSize + x) * 4
    const a = logo.data[i + 3]
    if (a === 0) continue
    const dx = Math.round(cx - logoSize / 2) + x
    const dy = Math.round(cy - logoSize / 2) + y
    setPx(dx, dy, { r: logo.data[i], g: logo.data[i + 1], b: logo.data[i + 2] }, a)
  }
}

// 3) Quinas azuis (mira de câmara) nos 4 cantos
const T = BRACKET_THICKNESS
const L = bracketLen
const f0 = frame.x0
const f1 = frame.x1
const hL = Math.floor(T / 2)

// top-left
fillRect(f0, f0 - hL, L, T, CORNER_COLOR)
fillRect(f0 - hL, f0, T, L, CORNER_COLOR)
// top-right
fillRect(f1 - L, f0 - hL, L, T, CORNER_COLOR)
fillRect(f1 - hL, f0, T, L, CORNER_COLOR)
// bottom-left
fillRect(f0, f1 - hL, L, T, CORNER_COLOR)
fillRect(f0 - hL, f1 - L, T, L, CORNER_COLOR)
// bottom-right
fillRect(f1 - L, f1 - hL, L, T, CORNER_COLOR)
fillRect(f1 - hL, f1 - L, T, L, CORNER_COLOR)

fs.writeFileSync(OUT_PATH, PNG.sync.write(png))
console.log(
  `flyer-qr.png gerado → ${OUT_PATH}\n` +
    `  URL=${URL} | EC=${EC_LEVEL} | versão=${n}x${n} módulos\n` +
    `  ${canvasSize}x${canvasSize}px | cores: QR #111827, quinas #2F7BF0\n` +
    `  logo ${logoSize}px centrado (disco branco)`
)