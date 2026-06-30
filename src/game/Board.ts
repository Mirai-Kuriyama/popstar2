import { CONFIG, type Block, type BlockType } from '../core/types';
import type { Layout } from '../core/types';

/**
 * 棋盘逻辑：10×10 网格
 * - 初始化、选择(BFS)、消除、下落、左移
 * - 纯数据层，不涉及渲染
 */
export class Board {
  private grid: Block[][];
  needDrop: number[][];    // 每个方块待下落距离
  needList: number[];      // 每列当前需要下落距离
  displayList: { i: number; j: number }[]; // 待消除方块
  lineDisplayList: number[]; // 每列待消除数量
  canBlast = false;
  isFlash = false;

  constructor() {
    this.grid = this.createEmptyGrid();
    this.needDrop = this.createNumberGrid();
    this.needList = new Array(10).fill(0);
    this.displayList = [];
    this.lineDisplayList = new Array(10).fill(0);
  }

  private createEmptyGrid(): Block[][] {
    const grid: Block[][] = [];
    for (let i = 0; i < 10; i++) {
      grid.push([]);
      for (let j = 0; j < 10; j++) {
        grid[i].push({ type: CONFIG.EMPTY_TYPE, x: 0, y: 0, offsetY: 0, offsetX: 0, isSelect: false });
      }
    }
    return grid;
  }

  private createNumberGrid(): number[][] {
    return Array.from({ length: 10 }, () => new Array(10).fill(0));
  }

  getGrid(): Block[][] {
    return this.grid;
  }

  /** 初始化新棋盘（随机方块 + 下落动画偏移） */
  initNewBoard(layout: Layout): void {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        this.needDrop[i][j] = layout.blockSize * 30 - i * layout.blockSize * 1.8 - Math.floor(Math.random() * layout.blockSize);
        this.grid[i][j] = {
          type: (1 + Math.floor(Math.random() * 5)) as BlockType,
          y: i * layout.blockSize + layout.offsetTop - this.needDrop[i][j],
          x: j * layout.blockSize + layout.offsetLeft,
          offsetY: 0,
          offsetX: 0,
          isSelect: false,
        };
      }
    }
  }

  /** 从存档加载棋盘 */
  loadFromSave(savedBlock: Block[][]): void {
    this.grid = savedBlock;
  }

  /** 更新所有方块位置（resize 时调用） */
  updateLayout(layout: Layout): void {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        this.grid[i][j].y = i * layout.blockSize + layout.offsetTop;
        this.grid[i][j].x = j * layout.blockSize + layout.offsetLeft;
      }
    }
  }

  /** 设置选中状态 */
  setSelect(list: { row: number; col: number }[] | null): void {
    // 清除所有选中
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        this.grid[i][j].isSelect = false;
      }
    }
    if (!list || list.length < 2) return;
    for (const item of list) {
      this.grid[item.row][item.col].isSelect = true;
    }
  }

  /**
   * BFS 搜索连通的同色方块
   * 特殊方块(type=6)与任何颜色匹配
   */
  findConnected(row: number, col: number): { row: number; col: number }[] {
    const selectType = this.grid[row][col].type;
    if (selectType < 0 || selectType === 6) return [];

    const checked: boolean[][] = Array.from({ length: 10 }, () => new Array(10).fill(false));
    const result: { row: number; col: number }[] = [];
    const queue: { row: number; col: number }[] = [{ row, col }];

    while (queue.length > 0) {
      const { row: r, col: c } = queue.shift()!;
      if (checked[r][c]) continue;
      checked[r][c] = true;
      result.push({ row: r, col: c });

      // 检查上下左右
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) continue;
        if (checked[nr][nc]) continue;
        const neighborType = this.grid[nr][nc].type;
        if (neighborType === 6 || neighborType === selectType) {
          queue.push({ row: nr, col: nc });
        }
      }
    }
    return result;
  }

  /** 检测是否还能继续消除 */
  checkCanBlast(): boolean {
    this.canBlast = false;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const t = this.grid[i][j].type;
        if (t === 6) {
          this.canBlast = true;
          return true;
        }
        if (t !== -1) {
          if (i + 1 < 10 && this.grid[i + 1][j].type === t) {
            this.canBlast = true;
            return true;
          }
          if (j + 1 < 10 && this.grid[i][j + 1].type === t) {
            this.canBlast = true;
            return true;
          }
        }
      }
    }
    return false;
  }

  /** 收集所有选中的方块到 displayList */
  collectSelectedToDisplayList(): void {
    this.displayList = [];
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (this.grid[i][j].isSelect) {
          this.displayList.push({ i, j });
        }
      }
    }
  }

  /** 将选中的方块追加到 displayList（不清除已有内容，用于结束序列） */
  pushSelectedToDisplayList(): void {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (this.grid[i][j].isSelect) {
          this.displayList.push({ i, j });
        }
      }
    }
  }

  /** 收集所有非空方块到 displayList（结算用） */
  collectAllToDisplayList(): void {
    this.displayList = [];
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (this.grid[i][j].type !== -1) {
          this.displayList.push({ i, j });
        }
      }
    }
  }

  /** 计算下落距离 */
  calculateDrop(layout: Layout): void {
    this.needList.fill(0);
    for (let i = 0; i < 10; i++) this.needDrop[i].fill(0);

    // 从底向上遍历，空方块累加需要下落的距离
    for (let i = 9; i >= 0; i--) {
      for (let j = 0; j < 10; j++) {
        if (this.grid[i][j].type > 0) {
          this.needDrop[i][j] = this.needList[j];
        } else {
          this.needList[j] += layout.blockSize;
        }
      }
    }
  }

  /** 下落完成后：方块位置复位 + 交换类型填补空缺 */
  applyDrop(layout: Layout): void {
    // 位置复位 + 统计每列空方块数
    this.lineDisplayList.fill(0);
    for (let i = 9; i >= 0; i--) {
      for (let j = 9; j >= 0; j--) {
        this.grid[i][j].y = i * layout.blockSize + layout.offsetTop;
        this.grid[i][j].offsetY = 0;
        if (this.grid[i][j].type < 0) this.lineDisplayList[j]++;
      }
    }

    // 交换方块类型：空方块从上方取类型
    for (let i = 9; i >= 0; i--) {
      for (let j = 9; j >= 0; j--) {
        if (this.grid[i][j].type < 0) {
          let l = 1;
          while (i - l > 0 && this.grid[i - l][j].type < 0) l++;
          for (let k = i; k > l - 1; k--) {
            this.grid[k][j].type = this.grid[k - l][j].type;
          }
        }
      }
    }

    // 顶部空方块设为 -1
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (i < this.lineDisplayList[j]) this.grid[i][j].type = -1;
      }
    }
  }

  /** 计算左移距离 */
  calculateLeftMove(leftMoveList: number[]): { isLeft: boolean; emptyCount: number } {
    let times = 0;
    for (let j = 0; j < 10; j++) {
      leftMoveList[j] = times * this.getBlockSize();
      let isEmpty = true;
      for (let k = 0; k < 10; k++) {
        if (this.grid[k][j].type > 0) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) times++;
    }
    return { isLeft: times > 0, emptyCount: times };
  }

  /** 左移完成后：转移方块数据 */
  applyLeftMove(leftMoveList: number[], layout: Layout): void {
    // 位置复位 + 记录空列
    let times = 0;
    const isEmptyCol: boolean[] = new Array(10);
    for (let j = 0; j < 10; j++) {
      let isEmpty = true;
      for (let k = 0; k < 10; k++) {
        this.grid[k][j].x = j * layout.blockSize + layout.offsetLeft;
        if (this.grid[k][j].type > 0) isEmpty = false;
      }
      isEmptyCol[j] = isEmpty;
      if (isEmpty) times++;
    }

    // 交换方块类型
    for (let j = 0; j < 10 - times; j++) {
      if (isEmptyCol[j]) {
        let l = 1;
        while (j + l < 10 && isEmptyCol[j + l]) l++;
        isEmptyCol[j + l] = true;
        for (let k = 0; k < 10; k++) {
          this.grid[k][j].type = this.grid[k][j + l].type;
          this.grid[k][j + l].type = -1;
        }
      }
    }

    // 右侧多余列设为空
    for (let i = 0; i < 10; i++) {
      for (let j = 10 - times; j < 10; j++) {
        this.grid[i][j].type = -1;
      }
    }
  }

  private blockSize = 0;
  setBlockSize(size: number): void { this.blockSize = size; }
  getBlockSize(): number { return this.blockSize; }

  /** 随机放置一个特殊方块 */
  placeRandomSpecial(): void {
    const r = Math.floor(Math.random() * 10);
    const c = Math.floor(Math.random() * 10);
    this.grid[r][c].type = 6;
    this.isFlash = true;
  }
}
