# Git規約

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

### 破壊的変更の例

```bash
feat!: プレイヤーデータ構造を変更

BREAKING CHANGE: セーブデータの形式が変更されました。
既存のセーブデータは互換性がありません。
```

### 詳細な説明付き例

```bash
feat(game/systems): インベントリシステムを実装

- アイテムの追加・削除機能
- アイテムの並び替え機能
- アイテム使用時の効果適用
- UI との連携

Closes #123
```

## ブランチ命名規約

### ブランチ名形式

```
<type>/<scope>-<description>
```

### 例

```bash
feature/game-battle-system
fix/editor-save-bug
docs/setup-guide
refactor/player-class
hotfix/critical-bug
```

## プルリクエスト

### タイトル形式

プルリクエストのタイトルもConventional Commitsに従ってください。

```
feat(game/scenes): バトルシーンの実装
```

### 説明テンプレート

```markdown
## 変更内容

- 何を変更したか

## 動機・背景

- なぜこの変更が必要か

## テスト

- [ ] ユニットテスト追加
- [ ] 手動テスト実施

## 関連Issue

Closes #123
```

## 自動化

### commitlint設定

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "game", "editor", "data", "server", "infra"]
    ],
    "scope-enum": [
      2,
      "always",
      ["scenes", "entities", "systems", "ui", "assets", "components", "api", "cdk", "build", "ci", "deps", "config"]
    ]
  }
}
```

### Husky設定

```json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

## ベストプラクティス

### Do（推奨）

- 現在形で記述する（"add" not "added"）
- 最初の文字は小文字
- 末尾にピリオドを付けない
- 何を変更したかを明確に記述
- 一つのコミットで一つの変更

### Don't（非推奨）

- 曖昧な説明（"fix bug", "update code"）
- 過去形での記述
- 複数の無関係な変更を一つのコミットに含める
- 長すぎる説明文（50文字を大幅に超える）

## リリース管理

### セマンティックバージョニング

Conventional Commitsに基づいて自動的にバージョンを決定：

- **MAJOR**: 破壊的変更（BREAKING CHANGE）
- **MINOR**: 新機能（feat）
- **PATCH**: バグ修正（fix）

### 自動リリース

```bash
# standard-version を使用
npm run release

# 手動でバージョン指定
npm run release -- --release-as minor
```
