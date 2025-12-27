# 要件ドキュメント

## はじめに

このドキュメントは、「魔性の薔薇」の世界観を持つSRPGにおけるボス戦・勝利条件システムの要件を定義します。このシステムは、ステージの目標管理、ボス戦の特殊処理、勝利・敗北判定、そしてステージクリア報酬の管理を担当します。

## 用語集

- **System**: ボス戦・勝利条件システム全体
- **Boss**: 魔性の薔薇の力を持つ特殊な敵ユニット
- **Objective**: ステージの目標（勝利条件）
- **Victory_Condition**: 勝利条件の判定ロジック
- **Defeat_Condition**: 敗北条件の判定ロジック
- **Reward**: ステージクリア時に獲得できる報酬
- **Rose_Essence**: 薔薇の力（ボス撃破時に獲得）
- **Stage**: 戦闘が行われるマップとユニット配置
- **Battle_System**: 戦闘処理を管理するシステム
- **Experience_System**: 経験値管理システム
- **Job_System**: 職業・ランクアップ管理システム
- **Recruitment_System**: 仲間化システム
- **Character_Loss_Manager**: キャラクターロスト管理システム

## 要件

### 要件1: 目標管理システム

**ユーザーストーリー:** ゲームデザイナーとして、ステージごとに異なる勝利条件を設定したい。プレイヤーが目標を理解し、進捗を確認できるようにしたい。

#### 受入基準

1. WHEN ステージが開始されるとき、THE System SHALL ステージの勝利条件を読み込む
2. WHEN ステージが開始されるとき、THE System SHALL ステージの敗北条件を読み込む
3. WHEN プレイヤーがUIを確認するとき、THE System SHALL 現在の目標を表示する
4. WHEN 目標の進捗が変化するとき、THE System SHALL 進捗状況を更新する
5. WHEN 複数の目標が存在するとき、THE System SHALL すべての目標を管理する
6. THE System SHALL 以下の目標種別をサポートする：ボス撃破、全滅、到達、生存、ユニット保護
7. WHEN 目標が達成されるとき、THE System SHALL 目標達成イベントを発行する
8. WHEN すべての勝利条件が満たされるとき、THE System SHALL 勝利判定を実行する
9. WHEN いずれかの敗北条件が満たされるとき、THE System SHALL 敗北判定を実行する

### 要件2: ボス戦システム

**ユーザーストーリー:** プレイヤーとして、魔性の薔薇の力を持つ強力なボスと戦いたい。ボス戦では特別な演出と報酬を期待する。

#### 受入基準

1. WHEN ボスユニットが定義されるとき、THE System SHALL ボスフラグを設定する
2. WHEN ボスユニットが定義されるとき、THE System SHALL 薔薇の力の量を設定する
3. WHEN ボスが戦闘に参加するとき、THE System SHALL ボス専用のAI行動パターンを適用する
4. WHEN ボスが攻撃を受けるとき、THE System SHALL ボス専用の戦闘演出を表示する
5. WHEN ボスのHPが一定値以下になるとき、THE System SHALL フェーズ変化の演出を表示する
6. WHEN ボスが撃破されるとき、THE System SHALL 特殊な撃破演出を表示する
7. WHEN ボスが撃破されるとき、THE System SHALL 薔薇の力を報酬として付与する
8. WHEN ボスが撃破されるとき、THE System SHALL ボス撃破イベントを発行する
9. THE System SHALL ボスユニットの特殊能力を管理する

### 要件3: 勝利・敗北判定システム

**ユーザーストーリー:** プレイヤーとして、ステージの勝利条件と敗北条件を明確に理解し、ゲームの結果を適切に判定してほしい。

#### 受入基準

1. WHEN 各ターン終了時、THE System SHALL すべての勝利条件をチェックする
2. WHEN 各ターン終了時、THE System SHALL すべての敗北条件をチェックする
3. WHEN すべての勝利条件が満たされるとき、THE System SHALL 勝利状態に遷移する
4. WHEN いずれかの敗北条件が満たされるとき、THE System SHALL 敗北状態に遷移する
5. WHEN 勝利状態に遷移するとき、THE System SHALL 勝利演出を表示する
6. WHEN 敗北状態に遷移するとき、THE System SHALL 敗北演出を表示する
7. WHEN 勝利状態に遷移するとき、THE System SHALL ゲーム進行を停止する
8. WHEN 敗北状態に遷移するとき、THE System SHALL ゲーム進行を停止する
9. THE System SHALL 勝利・敗北の判定結果をGameStateに反映する

### 要件4: ステージクリア報酬システム

**ユーザーストーリー:** プレイヤーとして、ステージをクリアしたときに適切な報酬を受け取りたい。報酬の内容を確認し、キャラクターの成長を実感したい。

#### 受入基準

1. WHEN ステージがクリアされるとき、THE System SHALL 報酬計算を実行する
2. WHEN 報酬計算が実行されるとき、THE System SHALL 基本経験値報酬を計算する
3. WHEN 報酬計算が実行されるとき、THE System SHALL クリア評価を計算する
4. WHEN ボスが撃破されているとき、THE System SHALL 薔薇の力を報酬に含める
5. WHEN 仲間化に成功したユニットがいるとき、THE System SHALL 仲間化報酬を計算する
6. WHEN 報酬が計算されるとき、THE System SHALL 報酬表示UIを表示する
7. WHEN プレイヤーが報酬を確認するとき、THE System SHALL 報酬受け取り処理を実行する
8. WHEN 報酬受け取り処理が実行されるとき、THE System SHALL Experience_Systemに経験値を付与する
9. WHEN 報酬受け取り処理が実行されるとき、THE System SHALL Job_Systemに薔薇の力を付与する
10. WHEN 報酬受け取り処理が実行されるとき、THE System SHALL Recruitment_Systemに仲間化情報を反映する

### 要件5: 戦闘システム統合

**ユーザーストーリー:** 開発者として、ボス戦システムが既存の戦闘システムとシームレスに統合されることを期待する。

#### 受入基準

1. WHEN ボスユニットが攻撃されるとき、THE System SHALL Battle_Systemに戦闘処理を委譲する
2. WHEN ボスユニットが撃破されるとき、THE System SHALL Battle_Systemから撃破イベントを受信する
3. WHEN 戦闘結果が生成されるとき、THE System SHALL ボス戦の特殊処理を適用する
4. WHEN ボスが特殊能力を使用するとき、THE System SHALL Skill_Systemと連携する
5. THE System SHALL Battle_Systemのイベントをリッスンする

### 要件6: 経験値システム統合

**ユーザーストーリー:** 開発者として、ステージクリア報酬が経験値システムと正しく連携することを期待する。

#### 受入基準

1. WHEN ステージクリア報酬が付与されるとき、THE System SHALL Experience_Systemに経験値を付与する
2. WHEN ボス撃破報酬が付与されるとき、THE System SHALL 特別な経験値ボーナスを計算する
3. THE System SHALL Experience_Systemのイベントをリッスンする

### 要件7: 職業システム統合

**ユーザーストーリー:** 開発者として、ボス撃破時の薔薇の力が職業システムと正しく連携することを期待する。

#### 受入基準

1. WHEN ボスが撃破されるとき、THE System SHALL 薔薇の力の量を計算する
2. WHEN 薔薇の力が付与されるとき、THE System SHALL Job_Systemに薔薇の力を付与する
3. WHEN 薔薇の力が付与されるとき、THE System SHALL ランクアップ可能なキャラクターを通知する
4. THE System SHALL Job_Systemのイベントをリッスンする

### 要件8: 仲間化システム統合

**ユーザーストーリー:** 開発者として、ステージクリア時の仲間化処理が正しく実行されることを期待する。

#### 受入基準

1. WHEN ステージがクリアされるとき、THE System SHALL Recruitment_Systemから仲間化状態を取得する
2. WHEN 仲間化に成功したユニットがいるとき、THE System SHALL 仲間化完了処理を実行する
3. WHEN 仲間化完了処理が実行されるとき、THE System SHALL 次ステージでの使用可能状態に設定する
4. THE System SHALL Recruitment_Systemのイベントをリッスンする

### 要件9: キャラクターロストシステム統合

**ユーザーストーリー:** 開発者として、ステージクリア時にキャラクターロスト状態が正しく処理されることを期待する。

#### 受入基準

1. WHEN ステージがクリアされるとき、THE System SHALL Character_Loss_Managerからロスト状態を取得する
2. WHEN ロストしたキャラクターがいるとき、THE System SHALL ロスト状態を報酬画面に表示する
3. WHEN ステージクリア後、THE System SHALL ロスト状態を次ステージに引き継ぐ
4. THE System SHALL Character_Loss_Managerのイベントをリッスンする

### 要件10: UIシステム統合

**ユーザーストーリー:** プレイヤーとして、目標、ボス情報、報酬などの情報を視覚的に確認したい。

#### 受入基準

1. WHEN ステージが開始されるとき、THE System SHALL 目標表示UIを表示する
2. WHEN ボスが存在するとき、THE System SHALL ボス情報UIを表示する
3. WHEN 目標の進捗が変化するとき、THE System SHALL 進捗表示を更新する
4. WHEN ステージがクリアされるとき、THE System SHALL 勝利画面を表示する
5. WHEN ステージが失敗したとき、THE System SHALL 敗北画面を表示する
6. WHEN 報酬が付与されるとき、THE System SHALL 報酬表示UIを表示する
7. THE System SHALL UIの表示・非表示を管理する

### 要件11: データ永続化

**ユーザーストーリー:** 開発者として、ステージクリア状態と報酬情報が適切に保存されることを期待する。

#### 受入基準

1. WHEN ステージがクリアされるとき、THE System SHALL クリア状態を保存する
2. WHEN 報酬が付与されるとき、THE System SHALL 報酬情報を保存する
3. WHEN 薔薇の力が付与されるとき、THE System SHALL 薔薇の力の総量を保存する
4. WHEN 次ステージに進むとき、THE System SHALL 前ステージの状態を読み込む
5. THE System SHALL セーブデータとの整合性を保つ

### 要件12: エラーハンドリング

**ユーザーストーリー:** 開発者として、システムエラーが適切に処理され、ユーザーに分かりやすいフィードバックが提供されることを期待する。

#### 受入基準

1. WHEN 目標データが不正なとき、THE System SHALL エラーメッセージを表示する
2. WHEN ボスデータが不正なとき、THE System SHALL エラーメッセージを表示する
3. WHEN 報酬計算でエラーが発生するとき、THE System SHALL デフォルト報酬を付与する
4. WHEN システム統合でエラーが発生するとき、THE System SHALL エラーログを記録する
5. THE System SHALL すべてのエラーを適切にハンドリングする

### 要件13: パフォーマンス最適化

**ユーザーストーリー:** プレイヤーとして、ボス戦や勝利判定がスムーズに動作することを期待する。

#### 受入基準

1. WHEN 勝利・敗北判定が実行されるとき、THE System SHALL 100ms以内に判定を完了する
2. WHEN 報酬計算が実行されるとき、THE System SHALL 200ms以内に計算を完了する
3. WHEN ボス演出が表示されるとき、THE System SHALL 60fpsを維持する
4. THE System SHALL 不要なメモリ割り当てを避ける
5. THE System SHALL 判定結果をキャッシュする

### 要件14: デバッグ・開発支援

**ユーザーストーリー:** 開発者として、ボス戦と勝利条件のデバッグを効率的に行いたい。

#### 受入基準

1. WHEN デバッグモードが有効なとき、THE System SHALL 目標の達成状態を表示する
2. WHEN デバッグモードが有効なとき、THE System SHALL ボス情報を詳細表示する
3. WHEN デバッグモードが有効なとき、THE System SHALL 報酬計算の内訳を表示する
4. THE System SHALL コンソールコマンドで勝利・敗北を強制できる
5. THE System SHALL コンソールコマンドでボスを即座に撃破できる
6. THE System SHALL コンソールコマンドで報酬を調整できる

### 要件15: テスト容易性

**ユーザーストーリー:** 開発者として、ボス戦・勝利条件システムを包括的にテストできることを期待する。

#### 受入基準

1. THE System SHALL すべての公開メソッドがユニットテスト可能である
2. THE System SHALL モックデータでテスト可能である
3. THE System SHALL 統合テストで他システムとの連携をテスト可能である
4. THE System SHALL E2Eテストでゲームフロー全体をテスト可能である
5. THE System SHALL テストカバレッジ90%以上を達成する
