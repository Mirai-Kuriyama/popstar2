import type { Renderer } from '../engine/Renderer';
import type { ApplauseType } from '../core/types';
import { CONFIG } from '../core/types';

/**
 * UI 动画管理器
 * - 所有 UI 动画转为时间驱动（delta-time）
 * - 状态独立，Game 调用 trigger 方法启动动画
 * - update(dt) 推进动画，draw(renderer) 渲染
 */
export class UIManager {
  // 选中信息（N Stars M Scores）
  private selectInfoActive = false;
  private selectInfoTimer = 0; // ms
  private selectInfoBlockNums = 0;
  private selectInfoBlockScores = 0;

  // 剩余方块数
  private starsLeftActive = false;
  private starsLeftVisible = false;  // 动画完成后保持可见（原 DOM display:block 直到 gameEnd）
  private starsLeftTimer = 0;
  private starsLeftValue = 0;

  // 奖励分数
  private bonusActive = false;
  private bonusVisible = false;  // 动画完成后保持可见
  private bonusTimer = 0;
  private bonusValue = 0;
  private bonusTriggered = false; // 追踪是否曾触发过 bonus（用于结算判断）

  // Clear 动画（动画 11帧 + 保持 20帧 + 淡出 20帧 = 51帧 ≈ 850ms）
  private clearActive = false;
  private clearTimer = 0;

  // 鼓励图标
  private applauseActive = false;
  private applauseTimer = 0;
  private applauseType: ApplauseType = 'good';
  private applauseMaxWidth = 20; // em

  // Game Over
  private gameOverActive = false;

  // 新游戏按钮
  private showNew = false;

  // ===== 触发方法 =====

  showSelectInfo(blockNums: number, blockScores: number): void {
    this.selectInfoActive = true;
    this.selectInfoTimer = 0;
    this.selectInfoBlockNums = blockNums;
    this.selectInfoBlockScores = blockScores;
  }

  showStarsLeft(count: number): void {
    this.starsLeftActive = true;
    this.starsLeftVisible = true;
    this.starsLeftTimer = 0;
    this.starsLeftValue = count;
  }

  showBonusScores(value: number): void {
    this.bonusActive = true;
    this.bonusVisible = true;
    this.bonusTimer = 0;
    this.bonusValue = value;
    this.bonusTriggered = true;
  }

  showClear(): void {
    this.clearActive = true;
    this.clearTimer = 0;
  }

  showApplause(type: ApplauseType): void {
    this.applauseActive = true;
    this.applauseTimer = 0;
    this.applauseType = type;
    this.applauseMaxWidth = type === 'fantastic' ? 35 : 20;
  }

  showGameOver(): void {
    this.gameOverActive = true;
  }

  hideGameOver(): void {
    this.gameOverActive = false;
  }

  setShowNew(show: boolean): void {
    this.showNew = show;
  }

  /** bonus 是否已完成（曾触发且当前不活跃） */
  isBonusDone(): boolean {
    return this.bonusTriggered && !this.bonusActive;
  }

  isGameOverActive(): boolean {
    return this.gameOverActive;
  }

  /** 重置所有动画状态 */
  reset(): void {
    this.selectInfoActive = false;
    this.starsLeftActive = false;
    this.starsLeftVisible = false;
    this.bonusActive = false;
    this.bonusVisible = false;
    this.clearActive = false;
    this.applauseActive = false;
    this.gameOverActive = false;
    this.selectInfoTimer = 0;
    this.starsLeftTimer = 0;
    this.bonusTimer = 0;
    this.bonusTriggered = false;
    this.clearTimer = 0;
    this.applauseTimer = 0;
  }

  // ===== 更新方法 =====

  update(dt: number, blockSize: number): void {
    // 选中信息动画：总时长 50帧 ≈ 833ms
    if (this.selectInfoActive) {
      this.selectInfoTimer += dt;
      const duration = CONFIG.FRAME_MS * 50;
      if (this.selectInfoTimer >= duration) {
        this.selectInfoActive = false;
      }
    }

    // 剩余方块数动画：总时长 11帧 ≈ 183ms
    if (this.starsLeftActive) {
      this.starsLeftTimer += dt;
      const duration = CONFIG.FRAME_MS * 11;
      if (this.starsLeftTimer >= duration) {
        this.starsLeftActive = false;
      }
    }

    // 奖励分数动画：总时长 11帧 ≈ 183ms
    if (this.bonusActive) {
      this.bonusTimer += dt;
      const duration = CONFIG.FRAME_MS * 11;
      if (this.bonusTimer >= duration) {
        this.bonusActive = false;
      }
    }

    // Clear 动画：动画 11帧 + 保持 20帧 + 淡出 20帧 = 51帧 ≈ 850ms
    if (this.clearActive) {
      this.clearTimer += dt;
      if (this.clearTimer >= CONFIG.FRAME_MS * 51) {
        this.clearActive = false;
      }
    }

    // 鼓励动画：总时长 70帧 ≈ 1167ms
    if (this.applauseActive) {
      this.applauseTimer += dt;
      if (this.applauseTimer >= CONFIG.FRAME_MS * 70) {
        this.applauseActive = false;
      }
    }
  }

  // ===== 渲染方法 =====

  draw(renderer: Renderer, blockSize: number): void {
    // 选中信息
    if (this.selectInfoActive) {
      const duration = CONFIG.FRAME_MS * 50;
      const t = this.selectInfoTimer;
      let opacity = 1;
      let scale = 1;
      if (t < CONFIG.FRAME_MS * 11) {
        // 放大阶段
        scale = t / (CONFIG.FRAME_MS * 11) * 3;
      } else {
        scale = 3;
      }
      if (t > CONFIG.FRAME_MS * 39) {
        // 淡出阶段
        opacity = (duration - t) / (CONFIG.FRAME_MS * 11);
      }
      renderer.drawSelectInfo(this.selectInfoBlockNums, this.selectInfoBlockScores, opacity, scale);
    }

    // 剩余方块数（动画后保持可见，原 DOM display:block 直到 gameEnd）
    if (this.starsLeftVisible) {
      const virtualFrame = Math.min(Math.floor(this.starsLeftTimer / CONFIG.FRAME_MS), 10);
      const fontSize = blockSize * 2 - virtualFrame * blockSize * 0.14;
      renderer.drawStarsLeft(this.starsLeftValue, fontSize);
    }

    // 奖励分数（动画后保持可见）
    if (this.bonusVisible) {
      const virtualFrame = Math.min(Math.floor(this.bonusTimer / CONFIG.FRAME_MS), 10);
      const fontSize = blockSize * 1.5 - virtualFrame * blockSize * 0.09;
      renderer.drawBonusScores(this.bonusValue, fontSize);
    }

    // Clear 动画
    if (this.clearActive) {
      const t = this.clearTimer;
      let scale = 3;
      if (t < CONFIG.FRAME_MS * 11) {
        // 缩小阶段
        scale = 3 - (t / (CONFIG.FRAME_MS * 11)) * 2;
      } else {
        scale = 1;
      }
      // 传递给 drawUIText
      // 实际在 Game.render 中处理
    }
  }

  /** 获取 Clear 动画状态（供 Game 渲染用） */
  getClearState(): { active: boolean; scale: number; opacity: number } {
    if (!this.clearActive) return { active: false, scale: 1, opacity: 0 };
    const t = this.clearTimer;
    const virtualFrame = t / CONFIG.FRAME_MS;
    let scale = 3;
    let opacity = 1;
    if (virtualFrame < 11) {
      // 缩小阶段（0-11帧）
      scale = 3 - (virtualFrame / 11) * 2;
    } else {
      scale = 1;
    }
    if (virtualFrame > 30) {
      // 淡出阶段（30-50帧）
      opacity = Math.max(1 - (virtualFrame - 30) / 20, 0);
    }
    return { active: true, scale, opacity };
  }

  /** 获取鼓励动画状态 */
  getApplauseState(): { active: boolean; type: ApplauseType; opacity: number; width: number } {
    if (!this.applauseActive) return { active: false, type: 'good', opacity: 0, width: 0 };
    const t = this.applauseTimer;
    const virtualFrame = Math.floor(t / CONFIG.FRAME_MS);
    let width = this.applauseMaxWidth;
    if (virtualFrame < 11) {
      width = this.applauseMaxWidth - virtualFrame;
    }
    // 闪烁
    const opacity = virtualFrame < 11 ? 1 : (virtualFrame % 8 > 4 ? 1 : 0);
    return { active: true, type: this.applauseType, opacity, width: Math.max(width, 0) };
  }
}
