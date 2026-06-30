import { describe, it, expect } from 'vitest';
import { CONFIG } from '../core/types';

describe('CONFIG 常量', () => {
  it('GRID_SIZE = 10', () => {
    expect(CONFIG.GRID_SIZE).toBe(10);
  });

  it('BLOCK_TYPES = 5（5种颜色）', () => {
    expect(CONFIG.BLOCK_TYPES).toBe(5);
  });

  it('SPECIAL_TYPE = 6', () => {
    expect(CONFIG.SPECIAL_TYPE).toBe(6);
  });

  it('EMPTY_TYPE = -1', () => {
    expect(CONFIG.EMPTY_TYPE).toBe(-1);
  });

  it('FRAME_MS = 1000/60 ≈ 16.67ms', () => {
    expect(CONFIG.FRAME_MS).toBeCloseTo(1000 / 60, 2);
  });

  it('BLAST_INTERVAL = 5帧 ≈ 83ms', () => {
    expect(CONFIG.BLAST_INTERVAL).toBeCloseTo((1000 / 60) * 5, 2);
  });

  it('SCORE_MULTIPLIER = 5', () => {
    expect(CONFIG.SCORE_MULTIPLIER).toBe(5);
  });
});

describe('分数计算公式', () => {
  it('消除 N 个方块得分 = N² × 5', () => {
    const calcScore = (n: number) => n * n * CONFIG.SCORE_MULTIPLIER;
    expect(calcScore(2)).toBe(20);
    expect(calcScore(5)).toBe(125);
    expect(calcScore(10)).toBe(500);
    expect(calcScore(20)).toBe(2000);
  });
});

describe('Bonus 回收给分公式', () => {
  // bonus = max(2000 - count² × 20, 0)
  const calcBonus = (count: number) =>
    Math.max(CONFIG.BONUS_BASE - count * count * CONFIG.BONUS_PENALTY, 0);

  it('剩余0个方块 → 满分2000', () => {
    expect(calcBonus(0)).toBe(2000);
  });

  it('剩余10个方块 → 2000 - 100×20 = 0', () => {
    expect(calcBonus(10)).toBe(0);
  });

  it('剩余5个方块 → 2000 - 25×20 = 1500', () => {
    expect(calcBonus(5)).toBe(1500);
  });

  it('剩余8个方块 → 2000 - 64×20 = 720', () => {
    expect(calcBonus(8)).toBe(720);
  });

  it('剩余9个方块 → 2000 - 81×20 = 380', () => {
    expect(calcBonus(9)).toBe(380);
  });

  it('剩余超过10个 → 0分（封底）', () => {
    expect(calcBonus(15)).toBe(0);
    expect(calcBonus(100)).toBe(0);
  });
});

describe('目标分数递进', () => {
  // 第1关 target=1000
  // 之后每关 +2000~3000
  it('第1关目标 = 1000', () => {
    expect(CONFIG.TARGET_INITIAL).toBe(1000);
  });

  it('递进步长范围 2000~3000', () => {
    expect(CONFIG.TARGET_STEP_LOW).toBe(2000);
    expect(CONFIG.TARGET_STEP_HIGH).toBe(3000);
  });

  it('第N关目标 = 1000 + (N-1) × random(2000,3000)', () => {
    // 验证公式逻辑：第2关目标至少 3000，最多 4000
    const stage2Min = CONFIG.TARGET_INITIAL + CONFIG.TARGET_STEP_LOW;
    const stage2Max = CONFIG.TARGET_INITIAL + CONFIG.TARGET_STEP_HIGH;
    expect(stage2Min).toBe(3000);
    expect(stage2Max).toBe(4000);
  });
});

describe('鼓励阈值', () => {
  it('7个 → good', () => {
    expect(CONFIG.APPLAUSE_GOOD).toBe(7);
  });

  it('14个 → cool', () => {
    expect(CONFIG.APPLAUSE_COOL).toBe(14);
  });

  it('19个 → fantastic', () => {
    expect(CONFIG.APPLAUSE_FANTASTIC).toBe(19);
  });
});

describe('粒子数量', () => {
  it('桌面端 15 个粒子', () => {
    expect(CONFIG.PARTICLE_COUNT_DESKTOP).toBe(15);
  });

  it('移动端 8 个粒子', () => {
    expect(CONFIG.PARTICLE_COUNT_TOUCH).toBe(8);
  });
});
