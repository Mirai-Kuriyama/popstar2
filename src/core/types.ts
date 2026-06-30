// ===== 核心类型定义 =====

/** 方块类型: -1=空, 1-5=颜色, 6=特殊(万能) */
export type BlockType = -1 | 1 | 2 | 3 | 4 | 5 | 6;

/** 方块实体 */
export interface Block {
  type: BlockType;
  x: number;
  y: number;
  offsetY: number;
  offsetX: number;
  isSelect: boolean;
}

/** 爆炸粒子 */
export interface Particle {
  x: number;
  y: number;
  type: number;
  a: number;       // 角度
  size: number;
  speed: number;
  g: number;       // 重力
}

/** 特殊方块闪光粒子 */
export interface FlashParticle {
  x: number;
  y: number;
  a: number;
  size: number;
  speed: number;
  time: number;
}

/** 飞行文字 */
export interface FlyingText {
  startX: number;
  startY: number;
  x: number;
  y: number;
  num: number;
}

/** 游戏状态 */
export type GameStateName = 'loading' | 'playing' | 'ending' | 'gameover';

/** 存档数据 */
export interface SaveData {
  stageValue: number;
  targetValue: number;
  highestValue: number;
  scoresValue: number;
  block: Block[][];
  isFlash: boolean;
  hasClear: boolean;
}

/** 布局尺寸 */
export interface Layout {
  canvasWidth: number;
  canvasHeight: number;
  blockSize: number;
  offsetTop: number;
  offsetLeft: number;
}

/** 鼓励类型 */
export type ApplauseType = 'good' | 'cool' | 'fantastic';

/** 游戏配置常量 */
export const CONFIG = {
  GRID_SIZE: 10,
  BLOCK_TYPES: 5,
  SPECIAL_TYPE: 6 as BlockType,
  EMPTY_TYPE: -1 as BlockType,
  PARTICLE_COUNT_DESKTOP: 15,
  PARTICLE_COUNT_TOUCH: 8,
  TARGET_FPS: 60,
  // 原始帧间隔 → 毫秒（60fps = 16.67ms/frame）
  FRAME_MS: 1000 / 60,
  // 消除间隔：原 5 帧 → ~83ms
  BLAST_INTERVAL: (1000 / 60) * 5,
  // 音效节流间隔：原 10 帧 → ~167ms
  POP_THROTTLE: (1000 / 60) * 10,
  // 选中抖动速度：原 π/6 每帧
  SELECT_SHAKE_SPEED: (Math.PI / 6) * (1000 / 60),
  // 下落加速度系数
  DROP_G_START: 0.26,
  DROP_G_ACCEL: 0.016,
  LEFTMOVE_SPEED: 0.2,
  // 分数计算
  SCORE_MULTIPLIER: 5,
  BONUS_BASE: 2000,
  BONUS_PENALTY: 20,
  // 目标分数
  TARGET_INITIAL: 1000,
  TARGET_STEP_LOW: 2000,
  TARGET_STEP_HIGH: 3000,
  // 鼓励阈值
  APPLAUSE_GOOD: 7,
  APPLAUSE_COOL: 14,
  APPLAUSE_FANTASTIC: 19,
} as const;
