# Git規約ガイド

## Conventional Commits

このプロジェクトでは、[Conventional Commits v1.0.0](https://www.conventionalcommits.org/ja/v1.0.0/)に従ってコミットメッセージを記述してください。

## コミットメッセージ形式

### 基本構造

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 必須要素

- **type**: コミットの種類
- **description**: 変更内容の簡潔な説明（50文字以内推奨）

### オプション要素

- **scope**: 変更の影響範囲
- **body**: 詳細な説明
- **footer**: 破壊的変更やissue参照

## コミットタイプ

### 主要タイプ

- **feat**: 新機能の追加
- **fix**: バグ修正
- **docs**: ドキュメントのみの変更
- **style**: コードの動作に影響しない変更（空白、フォーマット、セミコロンの欠落など）
- **refactor**: バグ修正や機能追加ではないコードの変更
- **perf**: パフォーマンスを向上させるコードの変更
- **test**: テストの追加や既存テストの修正
- **chore**: ビルドプロセスやツール、ライブラリの変更

### プロジェクト固有タイプ

- **game**: ゲーム機能・システムの変更
- **editor**: データエディターの変更
- **data**: ゲームデータ（JSON）の変更
- **server**: サーバーサイドの変更
- **infra**: インフラ・デプロイ設定の変更

## スコープ例

### ゲーム関連

- **scenes**: Phaserシーン
- **entities**: ゲームエンティティ
- **systems**: ゲームシステム
- **ui**: UIコンポーネント
- **assets**: アセット管理

### 開発・運用

- **build**: ビルド設定
- **ci**: CI/CD設定
- **deps**: 依存関係
- **config**: 設定ファイル

## コミットメッセージ例

### 基本例

```bash
feat: プレイヤーキャラクターの移動システムを追加

fix(battle): ターン制戦闘でのダメージ計算バグを修正

docs: READMEにセットアップ手順を追加

style(ui): コードフォーマットを統一

refactor(entities): Player クラスの構造を改善

test(systems): BattleSystem のユニットテストを追加

chore(deps): phaser を 3.88.2 に更新
```

### スコープ付き例

```bash
feat(game/scenes): メインメニューシーンを実装

fix(editor/components): キャラクターエディターの保存エラーを修正

data(characters): 新しい敵キャラクターデータを追加

server(api): プレイヤーデータ保存APIを実装

infra(cdk): CloudFront設定を追加
```

### 詳細な説明を含む例

```bash
feat(game/movement): キャラクター移動システムを実装

グリッドベースの移動システムを追加:
- A*アルゴリズムによるパスファインディング
- 移動範囲の視覚的表示
- 地形コストの考慮
- アニメーション付きの移動実行

Closes #123
```

### 破壊的変更の例

```bash
feat(api)!: プレイヤーデータAPIの構造を変更

BREAKING CHANGE: プレイヤーデータのレスポンス形式が変更されました。
`player.stats` は `player.statistics` に変更されています。

Before:
{
  "player": {
    "stats": { "hp": 100 }
  }
}

After:
{
  "player": {
    "statistics": { "hp": 100 }
  }
}
```

## ブランチ戦略

### ブランチ命名規則

```bash
# 機能開発
feature/character-movement-system
feature/battle-system

# バグ修正
fix/turn-calculation-bug
fix/ui-rendering-issue

# ホットフィックス
hotfix/critical-save-bug

# リリース準備
release/v1.0.0
```

### ワークフロー

1. **feature ブランチ**: `main` から分岐して機能開発
2. **プルリクエスト**: 機能完成後に `main` へのマージリクエスト
3. **コードレビュー**: 最低1人のレビューを必須とする
4. **マージ**: Squash and merge を推奨

## プルリクエスト規約

### タイトル形式

プルリクエストのタイトルもConventional Commitsに従う：

```
feat(game/scenes): ゲームプレイシーンの基盤実装
fix(editor): キャラクターデータの保存エラーを修正
```

### 説明テンプレート

```markdown
## 概要

このプルリクエストの目的と変更内容を簡潔に説明

## 変更内容

- [ ] 新機能の追加
- [ ] バグ修正
- [ ] リファクタリング
- [ ] テストの追加

## テスト

- [ ] 既存テストが通ることを確認
- [ ] 新しいテストを追加
- [ ] 手動テストを実施

## 関連Issue

Closes #123
Refs #456

## スクリーンショット（必要に応じて）

変更の視覚的な確認ができる場合は添付

## チェックリスト

- [ ] コードレビューを受けた
- [ ] テストが通る
- [ ] ドキュメントを更新した
- [ ] 破壊的変更がある場合はCHANGELOGを更新した
```

## リリース管理

### セマンティックバージョニング

- **MAJOR**: 破壊的変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

### リリースプロセス

1. **リリースブランチ作成**: `release/v1.0.0`
2. **バージョン更新**: `package.json` のバージョン更新
3. **CHANGELOG更新**: リリース内容の記録
4. **タグ作成**: `git tag v1.0.0`
5. **リリースノート**: GitHub Releasesでの公開

### 自動リリース

```bash
# セマンティックバージョニングでリリース
npm run release

# 特定バージョンでリリース
npm run release -- --release-as minor
npm run release -- --release-as 1.1.0
```

## コミット前チェック

### Husky + lint-staged

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.md": ["markdownlint --fix"]
  }
}
```

### commitlint設定

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'game',
        'editor',
        'data',
        'server',
        'infra',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

## よくある間違いと対策

### 間違った例

```bash
# ❌ 曖昧なメッセージ
git commit -m "fix bug"
git commit -m "update code"
git commit -m "changes"

# ❌ 日本語と英語の混在
git commit -m "feat: add プレイヤー movement"

# ❌ 複数の変更を一つのコミットに
git commit -m "feat: add battle system and fix UI bugs"
```

### 正しい例

```bash
# ✅ 明確で具体的
git commit -m "fix(battle): ターン終了時のHP計算エラーを修正"
git commit -m "feat(ui): キャラクター選択時のハイライト表示を追加"

# ✅ 一つのコミットは一つの変更
git commit -m "feat(battle): 戦闘システムの基本実装"
git commit -m "fix(ui): ボタンクリック時の視覚フィードバック修正"
```

## Git設定推奨事項

### グローバル設定

```bash
# ユーザー情報設定
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# デフォルトブランチ名
git config --global init.defaultBranch main

# プルリクエスト時のマージ設定
git config --global pull.rebase false

# 改行コード設定（Windows）
git config --global core.autocrlf true

# 改行コード設定（Mac/Linux）
git config --global core.autocrlf input
```

### プロジェクト固有設定

```bash
# コミットテンプレート
git config commit.template .gitmessage

# フックの有効化
git config core.hooksPath .githooks
```

このGit規約に従うことで、プロジェクトの変更履歴が整理され、チーム開発が効率的に進められます。
