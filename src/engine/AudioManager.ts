import { CONFIG } from '../core/types';

/** 音效名称 */
export type SoundName = 'pop' | 'select' | 'drop' | 'end' | 'clear' | 'target' | 'applause';

const SOUND_PATHS: Record<SoundName, string> = {
  pop: 'voice/pop.ogg',
  select: 'voice/select.ogg',
  drop: 'voice/drop.ogg',
  end: 'voice/end.ogg',
  clear: 'voice/clear.ogg',
  target: 'voice/target.ogg',
  applause: 'voice/applause.ogg',
};

/**
 * Web Audio API 音频管理器
 * - 低延迟播放（比 <audio> 元素快）
 * - 可编程音量/混音
 * - pop 音效自动节流
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers: Map<SoundName, AudioBuffer> = new Map();
  private masterGain: GainNode | null = null;
  private lastPopTime = 0;

  /** 初始化 AudioContext（需在用户交互后调用） */
  async init(): Promise<void> {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);

    // 加载全部音频 buffer
    const entries = Object.entries(SOUND_PATHS) as [SoundName, string][];
    await Promise.all(
      entries.map(async ([name, path]) => {
        const res = await fetch(path);
        const buf = await res.arrayBuffer();
        const audioBuf = await this.ctx!.decodeAudioData(buf);
        this.buffers.set(name, audioBuf);
      })
    );
  }

  /** 恢复被挂起的 AudioContext（iOS 需要用户交互后恢复） */
  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** 播放音效 */
  play(name: SoundName): void {
    if (!this.ctx || !this.masterGain) return;
    const buf = this.buffers.get(name);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.masterGain);
    src.start(0);
  }

  /** 播放消除音效（节流：至少间隔 POP_THROTTLE ms） */
  playPopThrottled(): void {
    const now = performance.now();
    if (now - this.lastPopTime >= CONFIG.POP_THROTTLE) {
      this.play('pop');
      this.lastPopTime = now;
    }
  }
}
