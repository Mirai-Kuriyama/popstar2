import type { Layout } from '../core/types';

/** 预加载的图片资源 */
export interface GameImages {
  background: HTMLImageElement;
  block: HTMLImageElement;
  select: HTMLImageElement;
  flash: HTMLImageElement;
  star: HTMLImageElement;
  good: HTMLImageElement;
  cool: HTMLImageElement;
  fantastic: HTMLImageElement;
  clear: HTMLImageElement;
  mushroom: HTMLImageElement;
}

const IMAGE_PATHS: Record<keyof GameImages, string> = {
  background: 'img/background.png',
  block: 'img/block.png',
  select: 'img/select.png',
  flash: 'img/flash.png',
  star: 'img/star.png',
  good: 'img/good.png',
  cool: 'img/cool.png',
  fantastic: 'img/fantastic.png',
  clear: 'img/clear.png',
  mushroom: 'img/mushroom.png',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

/** 加载全部图片资源 */
export async function loadAllImages(): Promise<GameImages> {
  const images: Partial<GameImages> = {};
  const entries = Object.entries(IMAGE_PATHS) as [keyof GameImages, string][];
  await Promise.all(
    entries.map(async ([key, path]) => {
      images[key] = await loadImage(path);
    })
  );
  return images as GameImages;
}

/**
 * 预渲染星星 sprite 到离屏 canvas
 * 原 sprite 图为 6 颗星星横向排列，每颗 50×50
 */
export function prerenderStarSprites(starImg: HTMLImageElement): HTMLCanvasElement[] {
  const sprites: HTMLCanvasElement[] = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('canvas');
    c.width = 50;
    c.height = 50;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(starImg, i * 50, 0, 50, 50, 0, 0, 50, 50);
    sprites.push(c);
  }
  return sprites;
}

/**
 * 预渲染背景到离屏 canvas（避免每帧缩放大图）
 * 在 resize 时调用
 */
export function prerenderBackground(
  bgImg: HTMLImageElement,
  layout: Layout
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = layout.canvasWidth;
  c.height = layout.canvasHeight;
  const ctx = c.getContext('2d')!;
  // 原始背景图尺寸 768×1024
  ctx.drawImage(bgImg, 0, 0, 768, 1024, 0, 0, layout.canvasWidth, layout.canvasHeight);
  return c;
}
