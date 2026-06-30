import { test, expect } from '@playwright/test';

async function waitForGame(page: import('@playwright/test').Page): Promise<any> {
  await page.waitForFunction(() => !!(window as any).__game, undefined, { timeout: 10000 });
  return page.evaluate(() => (window as any).__game);
}

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

/** 获取 canvas 的 boundingBox 和 layout 信息 */
async function getCanvasLayout(page: import('@playwright/test').Page): Promise<{
  box: { x: number; y: number; width: number; height: number };
  blockSize: number;
  offsetTop: number;
  offsetLeft: number;
}> {
  const data = await page.evaluate(() => {
    const g = (window as any).__game;
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return {
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      blockSize: g['layout']['blockSize'],
      offsetTop: g['layout']['offsetTop'],
      offsetLeft: g['layout']['offsetLeft'],
    };
  });
  return data;
}

/** 计算方块中心的页面坐标 */
function blockCenter(
  layout: Awaited<ReturnType<typeof getCanvasLayout>>,
  row: number,
  col: number,
): { x: number; y: number } {
  return {
    x: layout.box.x + layout.offsetLeft + col * layout.blockSize + layout.blockSize / 2,
    y: layout.box.y + layout.offsetTop + row * layout.blockSize + layout.blockSize / 2,
  };
}

test.describe('游戏交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await waitForGame(page);
    await waitForDrops(page);
  });

  test('点击方块后选中高亮（isSelect=true）', async ({ page }) => {
    const layout = await getCanvasLayout(page);

    // 找到两个相邻同色方块
    const adjacent = await page.evaluate(() => {
      const g = (window as any).__game;
      const grid = g['board'].getGrid();
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (j + 1 < 10 && grid[i][j].type === grid[i][j + 1].type) {
            return { row: i, col: j, type: grid[i][j].type };
          }
        }
      }
      return null;
    });

    expect(adjacent).not.toBeNull();

    // 点击第一个方块
    const pos = blockCenter(layout, adjacent!.row, adjacent!.col);
    await page.mouse.click(pos.x, pos.y);

    // 等待一帧
    await page.waitForTimeout(100);

    // 检查选中状态
    const selected = await page.evaluate(() => {
      const g = (window as any).__game;
      const grid = g['board'].getGrid();
      const selectedBlocks: { row: number; col: number }[] = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (grid[i][j].isSelect) selectedBlocks.push({ row: i, col: j });
        }
      }
      return selectedBlocks;
    });

    // 应该至少选中了 2 个方块（点击的同色连通块）
    expect(selected.length).toBeGreaterThanOrEqual(2);
  });

  test('再次点击选中方块 → 消除并加分', async ({ page }) => {
    const layout = await getCanvasLayout(page);

    // 找到最大的连通块
    const target = await page.evaluate(() => {
      const g = (window as any).__game;
      const board = g['board'];
      const grid = board.getGrid();
      let best: { row: number; col: number; count: number } | null = null;

      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (grid[i][j].type > 0) {
            const connected = board.findConnected(i, j);
            if (connected.length >= 2 && (!best || connected.length > best.count)) {
              best = { row: i, col: j, count: connected.length };
            }
          }
        }
      }
      return best;
    });

    expect(target).not.toBeNull();

    // 第一次点击选中
    const pos1 = blockCenter(layout, target!.row, target!.col);
    await page.mouse.click(pos1.x, pos1.y);
    await page.waitForTimeout(100);

    // 记录消除前分数
    const scoreBefore = await page.evaluate(() => (window as any).__game['scoresValue']);

    // 第二次点击消除
    await page.mouse.click(pos1.x, pos1.y);
    await page.waitForTimeout(200);

    // 等待消除动画完成
    await page.waitForFunction(
      () => {
        const g = (window as any).__game;
        return g['isOperate'] && !g['isBlast'] && !g['isDrop'] && g['needScores'] === 0;
      },
      undefined,
      { timeout: 5000 },
    );

    // 验证分数增加了
    const scoreAfter = await page.evaluate(() => (window as any).__game['scoresValue']);
    expect(scoreAfter).toBeGreaterThan(scoreBefore);

    // 验证期望分数 = N² × 5
    const expectedScore = target!.count * target!.count * 5;
    expect(scoreAfter - scoreBefore).toBe(expectedScore);
  });

  test('点击单个方块（无同色邻居）不选中', async ({ page }) => {
    const layout = await getCanvasLayout(page);

    // 找到孤立方块（无同色邻居）
    const isolated = await page.evaluate(() => {
      const g = (window as any).__game;
      const board = g['board'];
      const grid = board.getGrid();
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (grid[i][j].type > 0) {
            const connected = board.findConnected(i, j);
            if (connected.length === 1) {
              return { row: i, col: j };
            }
          }
        }
      }
      return null;
    });

    // 如果没有孤立方块，跳过此测试（棋盘可能恰好没有孤立方块）
    if (!isolated) {
      test.skip();
      return;
    }

    const pos = blockCenter(layout, isolated.row, isolated.col);
    await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(100);

    // 没有方块被选中
    const selected = await page.evaluate(() => {
      const g = (window as any).__game;
      const grid = g['board'].getGrid();
      let count = 0;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (grid[i][j].isSelect) count++;
        }
      }
      return count;
    });

    expect(selected).toBe(0);
  });

  test('消除后方块下落和左移', async ({ page }) => {
    const layout = await getCanvasLayout(page);

    // 找到最大的连通块并消除
    const target = await page.evaluate(() => {
      const g = (window as any).__game;
      const board = g['board'];
      const grid = board.getGrid();
      let best: { row: number; col: number; count: number } | null = null;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (grid[i][j].type > 0) {
            const connected = board.findConnected(i, j);
            if (connected.length >= 2 && (!best || connected.length > best.count)) {
              best = { row: i, col: j, count: connected.length };
            }
          }
        }
      }
      return best;
    });

    expect(target).not.toBeNull();

    const pos = blockCenter(layout, target!.row, target!.col);
    await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(100);
    await page.mouse.click(pos.x, pos.y);

    // 等待所有动画完成
    await page.waitForFunction(
      () => {
        const g = (window as any).__game;
        return g['isOperate'] && !g['isBlast'] && !g['isDrop'] && !g['isLeftMove'] && g['needScores'] === 0;
      },
      undefined,
      { timeout: 10000 },
    );

    // 验证游戏仍然可操作
    const game = await page.evaluate(() => (window as any).__game);
    expect(game['isOperate']).toBe(true);
  });
});
