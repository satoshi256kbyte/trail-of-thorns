# 開発標準

## コーディング規約

### ファイル命名規則

- **TypeScriptファイル**: PascalCase (例: `GameScene.ts`)
- **JSONデータファイル**: kebab-case (例: `stage-001.json`)
- **アセットファイル**: kebab-case (例: `player-sprite.png`)
- **Reactコンポーネント**: PascalCase (例: `CharacterEditor.tsx`)

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

### 設計原則

- **単一責任の原則**: 各クラスは一つの責任のみを持つ
- **インターフェース活用**: 抽象化による疎結合設計
- **依存性注入**: テスタビリティの向上

## プロジェクト構造

### ディレクトリ構成

```text
project-root/
├── game/                   # ゲーム本体
│   ├── src/               # ソースコード
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

### アーキテクチャパターン

#### Entity-Component-System (ECS)

- **エンティティ**: ゲームオブジェクトの識別子
- **コンポーネント**: データの格納
- **システム**: ロジックの処理

#### Observer Pattern

- **イベント駆動**: 疎結合なコンポーネント間通信
- **状態管理**: ゲーム状態の管理・シーン遷移

## 技術スタック

### コア技術

- **Phaser 3.88.2**: メインゲームエンジン
- **TypeScript**: 型安全な開発言語
- **Vite**: 高速ビルドツール
- **Jest**: テストフレームワーク

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
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

## テスト標準

### カバレッジ要件

- **ユニットテスト**: 90%以上のカバレッジ目標
- **統合テスト**: ゲームシステム間の連携検証
- **E2Eテスト**: 主要なゲームフロー検証

### テスト戦略

- **データ読み込みテスト**: 全JSONファイルの正常読み込み確認
- **ゲーム統合テスト**: データ変更がゲームプレイに与える影響確認
- **パフォーマンステスト**: フレームレート・メモリ使用量監視

### テスト環境

- **Jest**: ユニット・統合テスト
- **@testing-library**: DOM操作テスト
- **Puppeteer**: E2Eテスト（必要に応じて）

## パフォーマンス要件

### 技術指標

- **初期ロード時間**: 5秒以内
- **フレームレート**: 60fps維持
- **メモリ使用量**: 512MB以下
- **バンドルサイズ**: 10MB以下

### 最適化手法

- **コード最小化**: 本番ビルド時の圧縮
- **アセット最適化**: 画像・音声の適切な圧縮
- **Tree shaking**: 未使用コードの除去
- **遅延読み込み**: 必要時のアセット読み込み

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

### バージョン管理

- **Git管理**: JSONファイルの変更履歴追跡
- **プルリクエスト**: データ変更の承認フロー
- **整合性チェック**: 自動バリデーション実行

## セキュリティ標準

### 機密情報管理

- **ハードコーディング禁止**: 機密情報のコード埋め込み禁止
- **AWS Secrets Manager**: 機密情報の安全な管理
- **環境変数**: 設定値の外部化

### データ保護

- **暗号化**: 保存時・転送時の暗号化
- **アクセス制御**: IAMロールによる最小権限
- **監査ログ**: 操作記録の保持
