# Phaser3 Simulation RPG

Phaser3とTypeScriptを使用した2DシミュレーションRPGプロジェクトです。

## 開発環境

### 必要なツール

- [asdf](https://asdf-vm.com/) - バージョン管理
- Node.js 23.10.0 (asdfで管理)
- npm

### セットアップ

1. リポジトリをクローン

   ```bash
   git clone <repository-url>
   cd phaser3-simulation-rpg
   ```

1. Node.jsのインストール（asdf使用）

   ```bash
   asdf install
   ```

1. 依存関係のインストール

   ```bash
   npm install
   ```

## 開発コマンド

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### テスト実行

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### コード品質チェック

```bash
# TypeScriptコードのリント
npm run lint
npm run lint:fix

# Markdownドキュメントのリント
npm run lint:md
npm run lint:md:fix

# コードフォーマット
npm run format
npm run format:check

# 型チェック
npm run type-check
```

## プロジェクト構成

```text
├── .kiro/steering/          # プロジェクト管理・ガイドライン
│   ├── project-overview.md      # プロジェクト概要
│   ├── development-standards.md # 開発標準・コーディング規約
│   ├── deployment-guide.md      # デプロイメントガイド
│   └── security-policies.md     # セキュリティポリシー
├── src/                     # ソースコード
│   ├── scenes/              # Phaserシーン
│   ├── entities/            # ゲームエンティティ
│   ├── systems/             # ゲームシステム
│   ├── ui/                  # UIコンポーネント
│   ├── utils/               # ユーティリティ
│   └── main.ts              # エントリーポイント
├── data/                    # ゲームデータ（JSON）
├── editor/                  # データエディター
├── server/                  # サーバーサイド
└── tests/                   # テストファイル
```

## 技術スタック

- **ゲームエンジン**: Phaser 3
- **言語**: TypeScript
- **ビルドツール**: Vite
- **テスト**: Jest
- **コード品質**: ESLint + Prettier
- **ドキュメント**: Markdown + markdownlint

## ライセンス

MIT License
# trail-of-thorns
