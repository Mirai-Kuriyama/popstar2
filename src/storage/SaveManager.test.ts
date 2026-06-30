import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager } from '../storage/SaveManager';
import type { SaveData, Block } from '../core/types';

function makeBlockGrid(): Block[][] {
  const grid: Block[][] = [];
  for (let i = 0; i < 10; i++) {
    grid.push([]);
    for (let j = 0; j < 10; j++) {
      grid[i].push({
        type: (1 + Math.floor(Math.random() * 5)) as Block['type'],
        x: j * 39,
        y: i * 39,
        offsetY: 0,
        offsetX: 0,
        isSelect: false,
      });
    }
  }
  return grid;
}

function makeSaveData(overrides: Partial<SaveData> = {}): SaveData {
  return {
    stageValue: 3,
    targetValue: 5000,
    highestValue: 12000,
    scoresValue: 3500,
    block: makeBlockGrid(),
    isFlash: false,
    hasClear: true,
    ...overrides,
  };
}

describe('SaveManager', () => {
  let sm: SaveManager;

  beforeEach(() => {
    localStorage.clear();
    sm = new SaveManager();
  });

  describe('save + load 往返', () => {
    it('保存后能正确加载所有字段', () => {
      const data = makeSaveData();
      sm.save(data);
      // save 是异步的（setTimeout 0），需要等待
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const loaded = sm.load();
          expect(loaded).not.toBeNull();
          expect(loaded!.stageValue).toBe(3);
          expect(loaded!.targetValue).toBe(5000);
          expect(loaded!.highestValue).toBe(12000);
          expect(loaded!.scoresValue).toBe(3500);
          expect(loaded!.isFlash).toBe(false);
          expect(loaded!.hasClear).toBe(true);
          expect(loaded!.block).toHaveLength(10);
          expect(loaded!.block[0]).toHaveLength(10);
          resolve();
        }, 10);
      });
    });

    it('保存 isFlash=true 后能正确加载', () => {
      const data = makeSaveData({ isFlash: true });
      sm.save(data);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const loaded = sm.load();
          expect(loaded!.isFlash).toBe(true);
          resolve();
        }, 10);
      });
    });

    it('保存 hasClear=false 后能正确加载', () => {
      const data = makeSaveData({ hasClear: false });
      sm.save(data);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const loaded = sm.load();
          expect(loaded!.hasClear).toBe(false);
          resolve();
        }, 10);
      });
    });
  });

  describe('load (无存档)', () => {
    it('localStorage 为空时返回 null', () => {
      expect(sm.load()).toBeNull();
    });

    it('block 不存在时返回 null', () => {
      localStorage.setItem('stageValue', '1');
      // 没有 'block' key
      expect(sm.load()).toBeNull();
    });
  });

  describe('clear (清除存档)', () => {
    it('清除后 load 返回 null', () => {
      const data = makeSaveData();
      sm.save(data);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          sm.clear();
          expect(sm.load()).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('saveHighest', () => {
    it('保存最高分到 localStorage', () => {
      sm.saveHighest(99999);
      expect(localStorage.getItem('highestValue')).toBe('99999');
    });

    it('覆盖之前的最高分', () => {
      sm.saveHighest(100);
      sm.saveHighest(200);
      expect(localStorage.getItem('highestValue')).toBe('200');
    });
  });

  describe('异步防抖', () => {
    it('连续调用 save 只执行一次', () => {
      const data1 = makeSaveData({ scoresValue: 100 });
      const data2 = makeSaveData({ scoresValue: 200 });
      sm.save(data1);
      sm.save(data2); // 应被忽略（pending）
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const loaded = sm.load();
          // data2 应该被忽略，加载的是 data1
          expect(loaded!.scoresValue).toBe(100);
          resolve();
        }, 10);
      });
    });

    it('防抖结束后可以再次保存', () => {
      const data1 = makeSaveData({ scoresValue: 100 });
      sm.save(data1);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // 第一次保存完成后
          const data2 = makeSaveData({ scoresValue: 200 });
          sm.save(data2);
          setTimeout(() => {
            const loaded = sm.load();
            expect(loaded!.scoresValue).toBe(200);
            resolve();
          }, 10);
        }, 10);
      });
    });
  });
});
