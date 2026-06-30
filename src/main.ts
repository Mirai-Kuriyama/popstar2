import { Game } from './core/Game';
import { loadAllImages } from './engine/AssetLoader';

/** Loading 动画 */
function startLoadingAnimation(): () => void {
  const loading = document.getElementById('loading');
  if (!loading) return () => {};
  let dots = 0;
  const timer = setInterval(() => {
    dots = (dots + 1) % 4;
    loading.textContent = 'Loading' + '.'.repeat(dots);
  }, 500);
  return () => {
    clearInterval(timer);
    loading.classList.add('hidden');
  };
}

async function main(): Promise<void> {
  const stopLoading = startLoadingAnimation();

  try {
    // 加载图片资源
    const images = await loadAllImages();

    // 等待字体加载
    if (document.fonts) {
      await document.fonts.load('1em feltregular');
    }

    // 创建游戏实例
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const game = new Game(canvas, images);

    // 停止 Loading 动画
    stopLoading();

    // 启动游戏
    game.start();

    // E2E 测试接口（仅 dev 模式，生产构建自动 tree-shake）
    if (import.meta.env.DEV) {
      (window as any).__game = game;
    }

    // iOS 需要用户交互后才能播放音频
    const initAudioOnce = () => {
      game.initAudio();
      document.removeEventListener('touchstart', initAudioOnce);
      document.removeEventListener('mousedown', initAudioOnce);
    };
    document.addEventListener('touchstart', initAudioOnce, { once: true });
    document.addEventListener('mousedown', initAudioOnce, { once: true });
  } catch (err) {
    console.error('Failed to start game:', err);
    const loading = document.getElementById('loading');
    if (loading) loading.textContent = '加载失败';
  }
}

main();
