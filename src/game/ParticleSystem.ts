import { CONFIG, type Particle, type FlashParticle, type FlyingText, type Layout } from '../core/types';

/**
 * 粒子系统
 * - 爆炸星星粒子
 * - 特殊方块闪光粒子
 * - 飞行分数文字
 */
export class ParticleSystem {
  private starList: Particle[] = [];
  private flashList: FlashParticle[] = [];
  private textList: FlyingText[] = [];
  private particleCount: number;
  private layout: Layout;

  constructor(isTouch: boolean, layout: Layout) {
    this.particleCount = isTouch ? CONFIG.PARTICLE_COUNT_TOUCH : CONFIG.PARTICLE_COUNT_DESKTOP;
    this.layout = layout;
  }

  setLayout(layout: Layout): void {
    this.layout = layout;
  }

  getStarList(): Particle[] { return this.starList; }
  getFlashList(): FlashParticle[] { return this.flashList; }
  getTextList(): FlyingText[] { return this.textList; }
  getParticleCount(): number { return this.particleCount; }

  /** 生成爆炸星星粒子 */
  spawnBlastParticles(blockRow: number, blockCol: number, blockType: number): void {
    const { blockSize, offsetLeft, offsetTop } = this.layout;
    const cx = blockCol * blockSize + offsetLeft + blockSize * 0.5;
    const cy = blockRow * blockSize + offsetTop + blockSize * 0.5;
    for (let i = 0; i < this.particleCount; i++) {
      this.starList.push({
        x: cx,
        y: cy,
        type: blockType,
        a: Math.PI + Math.random() * Math.PI,
        size: blockSize * 0.2 + Math.random() * blockSize * 0.5,
        speed: blockSize * 0.1 + Math.random() * blockSize * 0.1,
        g: 0,
      });
    }
  }

  /** 生成特殊方块闪光粒子 */
  spawnFlashParticle(blockX: number, blockY: number): void {
    const { blockSize } = this.layout;
    if (Math.random() < 0.35) {
      this.flashList.push({
        x: blockX - blockSize * 0.2 + Math.random() * blockSize,
        y: blockY - blockSize * 0.2 + Math.random() * blockSize,
        a: 2 * Math.PI * Math.random(),
        size: blockSize * 0.3 + blockSize * 0.4 * Math.random(),
        speed: blockSize * 0.034 * Math.random(),
        time: 0,
      });
    }
  }

  /** 生成飞行分数文字 */
  spawnFlyingText(blockRow: number, blockCol: number, num: number): void {
    const { blockSize, offsetLeft, offsetTop } = this.layout;
    const x = blockCol * blockSize + offsetLeft + blockSize * 0.5;
    const y = blockRow * blockSize + offsetTop + blockSize * 0.5;
    this.textList.push({ startX: x, startY: y, x, y, num });
  }

  /** 更新爆炸星星粒子 */
  updateStars(): void {
    const { blockSize, canvasWidth, canvasHeight } = this.layout;
    this.starList = this.starList.filter(p => {
      p.x += p.speed * Math.cos(p.a);
      p.y += p.speed * Math.sin(p.a) + p.g;
      p.g += blockSize * 0.008;
      p.size = p.size > 0.2 ? p.size - 0.2 : p.size;
      return !(p.x > canvasWidth + blockSize * 0.5 || p.x < -blockSize * 0.5 || p.y > canvasHeight + blockSize * 0.5);
    });
  }

  /** 更新闪光粒子 */
  updateFlash(blockX: number, blockY: number, hasFlash: boolean): void {
    const { blockSize } = this.layout;
    // 清理过期粒子
    this.flashList = this.flashList.filter(p => !(p.size < blockSize * 0.1 || p.time > blockSize));

    // 生成新粒子
    if (hasFlash) {
      this.spawnFlashParticle(blockX, blockY);
    }

    // 更新位置
    for (const p of this.flashList) {
      p.x += p.speed * Math.cos(p.a);
      p.y += p.speed * Math.sin(p.a);
      p.size -= blockSize * 0.002;
      p.time++;
    }
  }

  /** 更新飞行文字 */
  updateTexts(): void {
    const { blockSize, canvasWidth } = this.layout;
    const targetX = canvasWidth * 0.342;
    const targetY = blockSize * 1.5;
    this.textList = this.textList.filter(p => {
      const dx = p.x - targetX;
      const dy = p.y - targetY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        p.x -= (p.startX - targetX) * 0.05;
        p.y -= (p.startY - targetY) * 0.05;
        return true;
      }
      return false;
    });
  }

  /** 加速所有粒子（结算时用） */
  boostParticles(): void {
    for (const p of this.starList) {
      p.a = 1.25 * Math.PI + 0.5 * Math.PI * Math.random();
      p.speed *= 2;
    }
  }

  /** 清空所有粒子 */
  clear(): void {
    this.starList = [];
    this.flashList = [];
    this.textList = [];
  }
}
