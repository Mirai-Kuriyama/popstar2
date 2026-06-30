import { test, expect } from '@playwright/test';

/** 等待游戏加载完成并返回游戏实例 */
async function waitForGame(page: import('@playwright/test').Page): Promise<any> {
  await page.waitForFunction(() => !!(window as any).__game, undefined, { timeout: 10000 });
  return page.evaluate(() => (window as any).__game);
}

/** 等待方块下落完成 */
async function waitForDrops(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const g = (window as any).__game;
      return g && g['isOperate'] && !g['isDrop'];
    },
    undefined,
    { timeout: 10000 },
  );
}

test.describe('游戏加载', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle('消灭星星 Pop Star');
  });

  test('Canvas 元素存在且可见', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('游戏实例已创建', async ({ page }) => {
    const game = await waitForGame(page);
    expect(game).toBeTruthy();
    expect(game['isStart']).toBe(true);
    expect(game['state']).toBe('playing');
  });

  test('初始分数为 0，第 1 关目标 1000', async ({ page }) => {
    const game = await waitForGame(page);
    expect(game['scoresValue']).toBe(0);
    expect(game['targetValue']).toBe(1000);
    expect(game['stageValue']).toBe(1); // 第1关
  });

  test('方块下落完成后可操作', async ({ page }) => {
    await waitForGame(page);
    await waitForDrops(page);
    const game = await page.evaluate(() => (window as any).__game);
    expect(game['isOperate']).toBe(true);
    expect(game['isDrop']).toBe(false);
  });

  test('棋盘有 10×10 个方块', async ({ page }) => {
    await waitForGame(page);
    const grid = await page.evaluate(() => {
      const g = (window as any).__game;
      return g['board'].getGrid();
    });
    expect(grid).toHaveLength(10);
    expect(grid[0]).toHaveLength(10);
    // 每个方块 type 应在 1-5 之间
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        expect(grid[i][j].type).toBeGreaterThanOrEqual(1);
        expect(grid[i][j].type).toBeLessThanOrEqual(5);
      }
    }
  });
});
