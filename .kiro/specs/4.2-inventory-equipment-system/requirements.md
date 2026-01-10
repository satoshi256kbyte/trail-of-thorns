# 要件定義書

## はじめに

本ドキュメントは、2DシミュレーションRPG「Trail of Thorns」におけるインベントリ・装備システムの要件を定義します。このシステムは、プレイヤーがアイテムを管理し、キャラクターに装備を付与することで戦略性を高める機能を提供します。

## 用語集

- **Inventory_System**: アイテムの保管・管理を行うシステム
- **Equipment_System**: キャラクターへの装備品の着脱を管理するシステム
- **Item**: ゲーム内で使用可能なアイテムの総称
- **Equipment**: キャラクターに装備可能なアイテム（武器、防具、アクセサリ）
- **Consumable**: 使用すると消費されるアイテム（回復薬、バフアイテム等）
- **Item_Slot**: インベントリ内のアイテム保管スロット
- **Equipment_Slot**: キャラクターの装備スロット（武器、防具、アクセサリ）
- **Item_Effect**: アイテムが持つ効果（能力値変化、回復、状態異常等）
- **Character**: アイテムを装備可能なゲーム内キャラクター
- **Battle_System**: 戦闘処理を管理するシステム
- **Save_System**: ゲームデータの保存・読み込みを管理するシステム

## 要件

### 要件1: インベントリ管理

**ユーザーストーリー**: プレイヤーとして、獲得したアイテムを保管・管理できるようにしたい。これにより、戦略的にアイテムを使用できる。

#### 受入基準

1. THE Inventory_System SHALL 最大100個のアイテムを保管できる
2. WHEN プレイヤーがアイテムを獲得する THEN THE Inventory_System SHALL アイテムをインベントリに追加する
3. WHEN インベントリが満杯の状態でアイテムを獲得する THEN THE Inventory_System SHALL エラーメッセージを表示し、アイテム獲得を拒否する
4. WHEN プレイヤーがアイテムを使用または破棄する THEN THE Inventory_System SHALL アイテムをインベントリから削除する
5. THE Inventory_System SHALL アイテムを種類別（装備、消耗品、素材等）にソート表示できる
6. THE Inventory_System SHALL アイテムの詳細情報（名前、説明、効果、数量）を表示できる

### 要件2: 装備システム

**ユーザーストーリー**: プレイヤーとして、キャラクターに装備を付与して能力を強化したい。これにより、戦闘での戦略性が向上する。

#### 受入基準

1. THE Equipment_System SHALL 各キャラクターに武器スロット1つを提供する
2. THE Equipment_System SHALL 各キャラクターに防具スロット1つを提供する
3. THE Equipment_System SHALL 各キャラクターにアクセサリスロット2つを提供する
4. WHEN プレイヤーが装備品をキャラクターに装着する THEN THE Equipment_System SHALL 装備品の効果をキャラクターの能力値に反映する
5. WHEN プレイヤーが装備品をキャラクターから外す THEN THE Equipment_System SHALL 装備品の効果をキャラクターの能力値から除去する
6. WHEN 装備スロットに既に装備品がある状態で新しい装備品を装着する THEN THE Equipment_System SHALL 既存の装備品をインベントリに戻し、新しい装備品を装着する
7. WHEN キャラクターが装備条件を満たさない装備品を装着しようとする THEN THE Equipment_System SHALL 装着を拒否し、エラーメッセージを表示する

### 要件3: アイテム効果システム

**ユーザーストーリー**: プレイヤーとして、アイテムの効果を理解し、適切に使用したい。これにより、戦闘や探索を有利に進められる。

#### 受入基準

1. WHEN 装備品が装着される THEN THE Item_Effect SHALL キャラクターの能力値（HP、MP、攻撃力、防御力、速度等）を変更する
2. WHEN 消耗品が使用される THEN THE Item_Effect SHALL 即座に効果を発動し、アイテムを消費する
3. WHEN 回復アイテムが使用される THEN THE Item_Effect SHALL キャラクターのHPまたはMPを回復する
4. WHEN バフアイテムが使用される THEN THE Item_Effect SHALL 一時的な能力値上昇効果を付与する
5. WHEN 状態異常回復アイテムが使用される THEN THE Item_Effect SHALL キャラクターの状態異常を解除する
6. THE Item_Effect SHALL 効果の持続時間を管理し、時間経過で効果を解除する

### 要件4: 装備条件システム

**ユーザーストーリー**: プレイヤーとして、キャラクターが装備できるアイテムの条件を理解したい。これにより、適切な装備選択ができる。

#### 受入基準

1. THE Equipment_System SHALL 装備品ごとに必要レベルを設定できる
2. THE Equipment_System SHALL 装備品ごとに必要職業を設定できる
3. WHEN キャラクターのレベルが装備品の必要レベル未満の場合 THEN THE Equipment_System SHALL 装備を拒否する
4. WHEN キャラクターの職業が装備品の必要職業と一致しない場合 THEN THE Equipment_System SHALL 装備を拒否する
5. THE Equipment_System SHALL 装備条件を満たさない装備品をUI上で視覚的に区別して表示する

### 要件5: アイテムデータ管理

**ユーザーストーリー**: 開発者として、アイテムデータを効率的に管理したい。これにより、バランス調整や新規アイテム追加が容易になる。

#### 受入基準

1. THE Inventory_System SHALL アイテムデータをJSONファイルから読み込む
2. THE Inventory_System SHALL アイテムデータのスキーマ検証を実行する
3. WHEN アイテムデータが不正な場合 THEN THE Inventory_System SHALL エラーログを出力し、デフォルト値を使用する
4. THE Inventory_System SHALL アイテムの画像アセットを動的に読み込む
5. THE Inventory_System SHALL アイテムデータの変更を即座にゲームに反映できる

### 要件6: インベントリUI

**ユーザーストーリー**: プレイヤーとして、直感的にインベントリを操作したい。これにより、ストレスなくアイテム管理ができる。

#### 受入基準

1. THE Inventory_System SHALL インベントリ画面を表示・非表示できる
2. THE Inventory_System SHALL アイテムをグリッド形式で表示する
3. WHEN プレイヤーがアイテムを選択する THEN THE Inventory_System SHALL アイテムの詳細情報を表示する
4. THE Inventory_System SHALL アイテムの使用・装備・破棄のアクションメニューを提供する
5. THE Inventory_System SHALL キーボードとマウスの両方で操作可能にする
6. THE Inventory_System SHALL アイテムのドラッグ&ドロップによる並び替えをサポートする

### 要件7: 装備UI

**ユーザーストーリー**: プレイヤーとして、キャラクターの装備状況を視覚的に確認したい。これにより、装備の最適化が容易になる。

#### 受入基準

1. THE Equipment_System SHALL キャラクターの装備画面を表示できる
2. THE Equipment_System SHALL 各装備スロットに装着中の装備品を表示する
3. WHEN プレイヤーが装備スロットを選択する THEN THE Equipment_System SHALL 装備可能なアイテム一覧を表示する
4. THE Equipment_System SHALL 装備変更前後の能力値比較を表示する
5. THE Equipment_System SHALL 装備条件を満たさないアイテムをグレーアウト表示する
6. THE Equipment_System SHALL 装備変更のプレビュー機能を提供する

### 要件8: 戦闘システム連携

**ユーザーストーリー**: プレイヤーとして、戦闘中にアイテムを使用したい。これにより、戦術の幅が広がる。

#### 受入基準

1. WHEN 戦闘中にプレイヤーがアイテムコマンドを選択する THEN THE Battle_System SHALL 使用可能なアイテム一覧を表示する
2. WHEN プレイヤーが戦闘中にアイテムを使用する THEN THE Battle_System SHALL アイテム効果を即座に適用する
3. WHEN 戦闘中にアイテムを使用する THEN THE Battle_System SHALL キャラクターのターンを消費する
4. THE Battle_System SHALL 装備品の効果を戦闘中の能力値計算に反映する
5. WHEN 戦闘中に装備品が破損する THEN THE Battle_System SHALL 装備品の耐久度を減少させる

### 要件9: データ永続化

**ユーザーストーリー**: プレイヤーとして、インベントリと装備の状態を保存したい。これにより、ゲームを中断・再開できる。

#### 受入基準

1. WHEN ゲームをセーブする THEN THE Save_System SHALL インベントリの全アイテムを保存する
2. WHEN ゲームをセーブする THEN THE Save_System SHALL 各キャラクターの装備状態を保存する
3. WHEN ゲームをロードする THEN THE Save_System SHALL インベントリの状態を復元する
4. WHEN ゲームをロードする THEN THE Save_System SHALL 各キャラクターの装備状態を復元する
5. THE Save_System SHALL インベントリデータをJSON形式でLocalStorageに保存する

### 要件10: エラーハンドリング

**ユーザーストーリー**: プレイヤーとして、システムエラーが発生しても適切なフィードバックを受けたい。これにより、問題を理解し対処できる。

#### 受入基準

1. WHEN アイテムデータの読み込みに失敗する THEN THE Inventory_System SHALL エラーメッセージを表示し、デフォルトアイテムを使用する
2. WHEN 不正なアイテム操作が試みられる THEN THE Inventory_System SHALL 操作を拒否し、理由を説明するメッセージを表示する
3. WHEN 装備の装着に失敗する THEN THE Equipment_System SHALL エラーメッセージを表示し、装備状態を変更しない
4. THE Inventory_System SHALL 全てのエラーをコンソールにログ出力する
5. THE Inventory_System SHALL クリティカルエラー発生時にゲームをクラッシュさせず、安全な状態に復帰する

### 要件11: パフォーマンス

**ユーザーストーリー**: プレイヤーとして、インベントリ操作が快適に動作してほしい。これにより、ストレスなくゲームを楽しめる。

#### 受入基準

1. THE Inventory_System SHALL インベントリ画面を500ms以内に表示する
2. THE Inventory_System SHALL アイテムの使用・装備操作を100ms以内に完了する
3. THE Inventory_System SHALL 100個のアイテムを保持してもフレームレートを60fps以上維持する
4. THE Equipment_System SHALL 装備変更時の能力値再計算を50ms以内に完了する
5. THE Inventory_System SHALL メモリ使用量を50MB以下に抑える
