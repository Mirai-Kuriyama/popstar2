import type { SaveData } from '../core/types';

/**
 * 存档管理
 * - 异步写入（防抖 + setTimeout 延迟）
 * - 不阻塞渲染帧
 */
export class SaveManager {
  private savePending = false;
  private hasStorage: boolean;

  constructor() {
    this.hasStorage = typeof window !== 'undefined' && !!window.localStorage;
  }

  /** 异步保存（防抖：多次调用只执行最后一次） */
  save(data: SaveData): void {
    if (!this.hasStorage || this.savePending) return;
    this.savePending = true;
    setTimeout(() => {
      try {
        localStorage.setItem('stageValue', String(data.stageValue));
        localStorage.setItem('targetValue', String(data.targetValue));
        localStorage.setItem('highestValue', String(data.highestValue));
        localStorage.setItem('scoresValue', String(data.scoresValue));
        localStorage.setItem('block', JSON.stringify(data.block));
        localStorage.setItem('isFlash', String(data.isFlash));
        localStorage.setItem('hasClear', String(data.hasClear));
      } catch (e) {
        console.warn('Save failed:', e);
      }
      this.savePending = false;
    }, 0);
  }

  /** 同步加载 */
  load(): SaveData | null {
    if (!this.hasStorage) return null;
    const blockStr = localStorage.getItem('block');
    if (!blockStr) return null;

    return {
      stageValue: parseInt(localStorage.getItem('stageValue') || '0'),
      targetValue: parseInt(localStorage.getItem('targetValue') || '0'),
      highestValue: parseInt(localStorage.getItem('highestValue') || '0'),
      scoresValue: parseInt(localStorage.getItem('scoresValue') || '0'),
      block: JSON.parse(blockStr),
      isFlash: localStorage.getItem('isFlash') === 'true',
      hasClear: localStorage.getItem('hasClear') === 'true',
    };
  }

  /** 保存最高分 */
  saveHighest(highest: number): void {
    if (this.hasStorage) {
      localStorage.setItem('highestValue', String(highest));
    }
  }

  /** 清除存档 */
  clear(): void {
    if (this.hasStorage) localStorage.clear();
  }
}
