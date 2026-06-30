import type { Layout } from '../core/types';

type SelectCallback = (x: number, y: number) => void;
type ClickCallback = () => void;

/**
 * 统一输入处理
 * - 触屏 (touchstart) / 鼠标 (mousedown) 统一为坐标回调
 * - 自动处理 offset 计算
 */
export class InputHandler {
  private canvas: HTMLCanvasElement;
  private layout: Layout;
  private onSelect: SelectCallback;
  private onNewGame: ClickCallback | null = null;
  private onGameOverClick: ClickCallback | null = null;
  private isTouch: boolean;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  constructor(canvas: HTMLCanvasElement, layout: Layout, onSelect: SelectCallback) {
    this.canvas = canvas;
    this.layout = layout;
    this.onSelect = onSelect;
    this.isTouch = 'ontouchstart' in window;
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.attach();
  }

  private attach(): void {
    if (this.isTouch) {
      this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    } else {
      this.canvas.addEventListener('mousedown', this.boundMouseDown);
    }
  }

  setLayout(layout: Layout): void {
    this.layout = layout;
  }

  setNewGameCallback(cb: ClickCallback): void {
    this.onNewGame = cb;
  }

  setGameOverCallback(cb: ClickCallback): void {
    this.onGameOverClick = cb;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.targetTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    // Game Over 状态下优先处理重新开始
    if (this.onGameOverClick) {
      this.onGameOverClick();
    }
    this.onSelect(x, y);
    this.checkNewGameButton(x, y);
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Game Over 状态下优先处理重新开始
    if (this.onGameOverClick) {
      this.onGameOverClick();
    }
    this.onSelect(x, y);
    this.checkNewGameButton(x, y);
  }

  private checkNewGameButton(x: number, y: number): void {
    if (!this.onNewGame) return;
    const { blockSize, canvasWidth } = this.layout;
    // 新游戏按钮位置：右上角（与 Renderer 中蘑菇按钮尺寸一致）
    const btnSize = blockSize * 0.9;
    const btnX = canvasWidth - btnSize;
    const btnY = 0;
    if (x >= btnX && x <= btnX + btnSize && y >= btnY && y <= btnY + btnSize) {
      this.onNewGame();
    }
  }

  destroy(): void {
    if (this.isTouch) {
      this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    } else {
      this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    }
  }
}
