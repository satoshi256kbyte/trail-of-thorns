# テストガイド

## テスト戦略

### テストピラミッド

```
        E2E Tests
       /          \
    Integration Tests
   /                  \
  Unit Tests (基盤)
```

- **Unit Tests (70%)**: 個別の関数・クラスのテスト
- **Integration Tests (20%)**: システム間の連携テスト
- **E2E Tests (10%)**: エンドツーエンドのユーザーシナリオテスト

### カバレッジ要件

- **ユニットテスト**: 90%以上のカバレッジ目標
- **統合テスト**: ゲームシステム間の連携検証
- **E2Eテスト**: 主要なゲームフロー検証

## ユニットテスト

### テスト対象

- 各クラスの公開メソッド
- 計算ロジック（ダメージ、移動範囲等）
- データ変換・検証
- ユーティリティ関数

### テスト例

```typescript
// MovementCalculator.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { MovementCalculator } from '../src/systems/MovementCalculator';
import { Unit, MapData } from '../src/types';

describe('MovementCalculator', () => {
  let calculator: MovementCalculator;
  let mockUnit: Unit;
  let mockMap: MapData;

  beforeEach(() => {
    calculator = new MovementCalculator();
    mockUnit = {
      id: 'test-unit',
      position: { x: 5, y: 5 },
      stats: { movement: 3 },
      // ... other properties
    };
    mockMap = {
      width: 10,
      height: 10,
      tiles: [], // mock tile data
    };
  });

  describe('calculateMovementRange', () => {
    test('should return correct movement range for unit', () => {
      const range = calculator.calculateMovementRange(mockUnit, mockMap);

      expect(range).toHaveLength(37); // 3x3 movement range
      expect(range).toContainEqual({ x: 5, y: 5 }); // starting position
      expect(range).toContainEqual({ x: 8, y: 5 }); // 3 tiles right
      expect(range).not.toContainEqual({ x: 9, y: 5 }); // out of range
    });

    test('should respect terrain movement costs', () => {
      // Add difficult terrain
      mockMap.tiles[6][5] = { type: 'mountain', movementCost: 2 };

      const range = calculator.calculateMovementRange(mockUnit, mockMap);

      // Should not reach position that requires 4 movement points
      expect(range).not.toContainEqual({ x: 7, y: 5 });
    });

    test('should handle map boundaries correctly', () => {
      mockUnit.position = { x: 0, y: 0 }; // corner position

      const range = calculator.calculateMovementRange(mockUnit, mockMap);

      expect(range).not.toContainEqual({ x: -1, y: 0 }); // out of bounds
      expect(range).toContainEqual({ x: 3, y: 0 }); // valid position
    });
  });

  describe('getMovementCost', () => {
    test('should return 1 for normal terrain', () => {
      const cost = calculator.getMovementCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockMap);

      expect(cost).toBe(1);
    });

    test('should return higher cost for difficult terrain', () => {
      mockMap.tiles[1][0] = { type: 'mountain', movementCost: 2 };

      const cost = calculator.getMovementCost({ x: 0, y: 0 }, { x: 1, y: 0 }, mockMap);

      expect(cost).toBe(2);
    });
  });
});
```

### モック・スタブの活用

```typescript
// GameStateManager.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../src/systems/GameStateManager';
import { Unit } from '../src/types';

// モックの作成
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'mock-unit',
  name: 'Mock Unit',
  position: { x: 0, y: 0 },
  stats: { speed: 10, maxHP: 100 },
  currentHP: 100,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
  ...overrides,
});

describe('GameStateManager', () => {
  let gameState: GameStateManager;

  beforeEach(() => {
    gameState = new GameStateManager();
  });

  test('should initialize turn order based on speed', () => {
    const fastUnit = createMockUnit({ id: 'fast', stats: { speed: 20 } });
    const slowUnit = createMockUnit({ id: 'slow', stats: { speed: 5 } });

    gameState.initializeTurnOrder([slowUnit, fastUnit]);

    expect(gameState.getCurrentUnit().id).toBe('fast');
  });
});
```

## 統合テスト

### テスト対象

- システム間の連携
- ゲーム状態の変化
- UI操作の結果
- データフロー

### テスト例

```typescript
// GameplayScene.integration.test.ts
import { GameplayScene } from '../src/scenes/GameplayScene';
import { StageData } from '../src/types';

describe('GameplayScene Integration', () => {
  let scene: GameplayScene;
  let mockStageData: StageData;

  beforeEach(() => {
    // Phaserのモック環境をセットアップ
    scene = new GameplayScene();
    mockStageData = {
      id: 'test-stage',
      mapData: { width: 10, height: 10, tiles: [] },
      playerUnits: [createMockUnit()],
      enemyUnits: [createMockUnit({ faction: 'enemy' })],
    };
  });

  test('should load stage data and initialize systems', () => {
    scene.loadStage(mockStageData);

    expect(scene.gameStateManager.getCurrentPlayer()).toBe('player');
    expect(scene.characterManager.getPlayerUnits()).toHaveLength(1);
    expect(scene.characterManager.getEnemyUnits()).toHaveLength(1);
  });

  test('should handle character selection and movement', () => {
    scene.loadStage(mockStageData);

    const playerUnit = scene.characterManager.getPlayerUnits()[0];
    scene.selectCharacter(playerUnit.id);

    expect(scene.movementSystem.getSelectedCharacter()).toBe(playerUnit);
    expect(scene.uiManager.isCharacterInfoVisible()).toBe(true);
  });

  test('should advance turn when all characters have acted', () => {
    scene.loadStage(mockStageData);

    const playerUnit = scene.characterManager.getPlayerUnits()[0];
    scene.executeCharacterAction(playerUnit.id, 'wait');

    expect(scene.gameStateManager.getCurrentPlayer()).toBe('enemy');
  });
});
```

## E2Eテスト

### テスト対象

- 完全なゲームプレイフロー
- ユーザーシナリオ
- エラーケース
- パフォーマンス

### Puppeteerを使用したE2Eテスト

```typescript
// e2e/gameplay.e2e.test.ts
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Gameplay E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: 50,
    });
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should complete full gameplay flow', async () => {
    // タイトル画面からゲーム開始
    await page.click('[data-testid="start-game-button"]');
    await page.waitForSelector('[data-testid="stage-select"]');

    // ステージ選択
    await page.click('[data-testid="stage-1"]');
    await page.waitForSelector('[data-testid="gameplay-scene"]');

    // キャラクター選択
    await page.click('[data-testid="player-unit-1"]');
    await page.waitForSelector('[data-testid="movement-range"]');

    // 移動実行
    await page.click('[data-testid="move-target"]');
    await page.waitForSelector('[data-testid="movement-animation"]', { hidden: true });

    // ターン終了確認
    const turnDisplay = await page.$eval('[data-testid="turn-display"]', el => el.textContent);
    expect(turnDisplay).toContain('Enemy Turn');
  });

  test('should handle error scenarios gracefully', async () => {
    // 無効なステージデータでのエラーハンドリング
    await page.goto('http://localhost:3000/invalid-stage');

    const errorMessage = await page.waitForSelector('[data-testid="error-message"]');
    expect(errorMessage).toBeTruthy();

    // エラー後の復旧
    await page.click('[data-testid="back-to-menu"]');
    await page.waitForSelector('[data-testid="title-screen"]');
  });
});
```

## パフォーマンステスト

### フレームレート監視

```typescript
// performance/framerate.test.ts
describe('Performance Tests', () => {
  test('should maintain 60fps during gameplay', async () => {
    const scene = new GameplayScene();
    const frameRateMonitor = new FrameRateMonitor();

    // 重い処理をシミュレート
    scene.loadStage(createLargeStageData());

    frameRateMonitor.start();

    // 10秒間のゲームプレイをシミュレート
    for (let i = 0; i < 600; i++) {
      scene.update(16.67); // 60fps = 16.67ms per frame
      await new Promise(resolve => setTimeout(resolve, 16));
    }

    const averageFPS = frameRateMonitor.getAverageFPS();
    expect(averageFPS).toBeGreaterThan(55); // 60fpsの90%以上
  });

  test('should not exceed memory limits', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // メモリを消費する処理
    const scene = new GameplayScene();
    for (let i = 0; i < 100; i++) {
      scene.loadStage(createMockStageData());
      scene.destroy();
    }

    // ガベージコレクション実行
    global.gc?.();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // メモリ増加が100MB以下であることを確認
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## デバッグツール・テスト支援

### 開発モード用デバッグ

```typescript
// debug/DebugManager.ts
export class DebugManager {
  private static instance: DebugManager;
  private debugMode: boolean = false;

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  enableDebugMode(): void {
    if (process.env.NODE_ENV === 'development') {
      this.debugMode = true;
      this.showGridCoordinates();
      this.showCharacterStats();
      this.enableConsoleCommands();
    }
  }

  private showGridCoordinates(): void {
    // グリッド座標の表示
  }

  private showCharacterStats(): void {
    // キャラクター統計の表示
  }

  private enableConsoleCommands(): void {
    // コンソールコマンドの有効化
    (window as any).debugCommands = {
      moveCharacter: (id: string, x: number, y: number) => {
        // キャラクター移動のデバッグコマンド
      },
      setHP: (id: string, hp: number) => {
        // HP設定のデバッグコマンド
      },
    };
  }
}
```

### テストデータ生成

```typescript
// test-utils/factories.ts
export class TestDataFactory {
  static createUnit(overrides: Partial<Unit> = {}): Unit {
    return {
      id: `unit-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Unit',
      position: { x: 0, y: 0 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
      ...overrides,
    };
  }

  static createStageData(overrides: Partial<StageData> = {}): StageData {
    return {
      id: 'test-stage',
      name: 'Test Stage',
      mapData: {
        width: 10,
        height: 10,
        tiles: Array(10)
          .fill(null)
          .map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
      },
      playerUnits: [this.createUnit()],
      enemyUnits: [this.createUnit({ faction: 'enemy' })],
      victoryConditions: [{ type: 'defeat_all_enemies' }],
      ...overrides,
    };
  }
}
```

## テスト実行・CI/CD統合

### テストコマンド

```bash
# 全テスト実行
npm test

# 監視モード
npm run test:watch

# カバレッジ付き実行
npm run test:coverage

# UIモード（ブラウザでテスト結果を確認）
npm run test:ui

# E2Eテスト実行
npm run test:e2e

# パフォーマンステスト実行
npm run test:performance
```

### GitHub Actions統合

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### テスト品質指標

- **テストカバレッジ**: 90%以上
- **テスト実行時間**: 5分以内
- **E2Eテスト成功率**: 95%以上
- **パフォーマンステスト**: 60fps維持

このテストガイドに従うことで、高品質で安定したゲームを開発できます。
