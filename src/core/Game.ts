import { CONFIG, type Block, type BlockType, type Layout, type GameStateName, type ApplauseType } from './types';
import { Renderer } from '../engine/Renderer';
import { Board } from '../game/Board';
import { ParticleSystem } from '../game/ParticleSystem';
import { AudioManager } from '../engine/AudioManager';
import { UIManager } from '../ui/UIManager';
import { SaveManager } from '../storage/SaveManager';
import { InputHandler } from '../input/InputHandler';
import { prerenderStarSprites, prerenderBackground, type GameImages } from '../engine/AssetLoader';

/**
 * 游戏主类
 * - 固定时间步长(fixed timestep)逻辑 + 任意刷新率渲染
 * - 原有帧计数逻辑完整保留，由 FIXED_DT 驱动
 */
export class Game {
  // 系统组件
  private renderer: Renderer;
  private board: Board;
  private particles: ParticleSystem;
  private audio: AudioManager;
  private ui: UIManager;
  private saveManager: SaveManager;
  private input: InputHandler;
  private images: GameImages;

  // 游戏状态
  private state: GameStateName = 'loading';
  private isStart = false;
  private isEnding = false;
  private isStartDrop = false;
  private isOperate = true;
  private isDrop = false;
  private isBlast = false;
  private isSelectMove = false;
  private isLeft = false;
  private isFlash = false;

  // 游戏数值
  private stageValue = 0;
  private scoresValue = 0;
  private targetValue = 0;
  private highestValue = 0;
  private blockNums = 100;
  private blastNum = 0;
  private needScores = 0;

  // 帧计数器（由 fixed timestep 驱动，与原逻辑一致）
  private blastTimer = 0;
  private endTimer = 0;
  private selectMoveProgress = 0;

  // 动画状态
  private dropG = 0;
  private leftMoveList: number[] = new Array(10).fill(0);
  private blinkOffset = 0;
  private endBlastTriggered = false;

  // 确认弹窗
  private confirmDialogActive = false;

  // Clear 已显示标志（防止重复触发，独立于动画状态）
  private clearShown = false;

  // 分数显示优化
  private lastScoresValue = -1;

  // 主循环
  private lastTime = 0;
  private accumulator = 0;
  private rafId = 0;
  private readonly FIXED_DT = CONFIG.FRAME_MS;

  // 布局
  private layout: Layout;
  private isTouch: boolean;
  private safeAreaProbe: HTMLDivElement;
  private resizeTimer: number | null = null;

  constructor(canvas: HTMLCanvasElement, images: GameImages) {
    this.images = images;
    this.isTouch = 'ontouchstart' in window;
    this.layout = { canvasWidth: 0, canvasHeight: 0, blockSize: 0, offsetTop: 0, offsetLeft: 0 };

    // 初始化系统组件
    this.renderer = new Renderer(canvas, images);
    this.board = new Board();
    this.audio = new AudioManager();
    this.ui = new UIManager();
    this.saveManager = new SaveManager();

    // 预渲染星星 sprite
    const starSprites = prerenderStarSprites(images.star);
    this.renderer.setStarSprites(starSprites);

    // 安全区探测元素（需在 resize 前创建）
    this.safeAreaProbe = document.createElement('div');
    this.safeAreaProbe.style.cssText = 'position:fixed;bottom:0;left:-9999px;height:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden;';
    document.body.appendChild(this.safeAreaProbe);

    // 初始布局计算
    this.resize();

    // 粒子系统需要布局信息
    this.particles = new ParticleSystem(this.isTouch, this.layout);
    this.board.setBlockSize(this.layout.blockSize);

    // 输入处理
    this.input = new InputHandler(canvas, this.layout, (x, y) => this.select(x, y));
    this.input.setNewGameCallback(() => this.handleNewGame());
    this.input.setGameOverCallback(() => this.handleGameOverClick());

    // 事件监听
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('keydown', (e) => {
      if (e.keyCode === 113) this.handleGameOverClick(); // F2
    });
  }

  /** 初始化音频（需在用户首次交互后调用） */
  async initAudio(): Promise<void> {
    await this.audio.init();
  }

  /** 启动游戏 */
  start(): void {
    // 尝试加载存档
    const saved = this.saveManager.load();
    if (saved) {
      this.stageValue = saved.stageValue;
      this.targetValue = saved.targetValue;
      this.highestValue = saved.highestValue;
      this.scoresValue = saved.scoresValue;
      this.isFlash = saved.isFlash;
      this.board.loadFromSave(saved.block);
      this.board.setBlockSize(this.layout.blockSize);
      this.board.updateLayout(this.layout);

      if (saved.hasClear) {
        this.clearShown = true;
      }
      this.startGame(true, true);
    } else {
      this.startGame(true, false);
    }

    this.state = 'playing';
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** 开始一局 */
  private startGame(isFirst: boolean, isLoad: boolean): void {
    if ((isFirst && !isLoad) || !isFirst) {
      this.board.initNewBoard(this.layout);

      // 新关卡
      this.stageValue++;
      if (this.stageValue % 5 === 0) {
        this.board.placeRandomSpecial();
        this.isFlash = true;
      } else {
        this.isFlash = false;
      }

      // 目标分数
      if (this.stageValue === 1) {
        this.targetValue = CONFIG.TARGET_INITIAL;
      } else if (this.stageValue <= 4) {
        this.targetValue += CONFIG.TARGET_STEP_LOW;
      } else {
        this.targetValue += CONFIG.TARGET_STEP_HIGH;
      }
    }

    this.dropG = this.layout.blockSize * CONFIG.DROP_G_START;
    this.isStart = true;
    this.isStartDrop = true;
    this.isDrop = true;
    this.isOperate = false;
    this.endBlastTriggered = false;
  }

  // ===== 主循环 =====

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(now - this.lastTime, 100); // 最大 100ms 防卡顿跳跃
    this.lastTime = now;

    // 固定时间步长更新逻辑
    this.accumulator += dt;
    while (this.accumulator >= this.FIXED_DT) {
      this.fixedUpdate();
      this.accumulator -= this.FIXED_DT;
    }

    // 每帧渲染
    this.render();
  };

  // ===== 固定步长更新（等同原 60fps 逻辑） =====

  private fixedUpdate(): void {
    if (!this.isStart) return;
    if (this.confirmDialogActive) return;

    this.updateScores();
    this.updateClearAnimation();
    this.ui.update(this.FIXED_DT, this.layout.blockSize);
    this.updateSelectShake();
    this.updateFlashParticles();
    this.updateDrop();
    this.updateFlyingTexts();
    this.updateLeftMove();
    this.updateBlast();
    this.updateStarParticles();
    this.updateEndSequence();
    this.checkGameEnd();
  }

  // ===== 分数动画 =====

  private updateScores(): void {
    if (this.needScores > 0) {
      const tmpScore = Math.max(Math.floor(this.needScores * 0.03), 5);
      if (this.needScores > tmpScore) {
        this.scoresValue += tmpScore;
        this.needScores -= tmpScore;
      } else {
        this.scoresValue += Math.floor(this.needScores);
        this.needScores = 0;
      }
      // 达到目标分数
      if (this.scoresValue >= this.targetValue && !this.clearShown) {
        this.audio.play('target');
        this.ui.showClear();
        this.clearShown = true;
      }
    }
  }

  // ===== Clear 动画 =====

  private updateClearAnimation(): void {
    // UI 管理器处理
  }

  // ===== 选中抖动 =====

  private updateSelectShake(): void {
    if (!this.isSelectMove) return;
    if (this.selectMoveProgress < Math.PI) {
      const shakeY = -Math.sin(this.selectMoveProgress) * this.layout.blockSize * 0.06;
      const grid = this.board.getGrid();
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (grid[i][j].isSelect) grid[i][j].offsetY = shakeY;
        }
      }
      this.selectMoveProgress += (1 / 6) * Math.PI;
    } else {
      this.selectMoveProgress = 0;
      this.isSelectMove = false;
    }
  }

  // ===== 特殊方块闪光粒子 =====

  private updateFlashParticles(): void {
    if (!this.isFlash && this.particles.getFlashList().length === 0) return;

    const grid = this.board.getGrid();
    const { blockSize } = this.layout;

    // 清理过期粒子
    const flashList = this.particles.getFlashList();
    for (let i = flashList.length - 1; i >= 0; i--) {
      const p = flashList[i];
      if (p.size < blockSize * 0.1 || p.time > blockSize) {
        flashList.splice(i, 1);
      }
    }

    // 找特殊方块
    let specialBlock: Block | null = null;
    outer: for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (grid[i][j].type === 6) {
          specialBlock = grid[i][j];
          break outer;
        }
      }
    }

    if (specialBlock && this.isFlash) {
      this.particles.spawnFlashParticle(specialBlock.x, specialBlock.y);
    }

    // 更新位置
    for (const p of flashList) {
      p.x += p.speed * Math.cos(p.a);
      p.y += p.speed * Math.sin(p.a);
      p.size -= blockSize * 0.002;
      p.time++;
    }
  }

  // ===== 下落动画 =====

  private updateDrop(): void {
    if (!this.isDrop) return;
    const grid = this.board.getGrid();
    const needDrop = this.board.needDrop;
    let times = 0;
    let dropPlayed = false;

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (needDrop[i][j] > 0) {
          if (this.dropG >= needDrop[i][j]) {
            grid[i][j].y += needDrop[i][j];
            needDrop[i][j] = 0;
            if (!dropPlayed && ((this.isStartDrop && j === 0) || !this.isStartDrop)) {
              this.audio.play('drop');
              dropPlayed = true;
            }
          } else {
            grid[i][j].y += this.dropG;
            needDrop[i][j] -= this.dropG;
          }
          times++;
        }
      }
    }

    if (!this.isStartDrop) {
      this.dropG += this.layout.blockSize * CONFIG.DROP_G_ACCEL;
    }

    // 下落完毕
    if (times === 0 && !this.isBlast) {
      this.isStartDrop = false;
      this.board.applyDrop(this.layout);

      // 计算左移
      const result = this.board.calculateLeftMove(this.leftMoveList);
      this.dropG = this.layout.blockSize * 0.16;
      this.isDrop = false;

      if (result.isLeft) {
        this.isLeft = true;
      } else if (!this.isEnding) {
        this.continueOperate();
      }
    }
  }

  // ===== 飞行文字 =====

  private updateFlyingTexts(): void {
    this.particles.updateTexts();
  }

  // ===== 左移动画 =====

  private updateLeftMove(): void {
    if (!this.isLeft) return;
    const grid = this.board.getGrid();
    const { blockSize } = this.layout;
    let allDone = true;

    for (let j = 0; j < 10; j++) {
      if (this.leftMoveList[j] > 0) {
        allDone = false;
        const moveAmount = Math.min(blockSize * CONFIG.LEFTMOVE_SPEED, this.leftMoveList[j]);
        for (let k = 0; k < 10; k++) {
          grid[k][j].x -= moveAmount;
        }
        this.leftMoveList[j] -= moveAmount;
      }
    }

    if (allDone) {
      this.board.applyLeftMove(this.leftMoveList, this.layout);
      this.isLeft = false;
      if (!this.isEnding) {
        this.continueOperate();
      }
    }
  }

  // ===== 消除动画 =====

  private updateBlast(): void {
    if (!this.isBlast) return;
    const grid = this.board.getGrid();

    if (this.blastTimer++ % 5 !== 0) return;

    const displayList = this.board.displayList;

    if (displayList.length > 0 || this.blockNums === 0) {
      if (this.blockNums !== 0) {
        this.audio.playPopThrottled();
      }

      let lastItem: { i: number; j: number } | null = null;
      do {
        if (this.blockNums === 0) break;
        const item = displayList.shift()!;
        lastItem = item;

        // 生成爆炸粒子
        this.particles.spawnBlastParticles(item.i, item.j, grid[item.i][item.j].type);

        // 特殊方块消除则停止新增闪光
        if (grid[item.i][item.j].type === 6) {
          this.isFlash = false;
        }
        grid[item.i][item.j].isSelect = false;
        grid[item.i][item.j].type = -1;
      } while (this.isEnding && this.blastTimer > 50 && displayList.length > 0);

      // 结算阶段加速粒子
      if (this.isEnding && this.blastTimer > 50) {
        this.particles.boostParticles();
      }

      // 结算奖励
      if ((this.isEnding && displayList.length === 0) || this.blockNums === 0) {
        const bonus = Math.max(CONFIG.BONUS_BASE - this.blockNums * this.blockNums * CONFIG.BONUS_PENALTY, 0);
        this.needScores += bonus;
        this.ui.showBonusScores(bonus);
        this.audio.play('clear');
        this.blockNums = -1;
      }

      // 鼓励图标
      if (!this.isEnding && !this.ui.getApplauseState().active && this.blockNums > 7 && displayList.length === 0) {
        this.audio.play('applause');
        let type: ApplauseType = 'good';
        if (this.blockNums > CONFIG.APPLAUSE_FANTASTIC) type = 'fantastic';
        else if (this.blockNums > CONFIG.APPLAUSE_COOL) type = 'cool';
        this.ui.showApplause(type);
      }

      // 飞行分数文字（使用最后消除的方块位置）
      if (!this.isEnding && lastItem) {
        this.particles.spawnFlyingText(lastItem.i, lastItem.j, this.blastNum++ * 10 + 5);
      }
    } else {
      this.blastTimer = 0;
      this.isBlast = false;
      this.board.calculateDrop(this.layout);
      this.isDrop = true;
    }
  }

  // ===== 星星粒子更新 =====

  private updateStarParticles(): void {
    this.particles.updateStars();
  }

  // ===== 结束序列 =====

  private updateEndSequence(): void {
    this.blinkOffset = 0;
    if (!this.isEnding) return;

    if (++this.endTimer < 101) {
      this.blinkOffset = (this.endTimer % 10 > 5 ? 1 : 0) * this.layout.blockSize * 200;
    } else if (this.endTimer === 101) {
      this.blast();
    }
  }

  // ===== 检查游戏结束 =====

  private checkGameEnd(): void {
    if (!this.isEnding) return;
    if (this.endTimer > 100 &&
        this.board.displayList.length === 0 &&
        this.particles.getStarList().length === 0 &&
        this.needScores === 0 &&
        this.ui.isBonusDone()) {
      this.gameEnd();
    }
  }

  // ===== 操作完成 =====

  private continueOperate(): void {
    this.isOperate = true;
    if (!this.isEnding) this.saveState();

    // 检测是否全空
    let isEmpty = true;
    const grid = this.board.getGrid();
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (grid[i][j].type !== -1) {
          isEmpty = false;
          break;
        }
      }
      if (!isEmpty) break;
    }

    if (isEmpty || !this.board.checkCanBlast()) {
      this.audio.play('end');
      this.board.collectAllToDisplayList();

      if (!this.isEnding) {
        this.blockNums = this.board.displayList.length;
        this.ui.showStarsLeft(this.blockNums);
        this.ui.showBonusScores(Math.max(CONFIG.BONUS_BASE - this.blockNums * this.blockNums * CONFIG.BONUS_PENALTY, 0));
      }

      this.isEnding = true;
    }
  }

  // ===== 选择方块 =====

  private select(x: number, y: number): void {
    if (this.confirmDialogActive) {
      this.handleConfirmDialogClick(x, y);
      return;
    }
    if (!this.isOperate) return;
    const { blockSize, offsetTop, offsetLeft } = this.layout;
    if (x < offsetLeft || x > offsetLeft + blockSize * 10 || y < offsetTop) return;

    const selectRow = Math.floor((y - offsetTop) / blockSize);
    const selectCol = Math.floor((x - offsetLeft) / blockSize);
    const grid = this.board.getGrid();

    if (grid[selectRow][selectCol].isSelect) {
      // 确认消除
      this.blast();
    } else if (grid[selectRow][selectCol].type < 0 || grid[selectRow][selectCol].type === 6) {
      return;
    } else {
      // BFS 搜索连通同色方块
      const connected = this.board.findConnected(selectRow, selectCol);
      this.board.setSelect(connected);
      if (connected.length > 1) {
        this.audio.play('select');
        this.selectMoveProgress = 0;
        this.isSelectMove = true;
        this.blockNums = connected.length;
        this.ui.showSelectInfo(this.blockNums, this.blockNums * this.blockNums * CONFIG.SCORE_MULTIPLIER);
        this.blastNum = 0;
      }
    }
  }

  // ===== 消除 =====

  private blast(): void {
    // 追加选中方块到 displayList（不清除已有内容）
    // 结束序列中 displayList 已由 continueOperate() 预填充所有剩余方块
    this.board.pushSelectedToDisplayList();
    if (!this.isEnding) {
      this.needScores = this.blockNums * this.blockNums * CONFIG.SCORE_MULTIPLIER;
    }
    this.isOperate = false;
    this.isBlast = true;
    this.blastTimer = 0;
  }

  // ===== 游戏结束 =====

  private gameEnd(): void {
    this.isOperate = true;
    this.isStart = false;
    this.isEnding = false;
    this.endTimer = 0;
    this.endBlastTriggered = false;
    this.clearShown = false;
    this.ui.reset();

    if (this.scoresValue >= this.targetValue) {
      // 过关 → 保存 → 下一关
      this.saveState();
      this.startGame(false, false);
      this.isStart = true;
    } else {
      // Game Over
      this.highestValue = Math.max(this.highestValue, this.scoresValue);
      this.saveManager.saveHighest(this.highestValue);
      this.ui.showGameOver();
      this.state = 'gameover';
    }
  }

  // ===== 新游戏 =====

  private handleNewGame(): void {
    if (!this.isOperate || this.needScores > 0) return;
    if (this.confirmDialogActive) return;
    this.confirmDialogActive = true;
  }

  /** 处理确认弹窗点击 */
  private handleConfirmDialogClick(x: number, y: number): void {
    const { canvasWidth, canvasHeight, blockSize } = this.layout;
    const dialogW = canvasWidth * 0.75;
    const dialogH = blockSize * 4.5;
    const dialogX = (canvasWidth - dialogW) / 2;
    const dialogY = (canvasHeight - dialogH) / 2;
    const btnW = dialogW * 0.35;
    const btnH = blockSize * 0.9;
    const btnY = dialogY + dialogH - btnH - blockSize * 0.5;
    const confirmX = dialogX + dialogW * 0.1;
    const cancelX = dialogX + dialogW * 0.55;

    if (x >= confirmX && x <= confirmX + btnW && y >= btnY && y <= btnY + btnH) {
      this.confirmDialogActive = false;
      this.resetGame();
    } else if (x >= cancelX && x <= cancelX + btnW && y >= btnY && y <= btnY + btnH) {
      this.confirmDialogActive = false;
    }
  }

  private handleGameOverClick(): void {
    if (this.state !== 'gameover') return;
    this.resetGame();
  }

  private resetGame(): void {
    this.ui.hideGameOver();
    this.ui.reset();
    this.needScores = 0;
    this.particles.clear();
    this.stageValue = 0;
    this.scoresValue = 0;
    this.clearShown = false;
    this.saveManager.clear();
    this.startGame(false, false);
    this.isStart = true;
    this.state = 'playing';
  }

  // ===== 存档 =====

  private saveState(): void {
    if (!this.isStart && this.state !== 'gameover') return;
    this.saveManager.save({
      stageValue: this.stageValue,
      targetValue: this.targetValue,
      highestValue: this.highestValue,
      scoresValue: this.scoresValue,
      block: this.board.getGrid(),
      isFlash: this.isFlash,
      hasClear: this.clearShown,
    });
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'hidden' && this.isStart && this.isOperate) {
      this.saveState();
    }
  }

  // ===== 布局/重设 =====

  private onResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.resize(), 150);
  }

  private resize(): void {
    const safeBottom = this.getSafeBottom();
    this.renderer.resize(window.innerWidth, window.innerHeight, safeBottom);
    this.layout = this.renderer.getLayout();

    // 重渲染背景缓存
    const bg = prerenderBackground(this.images.background, this.layout);
    this.renderer.setBackgroundCache(bg);

    // 更新棋盘位置
    if (this.isStart) {
      this.board.updateLayout(this.layout);
    }
    this.board.setBlockSize(this.layout.blockSize);

    // 更新粒子系统布局
    if (this.particles) {
      this.particles.setLayout(this.layout);
    }

    // 更新输入布局
    if (this.input) {
      this.input.setLayout(this.layout);
    }
  }

  private getSafeBottom(): number {
    let safeBottom = this.safeAreaProbe?.offsetHeight || 0;
    if (safeBottom === 0 && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      if (window.innerHeight > 700) safeBottom = 34;
    }
    return safeBottom;
  }

  // ===== 渲染 =====

  private render(): void {
    const r = this.renderer;

    r.drawBackground();

    if (this.isStart) {
      r.drawBlocks(this.board.getGrid(), this.blinkOffset);
      r.drawSelection(this.board.getGrid(), this.blinkOffset);
      r.drawFlashParticles(this.particles.getFlashList());
      r.drawFlyingTexts(this.particles.getTextList());
      r.drawParticles(this.particles.getStarList());
    }

    // UI 文字
    const showNew = this.stageValue > 0;
    const clearState = this.ui.getClearState();
    r.drawUIText(
      this.highestValue, this.stageValue, this.scoresValue, this.targetValue,
      showNew, clearState.active, clearState.scale, clearState.opacity
    );

    // UI 动画
    this.ui.draw(r, this.layout.blockSize);

    // 鼓励图标
    const applauseState = this.ui.getApplauseState();
    if (applauseState.active) {
      r.drawApplause(applauseState.type, applauseState.opacity, applauseState.width);
    }

    // Game Over
    if (this.ui.isGameOverActive()) {
      r.drawGameOver();
    }

    // 确认弹窗
    if (this.confirmDialogActive) {
      r.drawConfirmDialog();
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
  }
}
