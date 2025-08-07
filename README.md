# Trail Of Thorns

「魔性の薔薇」をテーマとしたダークファンタジー世界観の2DシミュレーションRPGです。
Phaser3とTypeScriptを使用して開発され、ブラウザで動作するWebゲームとして無料で公開予定です。

## ゲームの特徴

- **戦略的な戦闘システム**: 将棋のような戦略性を持つターン制SRPG
- **仲間化システム**: 敵キャラクターを一定条件で味方に引き込み可能
- **キャラクター成長**: レベルアップと職業ランクアップによる多様な成長
- **キャラクターロスト**: 章内でのキャラクター使用不可による緊張感
- **薔薇の力**: ボス撃破で得られる特殊な力による職業ランクアップ

## 現在の開発状況

### ✅ 完了済み機能

- **プロジェクト基盤**: TypeScript + Phaser3 + Vite環境
- **タイトル・メニューシステム**: タイトル画面、ステージ選択、設定画面
- **データ管理システム**: React製エディターによるゲームデータ管理
- **ゲームプレイシーン基盤**: カメラ制御、UI管理、ターン制システム
- **キャラクター移動システム**: A\*パスファインディング、移動範囲表示

### 🚧 開発中

- **戦闘システム**: 攻撃範囲計算、ダメージ計算、戦闘アニメーション
- **仲間化システム**: ゲーム固有の核心機能
- **キャラクターロストシステム**: 戦略性の核となるシステム

## 開発環境

### 必要なツール

- [asdf](https://asdf-vm.com/) - バージョン管理
- Node.js 23.10.0 (asdfで管理)
- npm

### セットアップ

1. リポジトリをクローン

   ```bash
   git clone <repository-url>
   cd trail-of-thorns
   ```

2. Node.jsのインストール（asdf使用）

   ```bash
   asdf install
   ```

3. 依存関係のインストール

   ```bash
   npm install
   ```

4. エディター環境のセットアップ（オプション）

   ```bash
   cd editor
   npm install
   ```

## 開発コマンド

### ゲーム開発

```bash
# ゲーム開発サーバー起動
npm run dev

# ゲームビルド
npm run build

# プレビューサーバー起動
npm run preview
```

### データエディター

```bash
# エディター開発サーバー起動
npm run editor:dev

# エディタービルド
npm run editor:build

# エディタープレビュー
npm run editor:preview
```

### テスト実行

```bash
# 全テスト実行
npm run test

# 監視モード
npm run test:watch

# カバレッジ付き実行
npm run test:coverage

# エディターテスト
npm run editor:test
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

### リリース管理

```bash
# セマンティックバージョニングでリリース
npm run release

# 特定バージョンでリリース
npm run release -- --release-as minor
```

## Git規約

### コミットメッセージ

このプロジェクトでは[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/)に従ってコミットメッセージを記述してください。

```bash
# 基本形式
<type>[optional scope]: <description>

# 例
feat: プレイヤーキャラクターの移動システムを追加
fix(battle): ターン制戦闘でのダメージ計算バグを修正
docs: READMEにセットアップ手順を追加
```

詳細は `.kiro/steering/git-conventions.md` を参照してください。

## プロジェクト構成

```text
├── .kiro/                   # Kiro IDE設定・プロジェクト管理
│   ├── specs/               # 機能仕様書（Spec）
│   ├── steering/            # 開発ガイドライン
│   └── hooks/               # 自動化フック
├── game/                    # ゲーム本体
│   └── src/                 # ゲームソースコード
├── src/                     # メインエントリーポイント
│   └── main.ts              # ゲーム起動ファイル
├── data/                    # ゲームデータ（JSON）
│   ├── config.json          # ゲーム設定
│   ├── stages.json          # ステージデータ
│   └── sample-map.json      # サンプルマップ
├── editor/                  # データエディター（React）
│   ├── src/                 # エディターソースコード
│   ├── dist/                # エディタービルド出力
│   └── README.md            # エディター専用ドキュメント
├── server/                  # サーバーサイド（将来用）
├── tests/                   # テストファイル
│   ├── game/                # ゲーム機能テスト
│   ├── integration/         # 統合テスト
│   └── comprehensive/       # 包括的テスト
└── coverage/                # テストカバレッジレポート
```

## 主要システム

### ゲーム固有システム

1. **仲間化システム**
   - 特定の敵キャラクターを味方に引き込み
   - 条件達成でNPC化 → ステージクリア時に仲間化

2. **キャラクターロストシステム**
   - 章内でのキャラクター使用不可
   - 章クリア時にロスト状態リセット

3. **薔薇の力システム**
   - ボス撃破時に獲得
   - 職業ランクアップに使用

4. **経験値システム**
   - 攻撃命中、敵撃破、味方支援で獲得
   - 多様な成長機会を提供

### 技術システム

- **ターン制戦闘**: プレイヤー・敵ターンの管理
- **移動システム**: A\*パスファインディング
- **マップシステム**: グリッドベースのタイル管理
- **UI管理**: ゲーム内UI・メニューシステム

## 技術スタック

### フロントエンド

- **ゲームエンジン**: Phaser 3.88.2
- **言語**: TypeScript
- **ビルドツール**: Vite
- **データ形式**: JSON

### データエディター

- **フレームワーク**: React + TypeScript
- **ビルドツール**: Vite
- **UI**: カスタムコンポーネント

### 開発ツール

- **パッケージマネージャー**: npm
- **バージョン管理**: asdf (.tool-versions)
- **テストフレームワーク**: Jest
- **コード品質**: ESLint + Prettier
- **ドキュメント**: Markdown + markdownlint
- **Git規約**: Conventional Commits

### 将来のインフラ（予定）

- **データベース**: AWS DynamoDB
- **認証**: AWS Cognito
- **API**: AWS Lambda + API Gateway
- **ホスティング**: Amazon S3 + CloudFront
- **インフラ**: AWS CDK
- **CI/CD**: GitHub Actions

## 開発ガイドライン

詳細な開発ガイドラインは `.kiro/steering/` ディレクトリを参照してください：

- **プロジェクト概要**: [1-project-overview.md](.kiro/steering/1-project-overview.md)
- **開発ロードマップ**: [2-development-roadmap.md](.kiro/steering/2-development-roadmap.md)
- **WBS**: [3-wbs.md](.kiro/steering/3-wbs.md)
- **実装ガイド**: [4-implementation-guide.md](.kiro/steering/4-implementation-guide.md)
- **Git規約**: [5-git-guide.md](.kiro/steering/5-git-guide.md)
- **セキュリティガイド**: [6-security-guide.md](.kiro/steering/6-security-guide.md)
- **テストガイド**: [7-test-guide.md](.kiro/steering/7-test-guide.md)
- **AWSガイド**: [8-aws-guide.md](.kiro/steering/8-aws-guide.md)

## 貢献方法

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

MIT License
