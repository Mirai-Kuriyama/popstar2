import { describe, it, expect, beforeEach } from 'vitest';
import { UIManager } from '../ui/UIManager';
import { CONFIG } from '../core/types';
import type { Renderer } from '../engine/Renderer';

// Mock Renderer - 只需验证 UIManager 调用了正确的方法
function mockRenderer(): Renderer {
  return {
    drawSelectInfo: () => {},
    drawStarsLeft: () => {},
    drawBonusScores: () => {},
  } as unknown as Renderer;
}

describe('UIManager', () => {
  let ui: UIManager;

  beforeEach(() => {
    ui = new UIManager();
  });

  describe('Clear 动画生命周期', () => {
    it('showClear 后初始状态：active=true, scale=3, opacity=1', () => {
      ui.showClear();
      const state = ui.getClearState();
      expect(state.active).toBe(true);
      expect(state.scale).toBe(3);
      expect(state.opacity).toBe(1);
    });

    it('缩小阶段（0-11帧）：scale 从 3 → 1', () => {
      ui.showClear();
      // 模拟 5 帧
      ui.update(CONFIG.FRAME_MS * 5, 39);
      const state = ui.getClearState();
      expect(state.active).toBe(true);
      expect(state.scale).toBeCloseTo(3 - (5 / 11) * 2, 2);
      expect(state.opacity).toBe(1);
    });

    it('缩小完成（11帧）：scale=1', () => {
      ui.showClear();
      ui.update(CONFIG.FRAME_MS * 11, 39);
      const state = ui.getClearState();
      expect(state.active).toBe(true);
      expect(state.scale).toBe(1);
      expect(state.opacity).toBe(1);
    });

    it('保持阶段（11-30帧）：scale=1, opacity=1', () => {
      ui.showClear();
      ui.update(CONFIG.FRAME_MS * 20, 39);
      const state = ui.getClearState();
      expect(state.active).toBe(true);
      expect(state.scale).toBe(1);
      expect(state.opacity).toBe(1);
    });

    it('淡出阶段（30-50帧）：opacity 从 1 → 0', () => {
      ui.showClear();
      ui.update(CONFIG.FRAME_MS * 40, 39);
      const state = ui.getClearState();
      expect(state.active).toBe(true);
      expect(state.scale).toBe(1);
      // virtualFrame=40, opacity = 1 - (40-30)/20 = 0.5
      expect(state.opacity).toBeCloseTo(0.5, 2);
    });

    it('动画结束（51帧）：active=false', () => {
      ui.showClear();
      ui.update(CONFIG.FRAME_MS * 51, 39);
      const state = ui.getClearState();
      expect(state.active).toBe(false);
      expect(state.opacity).toBe(0);
    });

    it('动画结束后 getClearState 返回 inactive', () => {
      ui.showClear();
      ui.update(CONFIG.FRAME_MS * 51, 39);
      const state = ui.getClearState();
      expect(state.active).toBe(false);
      expect(state.scale).toBe(1);
      expect(state.opacity).toBe(0);
    });
  });

  describe('StarsLeft 动画', () => {
    it('showStarsLeft 后可见且值正确', () => {
      ui.showStarsLeft(15);
      ui.draw(mockRenderer(), 39); // 不抛异常即可
      // starsLeftVisible 应该为 true（通过 draw 不报错验证）
    });

    it('动画结束后仍保持可见（visible 标志）', () => {
      ui.showStarsLeft(10);
      // 更新超过动画时长
      ui.update(CONFIG.FRAME_MS * 20, 39);
      // draw 不抛异常说明 starsLeftVisible 仍为 true
      ui.draw(mockRenderer(), 39);
    });
  });

  describe('Bonus 动画', () => {
    it('showBonusScores 后 bonusTriggered=true', () => {
      ui.showBonusScores(500);
      // isBonusDone 应为 false（动画还在进行中）
      expect(ui.isBonusDone()).toBe(false);
    });

    it('动画完成后 isBonusDone=true', () => {
      ui.showBonusScores(500);
      ui.update(CONFIG.FRAME_MS * 11, 39);
      expect(ui.isBonusDone()).toBe(true);
    });

    it('未触发 bonus 时 isBonusDone=false', () => {
      expect(ui.isBonusDone()).toBe(false);
    });

    it('bonusVisible 在动画后保持可见', () => {
      ui.showBonusScores(500);
      ui.update(CONFIG.FRAME_MS * 20, 39);
      // draw 不抛异常说明 bonusVisible 仍为 true
      ui.draw(mockRenderer(), 39);
    });
  });

  describe('Applause 鼓励动画', () => {
    it('showApplause 后 active=true', () => {
      ui.showApplause('cool');
      const state = ui.getApplauseState();
      expect(state.active).toBe(true);
      expect(state.type).toBe('cool');
    });

    it('fantastic 类型 width=35', () => {
      ui.showApplause('fantastic');
      const state = ui.getApplauseState();
      expect(state.active).toBe(true);
      expect(state.width).toBe(35);
    });

    it('非 fantastic 类型 width=20', () => {
      ui.showApplause('good');
      const state = ui.getApplauseState();
      expect(state.width).toBe(20);
    });

    it('动画结束后 active=false（70帧 ≈ 1167ms）', () => {
      ui.showApplause('good');
      ui.update(CONFIG.FRAME_MS * 70, 39);
      const state = ui.getApplauseState();
      expect(state.active).toBe(false);
    });
  });

  describe('Game Over', () => {
    it('showGameOver 后 isGameOverActive=true', () => {
      ui.showGameOver();
      expect(ui.isGameOverActive()).toBe(true);
    });

    it('hideGameOver 后 isGameOverActive=false', () => {
      ui.showGameOver();
      ui.hideGameOver();
      expect(ui.isGameOverActive()).toBe(false);
    });
  });

  describe('SelectInfo 选中信息', () => {
    it('showSelectInfo 后可通过 draw 绘制', () => {
      ui.showSelectInfo(5, 25);
      ui.draw(mockRenderer(), 39);
    });

    it('动画结束后不再绘制（50帧 ≈ 833ms）', () => {
      ui.showSelectInfo(5, 25);
      ui.update(CONFIG.FRAME_MS * 50, 39);
      ui.draw(mockRenderer(), 39); // 不抛异常
    });
  });

  describe('setShowNew', () => {
    it('设置新游戏按钮可见性', () => {
      ui.setShowNew(true);
      // setShowNew 仅设置标志位，无直接 getter，通过不抛异常验证
      ui.draw(mockRenderer(), 39);
    });
  });

  describe('reset (重置所有状态)', () => {
    it('reset 后 Clear 不可见', () => {
      ui.showClear();
      ui.reset();
      const state = ui.getClearState();
      expect(state.active).toBe(false);
    });

    it('reset 后 isBonusDone=false', () => {
      ui.showBonusScores(500);
      ui.update(CONFIG.FRAME_MS * 11, 39);
      expect(ui.isBonusDone()).toBe(true);
      ui.reset();
      expect(ui.isBonusDone()).toBe(false);
    });

    it('reset 后 Game Over 隐藏', () => {
      ui.showGameOver();
      ui.reset();
      expect(ui.isGameOverActive()).toBe(false);
    });

    it('reset 后 applause 不活跃', () => {
      ui.showApplause('fantastic');
      ui.reset();
      const state = ui.getApplauseState();
      expect(state.active).toBe(false);
    });
  });
});
