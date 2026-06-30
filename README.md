# 消灭星星 Pop Star

经典消除小游戏「消灭星星」的现代化重构版。

基于原项目 [uuid1017/popstar](https://github.com/uuid1017/popstar)，借助 AI 辅助，使用现代前端技术栈完成全面重构，并集成了 PWA 技术以实现离线可玩。

## 技术栈

| 技术 | 说明 |
|------|------|
| TypeScript | 类型安全的开发体验 |
| Vite 5 | 快速构建与热更新 |
| Canvas 2D | 高性能游戏渲染（支持 DPR 适配） |
| Workbox (vite-plugin-pwa) | Service Worker 自动注册与离线缓存 |
| Vitest | 单元测试（94 用例） |
| Playwright | E2E 端到端测试（17 用例） |

## 功能特性

- **离线可玩** — PWA 技术，安装后无需网络即可游玩
- **状态持久化** — 自动保存进度，刷新或关闭不丢档
- **响应式适配** — 支持各种屏幕尺寸，Canvas 自适应 DPR
- **触控 + 鼠标** — 同时支持移动端触摸和桌面端鼠标操作
- **音效系统** — 选中、消除、通关等场景均有音效反馈
- **粒子动画** — 消除时的星星粒子飞散效果
- **多关卡** — 目标分数递增的关卡系统

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

## 测试

```bash
# 单元测试
pnpm test

# 单元测试（覆盖率）
pnpm test:coverage

# E2E 测试
pnpm test:e2e
```

## 部署

```bash
# 构建 + 部署（以 PinMe 为例）
pnpm build
pinme upload dist --domain popstar
```

PWA 配置了 `autoUpdate` 策略，每次部署后用户下次打开即自动更新，无需手动干预。

## 项目结构

```
src/
├── core/           # 游戏核心逻辑
│   ├── Game.ts     # 游戏主循环与状态管理
│   └── types.ts    # 类型定义与游戏常量
├── engine/         # 渲染与资源引擎
│   ├── Renderer.ts     # Canvas 渲染器
│   ├── AssetLoader.ts  # 图片资源加载
│   └── AudioManager.ts # 音效管理
├── game/           # 游戏逻辑
│   ├── Board.ts        # 棋盘逻辑（BFS、下落、左移）
│   └── ParticleSystem.ts # 粒子动画系统
├── input/          # 输入处理
│   └── InputHandler.ts # 触控与鼠标输入
├── storage/        # 存档系统
│   └── SaveManager.ts  # localStorage 异步防抖保存
├── ui/             # UI 管理
│   └── UIManager.ts    # 动画状态与 UI 贴图生命周期
└── main.ts         # 入口
```

## 致谢

- 原项目：[uuid1017/popstar](https://github.com/uuid1017/popstar)
- 游戏素材与玩法来自原版消灭星星
