import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleSystem } from '../game/ParticleSystem';
import { CONFIG, type Layout } from '../core/types';

const mockLayout: Layout = {
  canvasWidth: 390,
  canvasHeight: 844,
  blockSize: 39,
  offsetTop: 84,
  offsetLeft: 0,
};

describe('ParticleSystem', () => {
  let ps: ParticleSystem;

  describe('桌面端（isTouch=false）', () => {
    beforeEach(() => {
      ps = new ParticleSystem(false, mockLayout);
    });

    it('粒子数量 = 15', () => {
      expect(ps.getParticleCount()).toBe(CONFIG.PARTICLE_COUNT_DESKTOP);
    });

    it('spawnBlastParticles 生成正确数量粒子', () => {
      ps.spawnBlastParticles(5, 3, 2);
      expect(ps.getStarList()).toHaveLength(15);
    });

    it('spawnBlastParticles 粒子位置在方块中心', () => {
      ps.spawnBlastParticles(0, 0, 1);
      const stars = ps.getStarList();
      const expectedX = 0 * mockLayout.blockSize + mockLayout.offsetLeft + mockLayout.blockSize * 0.5;
      const expectedY = 0 * mockLayout.blockSize + mockLayout.offsetTop + mockLayout.blockSize * 0.5;
      expect(stars[0].x).toBeCloseTo(expectedX, 0);
      expect(stars[0].y).toBeCloseTo(expectedY, 0);
    });

    it('spawnBlastParticles 粒子 type 正确', () => {
      ps.spawnBlastParticles(2, 3, 4);
      const stars = ps.getStarList();
      for (const s of stars) {
        expect(s.type).toBe(4);
      }
    });

    it('多次 spawnBlastParticles 累加粒子', () => {
      ps.spawnBlastParticles(1, 1, 1);
      ps.spawnBlastParticles(2, 2, 2);
      expect(ps.getStarList()).toHaveLength(30);
    });
  });

  describe('移动端（isTouch=true）', () => {
    beforeEach(() => {
      ps = new ParticleSystem(true, mockLayout);
    });

    it('粒子数量 = 8', () => {
      expect(ps.getParticleCount()).toBe(CONFIG.PARTICLE_COUNT_TOUCH);
    });

    it('spawnBlastParticles 生成 8 个粒子', () => {
      ps.spawnBlastParticles(5, 3, 2);
      expect(ps.getStarList()).toHaveLength(8);
    });
  });

  describe('spawnFlyingText', () => {
    beforeEach(() => {
      ps = new ParticleSystem(false, mockLayout);
    });

    it('生成飞行文字', () => {
      ps.spawnFlyingText(5, 3, 125);
      const texts = ps.getTextList();
      expect(texts).toHaveLength(1);
      expect(texts[0].num).toBe(125);
    });

    it('飞行文字起始位置在方块中心', () => {
      ps.spawnFlyingText(2, 4, 50);
      const text = ps.getTextList()[0];
      const expectedX = 4 * mockLayout.blockSize + mockLayout.offsetLeft + mockLayout.blockSize * 0.5;
      const expectedY = 2 * mockLayout.blockSize + mockLayout.offsetTop + mockLayout.blockSize * 0.5;
      expect(text.x).toBeCloseTo(expectedX, 0);
      expect(text.y).toBeCloseTo(expectedY, 0);
      expect(text.startX).toBe(text.x);
      expect(text.startY).toBe(text.y);
    });
  });

  describe('updateStars (粒子更新)', () => {
    beforeEach(() => {
      ps = new ParticleSystem(false, mockLayout);
    });

    it('粒子超出画布边界后被移除', () => {
      ps.spawnBlastParticles(9, 5, 1);
      const stars = ps.getStarList();
      // 将粒子移到画布外
      for (const s of stars) {
        s.x = mockLayout.canvasWidth + 1000;
        s.y = mockLayout.canvasHeight + 1000;
      }
      ps.updateStars();
      expect(ps.getStarList()).toHaveLength(0);
    });

    it('粒子在画布内时保留', () => {
      ps.spawnBlastParticles(5, 5, 1);
      ps.updateStars();
      // 更新后粒子可能移动但仍应在画布内
      expect(ps.getStarList().length).toBeGreaterThan(0);
    });
  });

  describe('updateTexts (飞行文字更新)', () => {
    beforeEach(() => {
      ps = new ParticleSystem(false, mockLayout);
    });

    it('文字到达目标后移除', () => {
      ps.spawnFlyingText(5, 5, 100);
      // 将文字位置移到目标点附近
      const targetX = mockLayout.canvasWidth * 0.342;
      const targetY = mockLayout.blockSize * 1.5;
      const texts = ps.getTextList();
      texts[0].x = targetX;
      texts[0].y = targetY;
      ps.updateTexts();
      expect(ps.getTextList()).toHaveLength(0);
    });

    it('文字未到达目标时保留', () => {
      ps.spawnFlyingText(5, 5, 100);
      ps.updateTexts();
      expect(ps.getTextList()).toHaveLength(1);
    });
  });

  describe('boostParticles (加速)', () => {
    it('所有粒子速度翻倍', () => {
      ps = new ParticleSystem(false, mockLayout);
      ps.spawnBlastParticles(5, 5, 1);
      const originalSpeeds = ps.getStarList().map(p => p.speed);
      ps.boostParticles();
      const boostedSpeeds = ps.getStarList().map(p => p.speed);
      for (let i = 0; i < originalSpeeds.length; i++) {
        expect(boostedSpeeds[i]).toBe(originalSpeeds[i] * 2);
      }
    });
  });

  describe('clear (清空)', () => {
    beforeEach(() => {
      ps = new ParticleSystem(false, mockLayout);
    });

    it('清空所有粒子列表', () => {
      ps.spawnBlastParticles(5, 5, 1);
      ps.spawnFlyingText(3, 3, 50);
      expect(ps.getStarList().length).toBeGreaterThan(0);
      expect(ps.getTextList().length).toBeGreaterThan(0);
      ps.clear();
      expect(ps.getStarList()).toHaveLength(0);
      expect(ps.getFlashList()).toHaveLength(0);
      expect(ps.getTextList()).toHaveLength(0);
    });
  });

  describe('setLayout', () => {
    it('更新布局后新粒子使用新坐标', () => {
      ps = new ParticleSystem(false, mockLayout);
      const newLayout: Layout = {
        canvasWidth: 414,
        canvasHeight: 896,
        blockSize: 41.4,
        offsetTop: 90,
        offsetLeft: 0,
      };
      ps.setLayout(newLayout);
      ps.spawnBlastParticles(0, 0, 1);
      const star = ps.getStarList()[0];
      const expectedX = 0 * newLayout.blockSize + newLayout.offsetLeft + newLayout.blockSize * 0.5;
      expect(star.x).toBeCloseTo(expectedX, 0);
    });
  });
});
