import type { PlayerColor } from '../../types/game'

// === 精靈圖預渲染快取 ===
// key: "charIndex_colorIndex"
const coloredSheets = new Map<string, CanvasImageSource>()

function sheetKey(charIndex: number, colorIndex: number): string {
  return `${charIndex}_${colorIndex}`
}

export function initSpriteCache(
  characterSheets: HTMLImageElement[],
  colors: PlayerColor[],
): void {
  coloredSheets.clear()

  for (let charIdx = 0; charIdx < characterSheets.length; charIdx++) {
    const sheet = characterSheets[charIdx]
    if (!sheet) continue

    // 原色版本（hueRotation=0）
    coloredSheets.set(sheetKey(charIdx, 0), sheet)

    // 各顏色變體
    for (let colorIdx = 0; colorIdx < colors.length; colorIdx++) {
      const color = colors[colorIdx]!
      if (color.hueRotation === 0) continue

      const offscreen = document.createElement('canvas')
      offscreen.width = sheet.width
      offscreen.height = sheet.height
      const offCtx = offscreen.getContext('2d')!
      offCtx.filter = `hue-rotate(${color.hueRotation}deg)`
      offCtx.drawImage(sheet, 0, 0)
      coloredSheets.set(sheetKey(charIdx, colorIdx), offscreen)
    }
  }
}

export function getColoredSheet(charIndex: number, colorIndex: number): CanvasImageSource {
  return coloredSheets.get(sheetKey(charIndex, colorIndex))
    ?? coloredSheets.get(sheetKey(charIndex, 0))
    ?? coloredSheets.get(sheetKey(0, 0))!
}

export function clearSpriteCache(): void {
  coloredSheets.clear()
}
