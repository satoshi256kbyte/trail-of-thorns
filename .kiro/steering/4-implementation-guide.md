# 実装ガイド

## 実装開始の準備

### 開発環境確認

- ✅ Phaser 3.88.2 + TypeScript環境
- ✅ Vite開発サーバー
- ✅ Jest テスト環境
- ✅ ESLint + Prettier
- ✅ 既存のメニューシステム

### 必要な追加依存関係

```bash
# 数学計算ライブラリ（パスファインディング用）
npm install --save-dev @types/node

# 状態管理（必要に応じて）
npm install immer

# アニメーション補助
npm install gsap
```

## プロジェクト構造・実装手順

### ディレクトリ構成

```text
project-root/
├── game/                   # ゲーム本体
│   ├── src/               # ソースコード
│   │   ├── gameplay/      # ゲームプレイ関連
│   │   │   ├── scenes/    # ゲームプレイシーン
│   │   │   ├── systems/   # ゲームシステム
│   │   │   ├── managers/  # 各種マネージャー
│   │   │   └── ai/        # AI関連
│   │   ├── core/          # コアシステム
│   │   │   ├── math/      # 数学・計算
│   │   │   ├── data/      # データ管理
│   │   │   └── events/    # イベントシステム
│   │   ├── components/    # ゲームコンポーネント
│   │   │   ├── characters/ # キャラクター
│   │   │   ├── map/       # マップ関連
│   │   │   ├── ui/        # ゲーム内UI
│   │   │   └── effects/   # エフェクト
│   │   ├── types/         # 型定義
│   │   │   ├── game.ts    # ゲーム関連型
│   │   │   ├── character.ts # キャラクター型
│   │   │   └── map.ts     # マップ関連型
│   │   ├── scenes/        # Phaserシーン
│   │   ├── entities/      # ゲームエンティティ
│   │   ├── systems/       # ゲームシステム
│   │   ├── ui/           # UIコンポーネント
│   │   ├── utils/        # ユーティリティ
│   │   └── main.ts       # エントリーポイント
│   └── assets/           # ゲームアセット
├── data/                  # ゲームデータ（JSON）
├── editor/               # データエディター
├── server/               # サーバーサイド
└── tests/                # テストファイル
```

### 実装開始手順

#### ステップ1: 型定義の作成

最初に型定義を整備して、型安全な開発を進める：

```typescript
// game/src/types/game.ts
export interface GameState {
  currentTurn: number;
  activePlayer: 'player' | 'enemy';
  phase: 'select' | 'move' | 'action' | 'enemy';
  selectedUnit?: Unit;
  gameResult?: 'victory' | 'defeat' | null;
}

// game/src/types/character.ts
export interface Unit {
  id: string;
  name: string;
  position: Position;
  stats: UnitStats;
  currentHP: number;
  currentMP: number;
  faction: 'player' | 'enemy';
  hasActed: boolean;
  hasMoved: boolean;
}

// game/src/types/map.ts
export interface TileMap {
  width: number;
  height: number;
  tiles: Tile[][];
  units: Unit[];
}
```

#### ステップ2: 最初の実装対象

**GameplayScene の基本実装から開始**

理由：

- 他の全システムの基盤となる
- 早期に動作確認が可能
- 段階的に機能を追加できる

#### ステップ3: 開発サイクル

1. **設計** → 2. **実装** → 3. **テスト** → 4. **統合** → 5. **検証**

各機能を小さな単位で完成させ、継続的に統合テストを行う。

## コーディング規約

### ファイル命名規則

```typescript
// クラス名: PascalCase
class GameplayScene extends Phaser.Scene {}
class TurnManager {}

// インターフェース名: PascalCase (I接頭辞なし)
interface Unit {}
interface GameState {}

// メソッド名: camelCase
calculateDamage();
moveToPosition();

// 定数: UPPER_SNAKE_CASE
const MAX_MOVEMENT_RANGE = 5;
const TILE_SIZE = 32;

// ファイル名: PascalCase (クラスファイル)
GameplayScene.ts;
TurnManager.ts;

// ファイル名: camelCase (ユーティリティ)
pathfinding.ts;
damageCalculation.ts;
```

### コード構成

```typescript
// インポート順序
import * as Phaser from 'phaser'; // 外部ライブラリ
import { GameConfig } from '../config'; // 内部モジュール
import { Player } from './Player'; // 同階層

// クラス定義
export class GameScene extends Phaser.Scene {
  // プロパティ
  private player: Player;

  // コンストラクタ
  constructor() {
    super({ key: 'GameScene' });
  }

  // Phaserライフサイクルメソッド
  preload(): void {}
  create(): void {}
  update(): void {}

  // プライベートメソッド
  private setupPlayer(): void {}
}
```

### コメント規則

```typescript
/**
 * ターン制戦闘システムを管理するクラス
 * プレイヤーと敵のターンを交互に進行させ、
 * 各ユニットの行動を管理する
 */
class TurnManager {
  /**
   * 次のターンに進む
   * @param currentUnit 現在行動中のユニット
   * @returns 次に行動するユニット
   */
  nextTurn(currentUnit: Unit): Unit {
    // 実装...
  }
}
```

### 設計原則

- **単一責任の原則**: 各クラスは一つの責任のみを持つ
- **インターフェース活用**: 抽象化による疎結合設計
- **依存性注入**: テスタビリティの向上

## 実装の進め方

### 週次計画例

#### 第1週: GameplayScene基盤

- [ ] GameplayScene クラス作成
- [ ] 基本UI配置
- [ ] ステージデータ読み込み
- [ ] シーン遷移実装

#### 第2週: マップシステム基盤

- [ ] TileMap クラス実装
- [ ] 座標変換システム
- [ ] 基本的なマップ描画
- [ ] カメラ制御

#### 第3週: キャラクター基盤

- [ ] Character/Unit クラス
- [ ] キャラクター配置
- [ ] 基本的な描画
- [ ] 選択システム

#### 第4週: ターン制基盤

- [ ] TurnManager 実装
- [ ] 基本的なターン進行
- [ ] プレイヤー入力処理
- [ ] 状態管理

### 日次作業の進め方

#### 朝（計画・設計）

1. 今日実装する機能の確認
2. 必要な型定義・インターフェースの設計
3. テストケースの計画

#### 日中（実装）

1. 型定義・インターフェースの実装
2. 核となるクラス・メソッドの実装
3. 基本的なテストの作成

#### 夕方（テスト・統合）

1. 単体テストの実行・修正
2. 既存システムとの統合テスト
3. 動作確認・デバッグ

#### 夜（レビュー・計画）

1. 実装内容のレビュー
2. 翌日の作業計画
3. 問題点・改善点の記録

## アーキテクチャパターン

### Entity-Component-System (ECS)

- **エンティティ**: ゲームオブジェクトの識別子
- **コンポーネント**: データの格納
- **システム**: ロジックの処理

### Observer Pattern

- **イベント駆動**: 疎結合なコンポーネント間通信
- **状態管理**: ゲーム状態の管理・シーン遷移

### State Pattern

- **ゲーム状態**: ターン制の状態管理
- **キャラクター状態**: 行動状態の管理

### Command Pattern

- **アクションシステム**: アクション・アンドゥシステム
- **入力処理**: コマンドベースの入力管理

## 技術スタック

### コア技術

- **Phaser 3.88.2**: メインゲームエンジン
- **TypeScript**: 型安全な開発言語
- **Vite**: 高速ビルドツール
- **Vitest**: テストフレームワーク

### 品質管理ツール

- **ESLint**: コード静的解析
- **Prettier**: コードフォーマット
- **markdownlint**: ドキュメント品質管理
- **TypeScript strict mode**: 型安全性確保

### 依存関係管理

```json
{
  "dependencies": {
    "phaser": "^3.88.2",
    "typescript": "^5.0.0",
    "immer": "^10.0.0",
    "gsap": "^3.12.0"
  },
  "devDependencies": {
    "vite": "^7.3.0",
    "vitest": "^4.0.0",
    "@vitest/ui": "^4.0.0",
    "@vitest/coverage-v8": "^4.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "@types/node": "^20.0.0"
  }
}
```

## パフォーマンス要件・最適化

### 技術指標

- **初期ロード時間**: 5秒以内
- **フレームレート**: 60fps維持
- **メモリ使用量**: 512MB以下
- **バンドルサイズ**: 10MB以下
- **AI思考時間**: 2秒以内

### 最適化ポイント

1. **描画最適化**
   - 画面外オブジェクトの描画停止
   - スプライトプールの活用
   - テクスチャアトラスの使用

2. **計算最適化**
   - パスファインディングのキャッシュ
   - 移動範囲計算の最適化
   - AI思考時間の制限

3. **メモリ最適化**
   - 不要オブジェクトの適切な破棄
   - イベントリスナーの解除
   - テクスチャの適切な管理

### 最適化手法

- **コード最小化**: 本番ビルド時の圧縮
- **アセット最適化**: 画像・音声の適切な圧縮
- **Tree shaking**: 未使用コードの除去
- **遅延読み込み**: 必要時のアセット読み込み

### 監視指標

- フレームレート（60fps維持）
- メモリ使用量（512MB以下）
- ロード時間（5秒以内）
- AI思考時間（2秒以内）

## ブラウザサポート

### 対応ブラウザ

- **Chrome 90+** (WebGL 2.0対応)
- **Firefox 88+** (WebGL 2.0対応)
- **Safari 14+** (WebGL 2.0対応)
- **Edge 90+** (WebGL 2.0対応)

### モバイル対応

- **iOS Safari 14+**
- **Android Chrome 90+**
- **Samsung Internet 13+**

### WebGL要件

- **WebGL 1.0**: 必須
- **WebGL 2.0**: 推奨（高度な機能）

## データ管理標準

### JSON データ構造

- **スキーマ検証**: JSON Schemaによる構造検証
- **参照整合性**: データ間の参照チェック
- **バリデーション**: 自動検証・テスト

### データ管理戦略

- **静的データ**: JSON（キャラクター、アイテム、ステージ）
- **動的データ**: LocalStorage（セーブデータ）
- **将来的**: AWS DynamoDB（クラウドセーブ）

### バージョン管理

- **Git管理**: JSONファイルの変更履歴追跡
- **プルリクエスト**: データ変更の承認フロー
- **整合性チェック**: 自動バリデーション実行

## トラブルシューティング

### よくある問題と対策

#### 1. パフォーマンス低下

- **原因**: 過度な描画処理、メモリリーク
- **対策**: プロファイラーでボトルネック特定、オブジェクトプールの活用

#### 2. 座標計算エラー

- **原因**: グリッド座標とスクリーン座標の変換ミス
- **対策**: 座標変換関数の単体テスト強化、デバッグ表示の活用

#### 3. ターン制の状態不整合

- **原因**: 状態管理の複雑化、非同期処理の競合
- **対策**: 状態遷移の明確化、アクションキューの活用

#### 4. AI の無限ループ

- **原因**: 思考アルゴリズムの論理エラー
- **対策**: 思考時間制限、デバッグログの充実

## 次のステップ

1. **環境準備**: 追加依存関係のインストール
2. **型定義作成**: 基本的な型・インターフェースの定義
3. **GameplayScene実装**: 最初の具体的な実装開始
4. **継続的統合**: 小さな機能単位での統合・テスト

このガイドに従って、段階的にSRPGの実装を進めていきましょう。各段階で動作確認を行い、問題があれば早期に修正することで、安定した開発を進められます。
