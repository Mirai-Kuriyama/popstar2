import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../game/Board';
import { CONFIG, type Block, type Layout } from '../core/types';

const mockLayout: Layout = {
  canvasWidth: 390,
  canvasHeight: 844,
  blockSize: 39,
  offsetTop: 84,
  offsetLeft: 0,
};

/** 构建可控的 Block 网格 */
function makeGrid(types: number[][]): Block[][] {
  return types.map((row) =>
    row.map((t) => ({
      type: t as Block['type'],
      x: 0,
      y: 0,
      offsetY: 0,
      offsetX: 0,
      isSelect: false,
    })),
  );
}

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
    board.setBlockSize(mockLayout.blockSize);
  });

  describe('findConnected (BFS 同色搜索)', () => {
    it('单个方块（无相邻同色）应返回仅自身', () => {
      const grid = makeGrid([
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const result = board.findConnected(0, 0);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ row: 0, col: 0 });
    });

    it('2个相邻同色方块应都返回', () => {
      const grid = makeGrid([
        [1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const result = board.findConnected(0, 0);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ row: 0, col: 0 });
      expect(result).toContainEqual({ row: 0, col: 1 });
    });

    it('L 形连通的同色方块应全部返回', () => {
      // (0,0)-(0,1)-(0,2)-(1,2)-(2,2) 全是 1
      const grid = makeGrid([
        [1, 1, 1, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 1, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 1, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      ]);
      board.loadFromSave(grid);
      const result = board.findConnected(0, 0);
      expect(result).toHaveLength(5);
    });

    it('特殊方块(type=6)不作为起点搜索', () => {
      const grid = makeGrid([
        [6, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const result = board.findConnected(0, 0);
      expect(result).toHaveLength(0);
    });

    it('特殊方块(type=6)与任何颜色匹配', () => {
      // (0,0)=1, (0,1)=6(特殊), 应该连通
      const grid = makeGrid([
        [1, 6, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const result = board.findConnected(0, 0);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ row: 0, col: 0 });
      expect(result).toContainEqual({ row: 0, col: 1 });
    });

    it('空方块(type=-1)不参与搜索', () => {
      const grid = makeGrid([
        [-1, -1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, -1, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const result = board.findConnected(0, 0);
      expect(result).toHaveLength(0);
    });
  });

  describe('checkCanBlast (可消除检测)', () => {
    it('有相邻同色 → true', () => {
      const grid = makeGrid([
        [1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      expect(board.checkCanBlast()).toBe(true);
    });

    it('无相邻同色且无特殊方块 → false', () => {
      // 棋盘型：每个相邻方块颜色不同
      const grid = makeGrid([
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
      ]);
      board.loadFromSave(grid);
      expect(board.checkCanBlast()).toBe(false);
    });

    it('有特殊方块(type=6) → true', () => {
      const grid = makeGrid([
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 1, 2, 6, 2, 1, 2, 1, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
      ]);
      board.loadFromSave(grid);
      expect(board.checkCanBlast()).toBe(true);
    });
  });

  describe('setSelect (选中状态)', () => {
    it('设置选中多个方块', () => {
      const grid = makeGrid([
        [1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      board.setSelect([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
      const g = board.getGrid();
      expect(g[0][0].isSelect).toBe(true);
      expect(g[0][1].isSelect).toBe(true);
      expect(g[0][2].isSelect).toBe(false);
    });

    it('少于2个方块不选中', () => {
      board.setSelect([{ row: 0, col: 0 }]);
      const g = board.getGrid();
      expect(g[0][0].isSelect).toBe(false);
    });

    it('null 清除所有选中', () => {
      const grid = makeGrid([
        [1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      board.setSelect([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
      board.setSelect(null);
      const g = board.getGrid();
      expect(g[0][0].isSelect).toBe(false);
      expect(g[0][1].isSelect).toBe(false);
    });
  });

  describe('applyDrop (下落后方块填补)', () => {
    it('消除一列中间方块后，上方方块下落', () => {
      // 第0列：1 在 (0,0) 和 (2,0)，(1,0) 被消除为 -1
      const grid = makeGrid([
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      ]);
      board.loadFromSave(grid);
      board.applyDrop(mockLayout);
      const g = board.getGrid();
      // (0,0) 应变为 -1（顶部空），(1,0) 应为 1（原 (2,0) 下落）
      expect(g[0][0].type).toBe(-1);
      // 下方应有原来的方块
      expect(g[9][0].type).toBe(2);
    });

    it('整列消除后，该列全为空', () => {
      const grid = makeGrid([
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        [-1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      ]);
      board.loadFromSave(grid);
      board.applyDrop(mockLayout);
      const g = board.getGrid();
      for (let i = 0; i < 10; i++) {
        expect(g[i][0].type).toBe(-1);
      }
    });
  });

  describe('applyLeftMove (空列左移)', () => {
    it('空列被右侧列填充', () => {
      // 第0列全空，第1列有方块
      const grid = makeGrid([
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [-1, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const leftMoveList = new Array(10).fill(0);
      board.calculateLeftMove(leftMoveList);
      board.applyLeftMove(leftMoveList, mockLayout);
      const g = board.getGrid();
      // 第0列应该变为原来的第1列
      expect(g[0][0].type).toBe(1);
      // 最后一列应为空
      expect(g[0][9].type).toBe(-1);
    });

    it('无空列时不移动', () => {
      const grid = makeGrid([
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const leftMoveList = new Array(10).fill(0);
      const result = board.calculateLeftMove(leftMoveList);
      expect(result.isLeft).toBe(false);
      expect(result.emptyCount).toBe(0);
    });
  });

  describe('collectAllToDisplayList (收集所有方块)', () => {
    it('收集所有非空方块', () => {
      const grid = makeGrid([
        [1, -1, 2, 3, 4, 5, 1, 2, 3, 4],
        [2, 3, -1, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      board.collectAllToDisplayList();
      // 100 - 2 个空 = 98
      expect(board.displayList).toHaveLength(98);
    });

    it('全空棋盘返回空列表', () => {
      const grid = makeGrid(
        Array(10).fill(Array(10).fill(-1)),
      );
      board.loadFromSave(grid);
      board.collectAllToDisplayList();
      expect(board.displayList).toHaveLength(0);
    });
  });

  describe('placeRandomSpecial (放置特殊方块)', () => {
    it('放置后棋盘中存在 type=6 的方块', () => {
      const grid = makeGrid([
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      board.placeRandomSpecial();
      const g = board.getGrid();
      let found = false;
      for (let i = 0; i < 10 && !found; i++) {
        for (let j = 0; j < 10 && !found; j++) {
          if (g[i][j].type === 6) found = true;
        }
      }
      expect(found).toBe(true);
      expect(board.isFlash).toBe(true);
    });
  });

  describe('updateLayout (布局更新)', () => {
    it('更新后方块坐标正确', () => {
      const grid = makeGrid([
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
        [3, 4, 5, 1, 2, 3, 4, 5, 1, 2],
        [4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
        [5, 1, 2, 3, 4, 5, 1, 2, 3, 4],
      ]);
      board.loadFromSave(grid);
      const newLayout: Layout = {
        canvasWidth: 400,
        canvasHeight: 900,
        blockSize: 40,
        offsetTop: 90,
        offsetLeft: 0,
      };
      board.updateLayout(newLayout);
      const g = board.getGrid();
      expect(g[0][0].x).toBe(0 * 40 + 0);
      expect(g[0][0].y).toBe(0 * 40 + 90);
      expect(g[5][3].x).toBe(3 * 40 + 0);
      expect(g[5][3].y).toBe(5 * 40 + 90);
    });
  });
});
