# Design Document

## Overview

2DシミュレーションRPGプロジェクトの基盤となるディレクトリ構成を確立し、Phaser3とTypeScriptを使用したHelloWorldレベルのサンプルゲームを実装します。この設計では、開発標準に従った体系的なプロジェクト構造を作成し、将来の機能拡張に対応できる拡張性を持たせます。

## Architecture

### プロジェクト構造

```
project-root/
├── game/                   # ゲーム本体
│   ├── src/               # ソースコード
│   │   ├── scenes/        # Phaserシーン
│   │   │   └── HelloWorldScene.ts
│   │   ├── entities/      # ゲームエンティティ
│   │   ├── systems/       # ゲームシステム
│   │   ├── ui/           # UIコンポーネント
│   │   ├── utils/        # ユーティリティ
│   │   ├── config/       # 設定ファイル
│   │   │   └── GameConfig.ts
│   │   └── main.ts       # エントリーポイント
│   └── assets/           # ゲームアセット
├── data/                  # ゲームデータ（JSON）
├── editor/               # データエディター
├── server/               # サーバーサイド
└── tests/                # テストファイル
    └── game/
        └── scenes/
            └── HelloWorldScene.test.ts
```

### 技術スタック

- **Phaser 3.88.2**: メインゲームエンジン
- **TypeScript 5.0+**: 型安全な開発言語
- **Vite 5.0+**: 高速ビルドツール
- **Jest 29.0+**: テストフレームワーク
- **ESLint + Prettier**: コード品質管理

## Components and Interfaces

### 1. GameConfig クラス

```typescript
export class GameConfig {
  static readonly GAME_WIDTH = 1920;
  static readonly GAME_HEIGHT = 1080;
  static readonly BACKGROUND_COLOR = '#2c3e50';
  
  static getConfig(): Phaser.Types.Core.GameConfig {
    return {
      type: Phaser.AUTO,
      width: this.GAME_WIDTH,
      height: this.GAME_HEIGHT,
      parent: 'game-container',
      backgroundColor: this.BACKGROUND_COLOR,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [], // シーンは後で追加
    };
  }
}
```

### 2. HelloWorldScene クラス

```typescript
export class HelloWorldScene extends Phaser.Scene {
  private helloText?: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'HelloWorldScene' });
  }
  
  preload(): void {
    // 将来的なアセット読み込み用
  }
  
  create(): void {
    this.createHelloWorldText();
    this.setupBackground();
  }
  
  update(): void {
    // ゲームループ処理（現在は空）
  }
  
  private createHelloWorldText(): void {
    // Hello Worldテキストの作成
  }
  
  private setupBackground(): void {
    // 背景の設定
  }
}
```

### 3. メインエントリーポイント

```typescript
// main.ts
import { GameConfig } from './config/GameConfig';
import { HelloWorldScene } from './scenes/HelloWorldScene';

// シーンの登録
const config = GameConfig.getConfig();
config.scene = [HelloWorldScene];

// ゲーム開始
const game = new Phaser.Game(config);

// グローバルアクセス用（デバッグ時）
(window as any).game = game;
```

## Data Models

### GameConfig インターフェース

```typescript
interface IGameConfig {
  readonly GAME_WIDTH: number;
  readonly GAME_HEIGHT: number;
  readonly BACKGROUND_COLOR: string;
  getConfig(): Phaser.Types.Core.GameConfig;
}
```

### Scene基底クラス

```typescript
abstract class BaseScene extends Phaser.Scene {
  protected abstract sceneKey: string;
  
  constructor(key: string) {
    super({ key });
  }
  
  abstract preload(): void;
  abstract create(): void;
  abstract update(): void;
}
```

## Error Handling

### 1. TypeScript型チェック

- strict modeを有効にして型安全性を確保
- Phaserオブジェクトの適切な型注釈
- null/undefined チェックの徹底

### 2. ランタイムエラーハンドリング

```typescript
// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
  console.error('Game Error:', event.error);
  // 将来的にはエラー報告システムに送信
});

// Phaserエラーハンドリング
game.events.on('error', (error: Error) => {
  console.error('Phaser Error:', error);
});
```

### 3. 開発時デバッグ

```typescript
// 開発環境でのデバッグ情報
if (process.env.NODE_ENV === 'development') {
  // FPSカウンター表示
  // デバッグ情報の表示
  // コンソールログの詳細化
}
```

## Testing Strategy

### 1. ユニットテスト

```typescript
// HelloWorldScene.test.ts
describe('HelloWorldScene', () => {
  let scene: HelloWorldScene;
  
  beforeEach(() => {
    scene = new HelloWorldScene();
  });
  
  test('should create scene with correct key', () => {
    expect(scene.scene.key).toBe('HelloWorldScene');
  });
  
  test('should have required methods', () => {
    expect(typeof scene.preload).toBe('function');
    expect(typeof scene.create).toBe('function');
    expect(typeof scene.update).toBe('function');
  });
});
```

### 2. 統合テスト

```typescript
// GameConfig.test.ts
describe('GameConfig', () => {
  test('should return valid Phaser config', () => {
    const config = GameConfig.getConfig();
    
    expect(config.width).toBe(1920);
    expect(config.height).toBe(1080);
    expect(config.backgroundColor).toBe('#2c3e50');
    expect(config.type).toBe(Phaser.AUTO);
  });
});
```

### 3. E2Eテスト（将来的）

- ゲーム起動テスト
- シーン遷移テスト
- パフォーマンステスト

## Build and Development Workflow

### 1. 開発サーバー

```bash
npm run dev
# → Vite開発サーバー起動（localhost:3000）
# → ホットリロード有効
# → TypeScriptコンパイル監視
```

### 2. ビルドプロセス

```bash
npm run build
# → TypeScriptコンパイル
# → Viteによる最適化
# → dist/ディレクトリに出力
# → ソースマップ生成
```

### 3. テスト実行

```bash
npm test          # 一回実行
npm run test:watch    # 監視モード
npm run test:coverage # カバレッジ付き
```

### 4. コード品質チェック

```bash
npm run lint      # ESLintチェック
npm run format    # Prettierフォーマット
npm run type-check # TypeScript型チェック
```

## Performance Considerations

### 1. 初期ロード最適化

- Viteによるコード分割
- 必要最小限のアセット読み込み
- Tree shakingによる未使用コード除去

### 2. ランタイムパフォーマンス

- 60fps維持のための軽量な処理
- メモリリーク防止
- 適切なオブジェクトプール使用（将来的）

### 3. バンドルサイズ最適化

- Phaserの必要な機能のみインポート
- 圧縮・最小化の適用
- ソースマップは開発時のみ

## Security Considerations

### 1. 機密情報管理

- ハードコーディング禁止の徹底
- 環境変数による設定外部化
- AWS Secrets Manager活用（将来的）

### 2. コード品質

- TypeScript strict mode
- ESLintセキュリティルール
- 依存関係の脆弱性チェック

## Deployment Strategy

### 1. 静的ファイル配信

- S3 + CloudFront構成
- Viteビルド出力の最適化
- キャッシュ戦略の実装

### 2. CI/CD パイプライン

- GitHub Actions自動デプロイ
- テスト通過後のデプロイ
- ロールバック機能

## Future Extensibility

### 1. シーン管理システム

- シーンマネージャーの実装
- シーン間データ受け渡し
- 動的シーン読み込み

### 2. アセット管理システム

- アセットローダーの実装
- プリロード戦略
- アセットキャッシュ管理

### 3. 状態管理システム

- ゲーム状態の一元管理
- セーブ/ロード機能
- 設定管理システム
