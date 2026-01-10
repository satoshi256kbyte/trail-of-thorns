# 統合セーブ・ロードUIシステム トラブルシューティングガイド

## 概要

このドキュメントは、統合セーブ・ロードUIシステムで発生する可能性のある問題と、その解決方法をまとめたものです。

## 目次

1. [よくある問題](#よくある問題)
2. [エラーメッセージ別対処法](#エラーメッセージ別対処法)
3. [パフォーマンス問題](#パフォーマンス問題)
4. [デバッグ方法](#デバッグ方法)
5. [FAQ](#faq)

---

## よくある問題

### 問題1: LocalStorageが利用できない

**症状**:
- 「ストレージが利用できません」エラーメッセージが表示される
- セーブ・ロード・削除ボタンが全て無効化される

**原因**:
1. ブラウザの設定でLocalStorageが無効化されている
2. プライベートモード/シークレットモードで実行している
3. ブラウザのセキュリティ設定が厳しい

**解決策**:

#### Chrome
1. 設定 → プライバシーとセキュリティ → Cookieと他のサイトデータ
2. 「Cookieをすべて受け入れる」または「サードパーティのCookieをブロックする」を選択
3. 「サイトにCookieデータの保存と読み取りを許可する」がオンになっていることを確認

#### Firefox
1. 設定 → プライバシーとセキュリティ
2. 「強化型トラッキング防止機能」を「標準」に設定
3. 「Cookieとサイトデータ」で「Cookieとサイトデータを保存する」がオンになっていることを確認

#### Safari
1. 環境設定 → プライバシー
2. 「サイト越えトラッキングを防ぐ」のチェックを外す（一時的）
3. 「すべてのCookieをブロック」のチェックを外す

#### Edge
1. 設定 → Cookieとサイトのアクセス許可
2. 「Cookieとサイトデータの保存と読み取りをサイトに許可する」をオンにする

**検証方法**:
```javascript
// ブラウザのコンソールで実行
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('LocalStorage is available');
} catch (e) {
  console.error('LocalStorage is not available:', e);
}
```

---

### 問題2: データが破損している

**症状**:
- 「データが破損しています」エラーメッセージが表示される
- スロットにデータがあるのにロードできない
- 詳細パネルに「データ破損」警告が表示される

**原因**:
1. LocalStorageのデータが不正な形式
2. データの一部が欠損している
3. ブラウザのバグやクラッシュによるデータ破損

**解決策**:

#### 方法1: 破損したスロットを削除
1. 破損したスロットを選択
2. 「削除」ボタンをクリック
3. 確認ダイアログで「削除する」をクリック

#### 方法2: ブラウザのキャッシュをクリア
1. ブラウザの設定を開く
2. 「閲覧履歴データの削除」を選択
3. 「Cookieと他のサイトデータ」と「キャッシュされた画像とファイル」を選択
4. 「データを削除」をクリック

#### 方法3: LocalStorageを手動でクリア
```javascript
// ブラウザのコンソールで実行（注意: 全てのセーブデータが削除されます）
localStorage.clear();
console.log('LocalStorage cleared');
```

**予防策**:
- 定期的に複数のスロットにバックアップを作成
- 重要なセーブデータは別のブラウザにもバックアップ
- ブラウザを正常に終了する（強制終了を避ける）

---

### 問題3: 容量不足エラー

**症状**:
- 「ストレージ容量が不足しています」警告メッセージが表示される
- セーブ操作が失敗する
- 使用率が90%を超えている

**原因**:
1. LocalStorageの容量制限（通常5-10MB）に達している
2. 他のサイトのデータが多い
3. セーブデータが大きすぎる

**解決策**:

#### 方法1: 不要なセーブデータを削除
1. 使用していないスロットを選択
2. 「削除」ボタンをクリック
3. 複数のスロットを削除して容量を確保

#### 方法2: 他のサイトのLocalStorageデータを削除
```javascript
// ブラウザのコンソールで実行（現在のサイトのみ）
// 注意: 全てのセーブデータが削除されます
localStorage.clear();
```

#### 方法3: ブラウザのストレージ設定を確認
1. Chrome: chrome://settings/content/all
2. Firefox: about:preferences#privacy
3. Safari: 環境設定 → プライバシー → Webサイトデータを管理
4. Edge: edge://settings/content/all

**容量確認方法**:
```javascript
// ブラウザのコンソールで実行
function getLocalStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024).toFixed(2) + ' KB';
}

console.log('LocalStorage size:', getLocalStorageSize());
```

---

### 問題4: スロット0への手動保存ができない

**症状**:
- スロット0を選択すると保存ボタンが無効化される
- 「スロット0はオートセーブ専用です」エラーメッセージが表示される

**原因**:
- スロット0はオートセーブ専用のため、手動保存は禁止されている

**解決策**:
- スロット1-9のいずれかを選択して保存してください
- オートセーブを有効にすると、自動的にスロット0に保存されます

**オートセーブの設定方法**:
1. 「オートセーブ: OFF」ボタンをクリック
2. 「オートセーブ: ON」に変更される
3. ゲームプレイ中、自動的にスロット0に保存されます

---

### 問題5: 空スロットからロードできない

**症状**:
- 空スロットを選択すると読み込みボタンが無効化される
- 「このスロットにはデータがありません」エラーメッセージが表示される

**原因**:
- 選択したスロットにセーブデータが存在しない

**解決策**:
- データが存在するスロット（スロット番号の横に情報が表示されている）を選択してください
- 新しいゲームを開始する場合は、「戻る」ボタンでタイトル画面に戻り、「新しいゲーム」を選択してください

---

### 問題6: シーン遷移が失敗する

**症状**:
- ロード後にゲーム画面に遷移しない
- 「シーンが見つかりません」エラーがコンソールに表示される

**原因**:
1. 遷移先シーンが存在しない
2. セーブデータの章・ステージ情報が不正

**解決策**:

#### 方法1: ブラウザをリロード
1. F5キーまたはCtrl+R（Mac: Cmd+R）でページをリロード
2. 再度ロードを試みる

#### 方法2: 別のスロットからロード
1. 他のスロットを選択
2. ロードを試みる

#### 方法3: 新しいゲームを開始
1. 「戻る」ボタンでタイトル画面に戻る
2. 「新しいゲーム」を選択

**デバッグ方法**:
```javascript
// ブラウザのコンソールで実行
// セーブデータの内容を確認
const saveData = JSON.parse(localStorage.getItem('save_slot_1'));
console.log('Save data:', saveData);
```

---

## エラーメッセージ別対処法

### 「ストレージが利用できません」

**エラーコード**: STORAGE_UNAVAILABLE

**対処法**:
1. [問題1: LocalStorageが利用できない](#問題1-localstorageが利用できない)を参照
2. ブラウザの設定を確認
3. プライベートモードを無効化
4. 別のブラウザで試す

---

### 「ストレージ容量が不足しています」

**エラーコード**: QUOTA_EXCEEDED

**対処法**:
1. [問題3: 容量不足エラー](#問題3-容量不足エラー)を参照
2. 不要なセーブデータを削除
3. ブラウザのキャッシュをクリア
4. 他のサイトのLocalStorageデータを削除

---

### 「データが破損しています」

**エラーコード**: DATA_CORRUPTED

**対処法**:
1. [問題2: データが破損している](#問題2-データが破損している)を参照
2. 破損したスロットを削除
3. 別のスロットからロード
4. 新しいゲームを開始

---

### 「スロット0はオートセーブ専用です」

**エラーコード**: AUTOSAVE_SLOT

**対処法**:
1. [問題4: スロット0への手動保存ができない](#問題4-スロット0への手動保存ができない)を参照
2. スロット1-9を選択
3. オートセーブ機能を活用

---

### 「このスロットにはデータがありません」

**エラーコード**: EMPTY_SLOT

**対処法**:
1. [問題5: 空スロットからロードできない](#問題5-空スロットからロードできない)を参照
2. データが存在するスロットを選択
3. 新しいゲームを開始

---

## パフォーマンス問題

### 問題1: FPSが低下する

**症状**:
- ゲームの動きがカクカクする
- アニメーションが滑らかでない
- 60fpsを維持できない

**原因**:
1. 同時実行アニメーション数が多すぎる
2. メモリリークによるガベージコレクション頻発
3. 不要な描画処理

**解決策**:

#### 方法1: ブラウザのハードウェアアクセラレーションを有効化
- Chrome: chrome://settings/ → 詳細設定 → システム → 「ハードウェアアクセラレーションが使用可能な場合は使用する」をオン
- Firefox: about:preferences → 一般 → パフォーマンス → 「推奨のパフォーマンス設定を使用する」をオン

#### 方法2: 他のタブを閉じる
- ブラウザの他のタブを閉じてメモリを解放

#### 方法3: ブラウザを再起動
- ブラウザを完全に終了して再起動

**パフォーマンス測定方法**:
```javascript
// ブラウザのコンソールで実行
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const currentTime = performance.now();
  
  if (currentTime - lastTime >= 1000) {
    console.log('FPS:', frameCount);
    frameCount = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

---

### 問題2: メモリ使用量が増加し続ける

**症状**:
- ゲームを長時間プレイするとメモリ使用量が増加
- ブラウザが重くなる
- 最終的にクラッシュする

**原因**:
1. イベントリスナーの解除漏れ
2. Tweenの削除漏れ
3. オブジェクトの破棄漏れ

**解決策**:

#### 方法1: ブラウザを再起動
- 定期的にブラウザを再起動してメモリをクリア

#### 方法2: シーンを再読み込み
- タイトル画面に戻ってから再度セーブ・ロード画面を開く

**メモリ使用量確認方法**:
- Chrome: Shift+Esc → タスクマネージャー
- Firefox: about:memory
- Safari: 開発 → Webインスペクタ → タイムライン

---

### 問題3: 初期化が遅い

**症状**:
- セーブ・ロード画面の表示に時間がかかる
- 1秒以上待たされる

**原因**:
1. 大量のオブジェクトを一度に作成
2. LocalStorageからの大量データ読み込み
3. 複雑な初期化処理

**解決策**:

#### 方法1: ブラウザのキャッシュをクリア
- ブラウザのキャッシュをクリアして再読み込み

#### 方法2: 不要なセーブデータを削除
- 使用していないスロットを削除してデータ量を減らす

---

## デバッグ方法

### ブラウザのコンソールを使用したデバッグ

#### LocalStorageの内容を確認

```javascript
// 全てのキーを表示
console.log('LocalStorage keys:', Object.keys(localStorage));

// 特定のスロットのデータを表示
const slotData = localStorage.getItem('save_slot_1');
console.log('Slot 1 data:', JSON.parse(slotData));

// 全てのスロットのデータを表示
for (let i = 0; i < 10; i++) {
  const data = localStorage.getItem(`save_slot_${i}`);
  console.log(`Slot ${i}:`, data ? JSON.parse(data) : 'Empty');
}
```

#### セーブデータの検証

```javascript
// セーブデータの構造を確認
const saveData = JSON.parse(localStorage.getItem('save_slot_1'));

console.log('Chapter State:', saveData?.chapterState);
console.log('Stage Progress:', saveData?.stageProgress);
console.log('Party Composition:', saveData?.partyComposition);
console.log('Play Time:', saveData?.playTime);
console.log('Timestamp:', new Date(saveData?.timestamp));
```

#### ストレージ使用量を確認

```javascript
// ストレージ使用量を計算
function calculateStorageUsage() {
  let total = 0;
  let details = {};
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = localStorage[key].length + key.length;
      total += size;
      details[key] = (size / 1024).toFixed(2) + ' KB';
    }
  }
  
  console.log('Total:', (total / 1024).toFixed(2) + ' KB');
  console.log('Details:', details);
}

calculateStorageUsage();
```

### Chrome DevToolsを使用したデバッグ

#### Application タブ

1. F12キーでDevToolsを開く
2. Applicationタブを選択
3. Storage → Local Storage → ゲームのURL
4. セーブデータのキーと値を確認

#### Console タブ

1. F12キーでDevToolsを開く
2. Consoleタブを選択
3. エラーメッセージや警告を確認
4. 上記のデバッグコマンドを実行

#### Performance タブ

1. F12キーでDevToolsを開く
2. Performanceタブを選択
3. 記録開始ボタンをクリック
4. セーブ・ロード操作を実行
5. 記録停止ボタンをクリック
6. フレームレートやメモリ使用量を確認

---

## FAQ

### Q1: セーブデータはどこに保存されますか？

**A**: セーブデータはブラウザのLocalStorageに保存されます。各ブラウザごとに独立したストレージを持つため、Chromeで保存したデータはFirefoxでは読み込めません。

---

### Q2: セーブデータをバックアップできますか？

**A**: はい、以下の方法でバックアップできます：

```javascript
// ブラウザのコンソールで実行
// 全てのセーブデータをエクスポート
const backup = {};
for (let i = 0; i < 10; i++) {
  const key = `save_slot_${i}`;
  const data = localStorage.getItem(key);
  if (data) {
    backup[key] = data;
  }
}

// JSONファイルとしてダウンロード
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'save_backup.json';
a.click();
```

---

### Q3: バックアップからセーブデータを復元できますか？

**A**: はい、以下の方法で復元できます：

```javascript
// ブラウザのコンソールで実行
// バックアップJSONファイルの内容をコピーして以下に貼り付け
const backup = {
  // バックアップデータをここに貼り付け
};

// LocalStorageに復元
for (let key in backup) {
  localStorage.setItem(key, backup[key]);
}

console.log('Backup restored');
```

---

### Q4: オートセーブはいつ実行されますか？

**A**: オートセーブは以下のタイミングで実行されます：
- ステージクリア時
- 章クリア時
- ゲーム終了時（ブラウザを閉じる前）

オートセーブを有効にするには、「オートセーブ: OFF」ボタンをクリックして「オートセーブ: ON」に変更してください。

---

### Q5: セーブデータは他のデバイスと同期できますか？

**A**: 現在のバージョンでは、セーブデータは各ブラウザのLocalStorageに保存されるため、他のデバイスとの同期はサポートされていません。将来のバージョンでクラウドセーブ機能が追加される予定です。

---

### Q6: セーブデータが消えることはありますか？

**A**: 以下の場合、セーブデータが消える可能性があります：
- ブラウザのキャッシュをクリアした場合
- ブラウザの設定でLocalStorageをクリアした場合
- ブラウザを再インストールした場合
- OSを再インストールした場合

定期的にバックアップを作成することをお勧めします。

---

### Q7: 最大何個のセーブデータを保存できますか？

**A**: 10個のスロット（スロット0-9）にセーブデータを保存できます。スロット0はオートセーブ専用で、スロット1-9は手動セーブ用です。

---

### Q8: セーブデータのサイズはどのくらいですか？

**A**: セーブデータのサイズは、ゲームの進行状況によって異なりますが、通常は1スロットあたり10-50KB程度です。LocalStorageの容量制限（通常5-10MB）を考慮すると、十分な余裕があります。

---

### Q9: セーブ・ロード操作をキャンセルできますか？

**A**: はい、以下の方法でキャンセルできます：
- 確認ダイアログで「いいえ」または「キャンセル」ボタンをクリック
- Escキーを押す
- ダイアログの外側をクリック

---

### Q10: キーボードだけで操作できますか？

**A**: はい、以下のキーで操作できます：
- ↑/↓: スロット選択の移動
- Tab: ボタン間の移動
- Enter: 選択中の項目を実行
- Esc: 画面を閉じる / ダイアログを閉じる

---

## サポート

上記の方法で問題が解決しない場合は、以下の情報を含めてGitHubのIssueで報告してください：

1. **ブラウザ情報**: ブラウザ名とバージョン
2. **OS情報**: オペレーティングシステムとバージョン
3. **エラーメッセージ**: 表示されたエラーメッセージの全文
4. **再現手順**: 問題が発生するまでの操作手順
5. **コンソールログ**: ブラウザのコンソールに表示されたエラーログ
6. **スクリーンショット**: 問題が発生した画面のスクリーンショット

---

## 関連ドキュメント

- [README.md](./README.md) - システム概要と使用方法
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - API仕様書
- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - パフォーマンス最適化ガイド

---

## バージョン履歴

### v1.0.0 (2026-01-10)

- 初回リリース
- 全てのトラブルシューティング情報を追加
- FAQ追加
- デバッグ方法追加

---

## ライセンス

このプロジェクトは「Trail of Thorns」ゲームの一部です。
