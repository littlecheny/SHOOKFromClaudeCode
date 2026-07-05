// 生成 macOS 菜单栏模板图标（黑色 + alpha）：一架朝正右的直升机剪影。
// 产出 trayIconTemplate.png (18x18) 与 trayIconTemplate@2x.png (36x36)。
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0 // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRect(px, py, x0, y0, x1, y1, r = 0) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false
  if (r <= 0) return true
  const cx = Math.min(Math.max(px, x0 + r), x1 - r)
  const cy = Math.min(Math.max(py, y0 + r), y1 - r)
  const inCorner = px < x0 + r || px > x1 - r || py < y0 + r || py > y1 - r
  if (!inCorner) return true
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

function inEllipse(px, py, cx, cy, rx, ry) {
  return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1
}

function inPoly(px, py, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// 直升机（机头朝右），18 网格坐标下的部件判定
function inHeli(px, py, s) {
  const x = px / s
  const y = py / s

  // 主旋翼：顶部水平桨叶
  if (inRect(x, y, 2.0, 3.9, 16.0, 4.9, 0.4)) return true
  // 旋翼桅杆：机身顶连到桨叶
  if (inRect(x, y, 8.7, 4.6, 9.6, 7.4)) return true
  // 机身：椭圆，机头偏右
  if (inEllipse(x, y, 10.2, 9.4, 4.3, 2.7)) return true
  // 尾梁：机身左后向左渐窄
  if (inPoly(x, y, [[6.6, 8.2], [6.6, 10.2], [1.5, 9.4], [1.5, 8.8]])) return true
  // 尾桨 / 垂尾：尾端竖片
  if (inRect(x, y, 0.9, 6.5, 1.9, 10.4, 0.3)) return true
  // 起落橇：横杆
  if (inRect(x, y, 6.8, 13.0, 14.2, 13.8, 0.3)) return true
  // 起落橇支腿
  if (inRect(x, y, 8.2, 12.0, 8.9, 13.2)) return true
  if (inRect(x, y, 12.1, 12.0, 12.8, 13.2)) return true

  return false
}

function drawIcon(size) {
  const s = size / 18
  const rgba = Buffer.alloc(size * size * 4)
  const SS = 4 // 每像素 4x4 超采样

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          if (inHeli(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, s)) hits++
        }
      }
      const alpha = Math.round((hits / (SS * SS)) * 255)
      const offset = (y * size + x) * 4
      rgba[offset] = 0
      rgba[offset + 1] = 0
      rgba[offset + 2] = 0
      rgba[offset + 3] = alpha
    }
  }
  return encodePNG(size, size, rgba)
}

writeFileSync(join(here, 'trayIconTemplate.png'), drawIcon(18))
writeFileSync(join(here, 'trayIconTemplate@2x.png'), drawIcon(36))
console.log('tray icons generated')
