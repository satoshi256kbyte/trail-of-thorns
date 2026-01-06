# ゲームデータ

このディレクトリには、「Trail of Thorns」のゲームデータが含まれています。

## ファイル構成

### 章・ステージデータ

- **chapters.json**: 章データ（章の情報、ステージリスト、解放条件）
- **stages.json**: ステージデータ（マップ情報、ユニット配置、勝利条件、報酬）

### キャラクターデータ

- **characters.json**: キャラクターデータ（ステータス、職業、仲間化条件）
- **bosses.json**: ボスキャラクターデータ（特殊能力、薔薇の力報酬）

### その他のデータ

- **jobs.json**: 職業データ（ステータス補正、スキル）
- **skills.json**: スキルデータ（効果、消費MP、範囲）
- **weapons.json**: 武器データ（攻撃力、射程、特殊効果）
- **equipment.json**: 装備データ（防御力、特殊効果）
- **experience-table.json**: 経験値テーブル（レベルアップに必要な経験値）
- **growth-rates.json**: 成長率データ（レベルアップ時の能力値上昇率）
- **rose-essence-config.json**: 薔薇の力の設定（ランクアップコスト）
- **ai-config.json**: AI設定（行動パターン、優先度）

### スキーマファイル

- **schemas/chapter-schema.json**: 章データのJSONスキーマ
- **schemas/stage-schema.json**: ステージデータのJSONスキーマ
- **schemas/boss-schema.json**: ボスデータのJSONスキーマ
- **schemas/victory-condition-schema.json**: 勝利条件のJSONスキーマ

## データ構造

### 章データ (chapters.json)

```json
{
  "version": "1.0.0",
  "chapters": [
    {
      "id": "chapter-1",
      "name": "薔薇の目覚め",
      "storyDescription": "章のストーリー説明",
      "recommendedLevel": 1,
      "initialCharacters": ["protagonist", "ally_mage"],
      "stages": [
        {
          "id": "stage-1-1",
          "name": "村の異変",
          "chapterId": "chapter-1",
          "difficulty": 1,
          "recommendedLevel": 1,
          "unlockCondition": {
            "type": "PREVIOUS_STAGE",
            "requiredStageIds": []
          },
          "rewards": [
            {
              "type": "experience",
              "amount": 50,
              "description": "ステージクリア報酬"
            }
          ]
        }
      ],
      "unlockCondition": {
        "type": "NONE"
      }
    }
  ]
}
```

### ステージデータ (stages.json)

```json
{
  "version": "1.0.0",
  "stages": [
    {
      "id": "stage-1-1",
      "name": "村の異変",
      "chapterId": "chapter-1",
      "description": "ステージの説明",
      "isUnlocked": false,
      "thumbnail": "assets/thumbnails/village-crisis.png",
      "difficulty": 1,
      "recommendedLevel": 1,
      "order": 1,
      "unlockCondition": {
        "type": "PREVIOUS_STAGE",
        "requiredStageIds": []
      },
      "mapData": {
        "width": 12,
        "height": 8,
        "tileset": "village"
      },
      "playerUnits": [
        {
          "characterId": "protagonist",
          "startPosition": { "x": 1, "y": 4 }
        }
      ],
      "enemyUnits": [
        {
          "characterId": "enemy_knight_01",
          "startPosition": { "x": 10, "y": 4 }
        }
      ],
      "recruitableCharacters": [
        {
          "characterId": "enemy_knight_01",
          "isActive": true,
          "stageSpecificConditions": []
        }
      ],
      "victoryConditions": [
        {
          "type": "defeat_all_enemies",
          "description": "全ての敵を撃破する"
        }
      ],
      "defeatConditions": [
        {
          "type": "all_allies_defeated",
          "description": "味方が全滅する"
        }
      ],
      "rewards": [
        {
          "type": "experience",
          "amount": 50,
          "description": "ステージクリア報酬"
        }
      ]
    }
  ]
}
```

## 解放条件のタイプ

### 章の解放条件

- **NONE**: 最初から解放されている
- **PREVIOUS_CHAPTER**: 前の章をクリアすると解放

### ステージの解放条件

- **PREVIOUS_STAGE**: 前のステージをクリアすると解放
- **MULTIPLE_STAGES**: 複数のステージをクリアすると解放
- **CHAPTER_COMPLETE**: 章の全ステージをクリアすると解放

## 報酬のタイプ

- **experience**: 経験値
- **gold**: ゴールド
- **rose_essence**: 薔薇の力（職業ランクアップに使用）
- **item**: アイテム（itemIdで指定）

## 勝利条件のタイプ

- **defeat_all_enemies**: 全ての敵を撃破
- **defeat_boss**: ボスを撃破
- **reach_destination**: 指定地点に到達
- **survive_turns**: 指定ターン数生存
- **protect_npc**: NPCを守る

## 敗北条件のタイプ

- **all_allies_defeated**: 味方が全滅
- **turn_limit_exceeded**: ターン制限超過
- **npc_defeated**: NPCが倒される

## データ検証

データの整合性を検証するには、以下のコマンドを実行します：

```bash
npm run validate:data
```

このコマンドは以下をチェックします：

1. JSONスキーマに対する構造検証
2. 章とステージ間の参照整合性
3. ステージ解放条件の整合性
4. キャラクターIDの存在確認
5. マップ範囲内のユニット配置確認

## データ編集のガイドライン

### 章の追加

1. `chapters.json`に新しい章を追加
2. 章IDは`chapter-N`の形式（Nは連番）
3. `initialCharacters`に章開始時に利用可能なキャラクターIDを設定
4. `stages`に章内のステージ参照を追加
5. `unlockCondition`で解放条件を設定

### ステージの追加

1. `stages.json`に新しいステージを追加
2. ステージIDは`stage-N-M`の形式（N=章番号、M=ステージ番号）
3. `chapterId`で所属する章を指定
4. `unlockCondition`で解放条件を設定
5. `mapData`でマップサイズとタイルセットを指定
6. `playerUnits`と`enemyUnits`でユニット配置を設定
7. `victoryConditions`と`defeatConditions`で勝利・敗北条件を設定
8. `rewards`でクリア報酬を設定

### 注意事項

- ステージIDは一意である必要があります
- 解放条件で参照するステージIDは存在する必要があります
- ユニット配置はマップ範囲内である必要があります
- 各ステージには最低1つの勝利条件と敗北条件が必要です
- 章内のステージ数は1〜24の範囲内である必要があります

## トラブルシューティング

### データ検証エラーが出る場合

1. エラーメッセージを確認し、該当箇所を修正
2. JSONの構文エラーがないか確認（カンマ、括弧の対応など）
3. 参照しているIDが存在するか確認
4. スキーマファイルと照らし合わせて必須フィールドが揃っているか確認

### ゲーム内でデータが正しく読み込まれない場合

1. ブラウザのコンソールでエラーメッセージを確認
2. データファイルのパスが正しいか確認
3. データ検証スクリプトを実行して整合性を確認
4. キャッシュをクリアしてページをリロード

## 関連ドキュメント

- [章・ステージ管理システム設計書](../.kiro/specs/3.4-chapter-stage-management/design.md)
- [章・ステージ管理システム要件定義書](../.kiro/specs/3.4-chapter-stage-management/requirements.md)
- [実装タスク](../.kiro/specs/3.4-chapter-stage-management/tasks.md)
