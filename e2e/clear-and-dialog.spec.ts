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

async function getCanvasBox(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

test.describe('Clear 动画', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await waitForGame(page);
    await waitForDrops(page);
  });

  test('达到目标分数时触发 Clear 动画', async ({ page }) => {
    // 设置分数接近目标，然后加分触发
    await page.evaluate(() => {
      const g = (window as any).__game;
      g['scoresValue'] = 990;
      g['needScores'] = 20;
    });

    // 等待分数滚动并触发 Clear
    await page.waitForFunction(
      () => {
        const g = (window as any).__game;
        return g['clearShown'] === true;
      },
      undefined,
      { timeout: 3000 },
    );

    // 验证 Clear 动画活跃
    const clearState = await page.evaluate(() => {
      const g = (window as any).__game;
      return g['ui'].getClearState();
    });
    expect(clearState.active).toBe(true);
    expect(clearState.scale).toBeGreaterThan(0);
    expect(clearState.opacity).toBeGreaterThan(0);
  });

  test('Clear 动画播放后自动消失', async ({ page }) => {
    await page.evaluate(() => {
      const g = (window as any).__game;
      g['scoresValue'] = 990;
      g['needScores'] = 20;
    });

    // 等待 Clear 触发
    await page.waitForFunction(
      () => (window as any).__game['clearShown'] === true,
      undefined,
      { timeout: 3000 },
    );

    // 等待 Clear 动画结束（约 850ms）
    await page.waitForFunction(
      () => {
        const g = (window as any).__game;
        return !g['ui']['clearActive'];
      },
      undefined,
      { timeout: 3000 },
    );

    // 验证 Clear 不再显示
    const clearState = await page.evaluate(() => {
      const g = (window as any).__game;
      return g['ui'].getClearState();
    });
    expect(clearState.active).toBe(false);
    expect(clearState.opacity).toBe(0);
  });

  test('Clear 不会重复触发', async ({ page }) => {
    await page.evaluate(() => {
      const g = (window as any).__game;
      g['scoresValue'] = 990;
      g['needScores'] = 20;
    });

    // 等待 Clear 触发并结束
    await page.waitForFunction(
      () => (window as any).__game['clearShown'] === true,
      undefined,
      { timeout: 3000 },
    );
    await page.waitForFunction(
      () => !(window as any).__game['ui']['clearActive'],
      undefined,
      { timeout: 3000 },
    );

    // 再加分
    await page.evaluate(() => {
      const g = (window as any).__game;
      g['needScores'] = 50;
    });

    await page.waitForTimeout(500);

    // Clear 不应该重新触发
    const clearState = await page.evaluate(() => {
      const g = (window as any).__game;
      return g['ui'].getClearState();
    });
    expect(clearState.active).toBe(false);
  });
});

test.describe('确认弹窗', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await waitForGame(page);
    await waitForDrops(page);
  });

  test('点击蘑菇按钮弹出确认弹窗', async ({ page }) => {
    const box = await getCanvasBox(page);
    // 蘑菇按钮在右上角
    const g = await page.evaluate(() => (window as any).__game);
    const btnSize = g['layout']['blockSize'] * 0.9;
    const mushroomX = box.x + box.width - btnSize / 2;
    const mushroomY = box.y + btnSize / 2;

    await page.mouse.click(mushroomX, mushroomY);
    await page.waitForTimeout(200);

    const isDialogActive = await page.evaluate(() => (window as any).__game['confirmDialogActive']);
    expect(isDialogActive).toBe(true);
  });

  test('点击取消按钮关闭弹窗', async ({ page }) => {
    const box = await getCanvasBox(page);
    const g = await page.evaluate(() => (window as any).__game);
    const layout = g['layout'];
    const blockSize = layout['blockSize'];

    // 蘑菇按钮位置
    const btnSize = blockSize * 0.9;
    const mushroomX = box.x + box.width - btnSize / 2;
    const mushroomY = box.y + btnSize / 2;

    // 弹出弹窗
    await page.mouse.click(mushroomX, mushroomY);
    await page.waitForFunction(
      () => (window as any).__game['confirmDialogActive'] === true,
      undefined,
      { timeout: 2000 },
    );

    // 计算取消按钮位置
    const dialogW = box.width * 0.75;
    const dialogH = blockSize * 4.5;
    const dialogX = box.x + (box.width - dialogW) / 2;
    const dialogY = box.y + (box.height - dialogH) / 2;
    const cancelBtnW = dialogW * 0.35;
    const cancelBtnH = blockSize * 0.9;
    const cancelBtnY = dialogY + dialogH - cancelBtnH - blockSize * 0.5;
    const cancelBtnX = dialogX + dialogW * 0.55;

    // 点击取消
    await page.mouse.click(cancelBtnX + cancelBtnW / 2, cancelBtnY + cancelBtnH / 2);
    await page.waitForTimeout(200);

    const isDialogActive = await page.evaluate(() => (window as any).__game['confirmDialogActive']);
    expect(isDialogActive).toBe(false);

    // 游戏应该仍在进行中（未被重置）
    const gameState = await page.evaluate(() => (window as any).__game['state']);
    expect(gameState).toBe('playing');
  });

  test('点击确定按钮重新开始游戏', async ({ page }) => {
    const box = await getCanvasBox(page);
    const g = await page.evaluate(() => (window as any).__game);
    const layout = g['layout'];
    const blockSize = layout['blockSize'];

    // 先消除一些方块使分数 > 0
    const scoreBefore = g['scoresValue'];

    // 蘑菇按钮位置
    const btnSize = blockSize * 0.9;
    const mushroomX = box.x + box.width - btnSize / 2;
    const mushroomY = box.y + btnSize / 2;

    // 弹出弹窗
    await page.mouse.click(mushroomX, mushroomY);
    await page.waitForFunction(
      () => (window as any).__game['confirmDialogActive'] === true,
      undefined,
      { timeout: 2000 },
    );

    // 计算确定按钮位置
    const dialogW = box.width * 0.75;
    const dialogH = blockSize * 4.5;
    const dialogX = box.x + (box.width - dialogW) / 2;
    const dialogY = box.y + (box.height - dialogH) / 2;
    const confirmBtnW = dialogW * 0.35;
    const confirmBtnH = blockSize * 0.9;
    const confirmBtnY = dialogY + dialogH - confirmBtnH - blockSize * 0.5;
    const confirmBtnX = dialogX + dialogW * 0.1;

    // 点击确定
    await page.mouse.click(confirmBtnX + confirmBtnW / 2, confirmBtnY + confirmBtnH / 2);

    // 等待游戏重置
    await page.waitForFunction(
      () => {
        const g = (window as any).__game;
        return !g['confirmDialogActive'] && g['isStart'] && g['scoresValue'] === 0;
      },
      undefined,
      { timeout: 5000 },
    );

    // 验证游戏已重置
    const game = await page.evaluate(() => (window as any).__game);
    expect(game['confirmDialogActive']).toBe(false);
    expect(game['scoresValue']).toBe(0);
    expect(game['stageValue']).toBe(1); // 重启后第1关
    expect(game['state']).toBe('playing');
  });

  test('弹窗激活时游戏暂停', async ({ page }) => {
    const box = await getCanvasBox(page);
    const g = await page.evaluate(() => (window as any).__game);
    const blockSize = g['layout']['blockSize'];

    // 蘑菇按钮位置
    const btnSize = blockSize * 0.9;
    const mushroomX = box.x + box.width - btnSize / 2;
    const mushroomY = box.y + btnSize / 2;

    // 弹出弹窗
    await page.mouse.click(mushroomX, mushroomY);
    await page.waitForFunction(
      () => (window as any).__game['confirmDialogActive'] === true,
      undefined,
      { timeout: 2000 },
    );

    // 尝试点击棋盘上的方块（应该被拦截）
    const layout = await page.evaluate(() => {
      const g = (window as any).__game;
      return { offsetTop: g['layout']['offsetTop'], offsetLeft: g['layout']['offsetLeft'], blockSize: g['layout']['blockSize'] };
    });

    const blockX = box.x + layout.offsetLeft + 2 * layout.blockSize + layout.blockSize / 2;
    const blockY = box.y + layout.offsetTop + 2 * layout.blockSize + layout.blockSize / 2;

    await page.mouse.click(blockX, blockY);
    await page.waitForTimeout(200);

    // 不应该有方块被选中
    const selectedCount = await page.evaluate(() => {
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

    expect(selectedCount).toBe(0);
  });
});
