import type { Block, FlashParticle, FlyingText, Particle, Layout } from '../core/types';
import type { GameImages } from './AssetLoader';

/**
 * Canvas 2D 渲染器
 * - devicePixelRatio 适配（Retina 清晰渲染）
 * - 离屏背景缓存
 * - 分层绘制
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private layout: Layout;
  private bgCanvas: HTMLCanvasElement | null = null;
  private starSprites: HTMLCanvasElement[] = [];
  private images: GameImages;

  constructor(canvas: HTMLCanvasElement, images: GameImages) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.images = images;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.layout = { canvasWidth: 0, canvasHeight: 0, blockSize: 0, offsetTop: 0, offsetLeft: 0 };
  }

  /** 设置星星 sprite（预渲染后的离屏 canvas） */
  setStarSprites(sprites: HTMLCanvasElement[]): void {
    this.starSprites = sprites;
  }

  /** 设置背景缓存 */
  setBackgroundCache(bg: HTMLCanvasElement): void {
    this.bgCanvas = bg;
  }

  getLayout(): Layout {
    return this.layout;
  }

  getDpr(): number {
    return this.dpr;
  }

  /**
   * 计算布局并设置 Canvas 尺寸（含 DPR 适配）
   * 返回是否需要重绘背景
   */
  resize(windowWidth: number, windowHeight: number, safeBottom: number): boolean {
    const scale = 640 / 540;
    const availHeight = windowHeight - safeBottom;

    // 计算 canvas 逻辑尺寸
    let cw = 0;
    let ch = 0;
    let i = 0;
    let j = 0;
    while (true) {
      i += 1;
      j += scale;
      if (i > windowWidth) {
        cw = windowWidth;
        ch = availHeight;
        break;
      } else if (j > availHeight) {
        cw = i;
        ch = availHeight;
        break;
      }
    }

    this.layout.canvasWidth = cw;
    this.layout.canvasHeight = ch;
    this.layout.offsetLeft = 0.037 * cw;
    this.layout.blockSize = (cw - this.layout.offsetLeft * 2) / 10;
    this.layout.offsetTop = ch - 10 * this.layout.blockSize;

    // 设置 Canvas 物理尺寸（DPR 缩放）
    this.canvas.width = Math.round(cw * this.dpr);
    this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';

    // 重置变换矩阵，按 DPR 缩放
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.font = this.layout.blockSize * 0.6 + "px feltregular";
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    return true; // 总是需要重绘背景
  }

  getBlockSize(): number {
    return this.layout.blockSize;
  }

  getOffsetTop(): number {
    return this.layout.offsetTop;
  }

  getOffsetLeft(): number {
    return this.layout.offsetLeft;
  }

  getCanvasWidth(): number {
    return this.layout.canvasWidth;
  }

  getCanvasHeight(): number {
    return this.layout.canvasHeight;
  }

  // ===== 绘制方法 =====

  /** 绘制背景 */
  drawBackground(): void {
    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0);
    } else {
      this.ctx.drawImage(this.images.background, 0, 0, 768, 1024, 0, 0, this.layout.canvasWidth, this.layout.canvasHeight);
    }
  }

  /** 绘制所有方块 */
  drawBlocks(blocks: Block[][], blinkOffset: number): void {
    const { blockSize, offsetLeft, offsetTop } = this.layout;
    const img = this.images.block;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const b = blocks[i][j];
        if (b.type > 0) {
          this.ctx.drawImage(
            img,
            (b.type - 1) * 100, 0, 100, 100,
            b.x + b.offsetX + blinkOffset,
            b.y + b.offsetY,
            blockSize, blockSize
          );
        }
      }
    }
  }

  /** 绘制选中框 */
  drawSelection(blocks: Block[][], blinkOffset: number): void {
    const { blockSize } = this.layout;
    const img = this.images.select;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const b = blocks[i][j];
        if (b.isSelect) {
          this.ctx.drawImage(
            img, 0, 0, 100, 100,
            b.x + b.offsetX + blinkOffset,
            b.y + b.offsetY,
            blockSize, blockSize
          );
        }
      }
    }
  }

  /** 绘制特殊方块闪光 */
  drawFlashParticles(particles: FlashParticle[]): void {
    if (particles.length === 0) return;
    const img = this.images.flash;
    for (const p of particles) {
      this.ctx.drawImage(img, 0, 0, 30, 30, p.x, p.y, p.size, p.size);
    }
  }

  /** 绘制飞行数字 */
  drawFlyingTexts(texts: FlyingText[]): void {
    if (texts.length === 0) return;
    this.ctx.fillStyle = '#ffffff';
    for (const p of texts) {
      this.ctx.fillText(String(p.num), p.x, p.y);
    }
  }

  /** 绘制爆炸星星粒子 */
  drawParticles(particles: Particle[]): void {
    if (particles.length === 0) return;
    for (const p of particles) {
      const sprite = this.starSprites[p.type - 1];
      if (sprite) {
        this.ctx.drawImage(sprite, p.x, p.y, p.size, p.size);
      }
    }
  }

  /** 绘制 UI 文字（顶部分数区） */
  drawUIText(
    highest: number, stage: number, scores: number, target: number,
    showNew: boolean, showClear: boolean, clearScale: number, clearOpacity: number
  ): void {
    const { blockSize, canvasWidth, canvasHeight, offsetTop } = this.layout;
    const topHeight = offsetTop; // UI 区域高度 = canvasHeight - blockSize * 10
    if (topHeight <= 0) return;

    const fontSize = blockSize * 0.6;
    this.ctx.font = fontSize + 'px feltregular';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    // 从顶部往下排列，行高由字号决定（模拟原 CSS max-height: 1.5em + padding: 2%）
    const padTop = topHeight * 0.02;       // CSS padding-top: 2%
    const rowMaxH = fontSize * 1.5;        // CSS max-height: 1.5em (相对于 font-size: 3em)
    const labelX = canvasWidth * 0.04;    // CSS padding-left: 4%
    const colWidth = canvasWidth / 2;
    const gap = fontSize * 0.35;           // 标签与数值间距

    // Y 坐标（textBaseline=middle，所以取行中心）
    const y1 = padTop + fontSize * 0.5;
    const y2 = padTop + rowMaxH + fontSize * 0.5;

    // 辅助：绘制标签 + 数值（数值紧跟标签右侧）
    const drawLabelValue = (label: string, value: string, x: number, y: number): void => {
      this.drawTextWithShadow(label, x, y, 0.6);
      const labelW = this.ctx.measureText(label).width;
      this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
      this.ctx.fillText(value, x + labelW + gap, y);
    };

    // 第一行
    drawLabelValue('HIGHEST', String(highest), labelX, y1);
    drawLabelValue('STAGE', String(stage), labelX + colWidth, y1);
    // 第二行
    drawLabelValue('SCORES', String(scores), labelX, y2);
    drawLabelValue('TARGET', String(target), labelX + colWidth, y2);

    // 新游戏按钮（蘑菇图标在右上角）
    // 原 CSS: width: 1.5em, 1em = blockSize * 0.6 (.text font-size: 3em)
    if (showNew) {
      const btnSize = blockSize * 0.9;
      const img = this.images.mushroom;
      this.ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, canvasWidth - btnSize, 0, btnSize, btnSize);
    }

    // Clear 动画（原 CSS: width:32%, height:100%, transform:scale）
    if (showClear) {
      const img = this.images.clear;
      const aspect = img.naturalWidth / img.naturalHeight;
      // 基准宽度 = canvasWidth * 0.32，按 scale 缩放
      const cw = canvasWidth * 0.32 * clearScale;
      const ch = cw / aspect;
      const cx = canvasWidth / 2 - cw / 2;
      const cy = this.layout.canvasHeight / 2 - ch / 2;
      this.ctx.save();
      this.ctx.globalAlpha = clearOpacity;
      this.ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, cx, cy, cw, ch);
      this.ctx.restore();
    }

    this.ctx.textAlign = 'center';
  }

  /** 带渐变阴影的文字（模拟原 CSS text-shadow 效果） */
  private drawTextWithShadow(text: string, x: number, y: number, scale: number): void {
    this.ctx.save();
    this.ctx.shadowColor = '#995ED1';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

  /** 绘制选中信息（方块数 × 分数） */
  drawSelectInfo(blockNums: number, blockScores: number, opacity: number, scale: number): void {
    if (opacity <= 0) return;
    const { blockSize, canvasWidth } = this.layout;
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    // 原 CSS: font-size 从 0.3em 到 3.0em，1em = blockSize * 0.2
    this.ctx.font = blockSize * scale * 0.2 + 'px feltregular';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const text = `${blockNums} Stars  ${blockScores} Scores`;
    // 原 JS 覆盖 CSS: div.changeText.set('top', blockSize * 2 + 'px')
    this.ctx.fillText(text, canvasWidth / 2, blockSize * 2);
    this.ctx.restore();
  }

  /** 绘制剩余方块数 */
  drawStarsLeft(starsLeft: number, fontSize: number): void {
    const { canvasWidth, canvasHeight } = this.layout;
    this.ctx.save();
    this.ctx.font = fontSize + 'px feltregular';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    // 原 CSS: top: 225px，换算为 canvasHeight * 0.35
    this.ctx.fillText(`${starsLeft} Stars Left`, canvasWidth / 2, canvasHeight * 0.35);
    this.ctx.restore();
  }

  /** 绘制奖励分数 */
  drawBonusScores(bonus: number, fontSize: number): void {
    const { canvasWidth, canvasHeight } = this.layout;
    this.ctx.save();
    this.ctx.font = fontSize + 'px feltregular';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    // 原 CSS: top: 300px，换算为 canvasHeight * 0.47
    this.ctx.fillText(`Bonus ${bonus}`, canvasWidth / 2, canvasHeight * 0.47);
    this.ctx.restore();
  }

  /** 绘制鼓励图标 */
  drawApplause(type: 'good' | 'cool' | 'fantastic', opacity: number, width: number): void {
    if (opacity <= 0) return;
    const { blockSize, canvasWidth } = this.layout;
    const img = this.images[type];
    const aspect = img.naturalWidth / img.naturalHeight;
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    // 原 CSS: width 单位为 em，1em = blockSize * 0.2
    const w = width * blockSize * 0.2;
    const h = w / aspect; // 保持图片原始宽高比
    const x = canvasWidth / 2 - w / 2;
    // 原 JS 覆盖 CSS: div.applause.set('top', blockSize * 2 + 'px')
    const y = blockSize * 2;
    this.ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, w, h);
    this.ctx.restore();
  }

  /** 绘制 Game Over */
  drawGameOver(): void {
    const { canvasWidth, canvasHeight, blockSize } = this.layout;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.font = blockSize * 1.2 + 'px feltregular';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Game Over', canvasWidth / 2, canvasHeight / 2);
    this.ctx.font = blockSize * 0.4 + 'px feltregular';
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.fillText('点击屏幕重新开始', canvasWidth / 2, canvasHeight / 2 + blockSize * 1.5);
    this.ctx.restore();
  }

  /** 绘制确认弹窗（新游戏确认） */
  drawConfirmDialog(): void {
    const { canvasWidth, canvasHeight, blockSize } = this.layout;
    this.ctx.save();

    // 半透明遮罩
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 弹窗尺寸
    const dialogW = canvasWidth * 0.75;
    const dialogH = blockSize * 4.5;
    const dialogX = (canvasWidth - dialogW) / 2;
    const dialogY = (canvasHeight - dialogH) / 2;

    // 弹窗背景
    this.ctx.fillStyle = 'rgba(26, 10, 60, 0.95)';
    this.roundRectPath(dialogX, dialogY, dialogW, dialogH, blockSize * 0.3);
    this.ctx.fill();

    // 边框
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.roundRectPath(dialogX, dialogY, dialogW, dialogH, blockSize * 0.3);
    this.ctx.stroke();

    // 标题
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = blockSize * 0.5 + 'px feltregular';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('新游戏', canvasWidth / 2, dialogY + blockSize * 1.0);

    // 正文
    this.ctx.font = blockSize * 0.35 + 'px feltregular';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText('确定要开始新游戏吗？', canvasWidth / 2, dialogY + blockSize * 1.8);

    // 按钮尺寸
    const btnW = dialogW * 0.35;
    const btnH = blockSize * 0.9;
    const btnY = dialogY + dialogH - btnH - blockSize * 0.5;
    const confirmX = dialogX + dialogW * 0.1;
    const cancelX = dialogX + dialogW * 0.55;

    // 确定按钮
    this.ctx.fillStyle = '#4a90d9';
    this.roundRectPath(confirmX, btnY, btnW, btnH, blockSize * 0.15);
    this.ctx.fill();
    this.ctx.font = blockSize * 0.35 + 'px feltregular';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('确定', confirmX + btnW / 2, btnY + btnH / 2);

    // 取消按钮
    this.ctx.fillStyle = '#666666';
    this.roundRectPath(cancelX, btnY, btnW, btnH, blockSize * 0.15);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('取消', cancelX + btnW / 2, btnY + btnH / 2);

    this.ctx.restore();
  }

  /** 绘制圆角矩形路径 */
  private roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
