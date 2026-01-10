# 統合セーブ・ロードUI システム設計書

## 1. アーキテクチャ概要

### 1.1 システム構成

```
SaveLoadScene (新規実装)
├── SaveLoadManager (既存) - セーブ・ロード機能
├── SaveSlotList (新規) - スロット一覧表示
├── SaveSlotDetailPanel (新規) - 詳細情報パネル
├── SaveLoadActionPanel (新規) - アクション実行パネル
├── ConfirmationDialog (新規) - 確認ダイアログ
└── KeyboardNavigationManager (既存) - キーボード操作
```

### 1.2 設計原則

- **単一責任の原則**: 各コンポーネントは1つの責任のみを持つ
- **既存システムの再利用**: `SaveLoadManager`、`NavigableMenuButton`等を活用
- **一貫性**: 既存シーン（TitleScene、ChapterSelectScene）のUIパターンに従う
- **型安全性**: TypeScriptの型システムを最大限活用

## 2. コンポーネント設計

### 2.1 SaveLoadScene

**責務**: セーブ・ロード画面全体の管理

**主要プロパティ**:
```typescript
private saveLoadManager: SaveLoadManager;
private saveSlotList: SaveSlotList;
private detailPanel: SaveSlotDetailPanel;
private actionPanel: SaveLoadActionPanel;
private confirmDialog?: ConfirmationDialog;
private keyboardNavigation: KeyboardNavigationManager;
private currentMode: 'save' | 'load';
private selectedSlotId: number | null;
```

**主要メソッド**:
```typescript
public create(data?: SceneData): void;
public handleSlotSelect(slotId: number): void;
public handleSaveAction(): void;
public handleLoadAction(): void;
public handleDeleteAction(): void;
public showConfirmation(message: string, onConfirm: () => void): void;
```


### 2.2 SaveSlotList

**責務**: セーブスロット一覧の表示と選択管理

**主要プロパティ**:
```typescript
private slots: SaveSlotButton[];
private selectedIndex: number;
private onSlotSelect: (slotId: number) => void;
```

**主要メソッド**:
```typescript
public create(saveSlots: SaveSlot[]): void;
public selectSlot(index: number): void;
public updateSlots(saveSlots: SaveSlot[]): void;
public getSelectedSlotId(): number | null;
```

### 2.3 SaveSlotButton

**責務**: 個別のセーブスロットボタンの表示

**主要プロパティ**:
```typescript
private slotId: number;
private saveData: SaveData | null;
private isAutoSave: boolean;
private container: Phaser.GameObjects.Container;
```

**表示内容**:
- スロット番号（「オートセーブ」または「スロット1-9」）
- セーブデータの有無（「空きスロット」または章名）
- 最終保存日時（データがある場合）
- プレイ時間（データがある場合）

### 2.4 SaveSlotDetailPanel

**責務**: 選択中のスロットの詳細情報表示

**主要プロパティ**:
```typescript
private container: Phaser.GameObjects.Container;
private currentSlot: SaveSlot | null;
```

**表示内容**:
- 章名とステージ名
- 推奨レベル
- プレイ時間（時:分:秒形式）
- 最終保存日時（年/月/日 時:分形式）
- パーティ編成（キャラクター名リスト）
- 完了済みステージ数
- データ破損警告（該当する場合）


### 2.5 SaveLoadActionPanel

**責務**: セーブ・ロード・削除アクションの実行

**主要プロパティ**:
```typescript
private saveButton: NavigableMenuButton;
private loadButton: NavigableMenuButton;
private deleteButton: NavigableMenuButton;
private backButton: NavigableMenuButton;
private autoSaveToggle: NavigableMenuButton;
```

**ボタン配置**:
- 保存ボタン（セーブモード時のみ有効）
- 読み込みボタン（ロードモード時のみ有効）
- 削除ボタン（データありスロット選択時のみ有効）
- オートセーブトグル
- 戻るボタン

### 2.6 ConfirmationDialog

**責務**: 確認ダイアログの表示

**主要プロパティ**:
```typescript
private container: Phaser.GameObjects.Container;
private message: string;
private onConfirm: () => void;
private onCancel: () => void;
```

**表示内容**:
- メッセージテキスト
- 「はい」ボタン
- 「いいえ」/「キャンセル」ボタン

## 3. レイアウト設計

### 3.1 画面構成

```
┌─────────────────────────────────────────────────────────┐
│                  セーブ・ロード                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────┐    │
│  │ セーブスロット  │  │   詳細情報パネル         │    │
│  │                 │  │                          │    │
│  │ [オートセーブ]  │  │  章名: 第1章             │    │
│  │ 2024/01/08 12:00│  │  ステージ: ステージ1     │    │
│  │ 01:23:45        │  │  推奨レベル: 5           │    │
│  │                 │  │  プレイ時間: 01:23:45    │    │
│  │ [スロット1]     │  │  最終保存: 2024/01/08    │    │
│  │ 第1章           │  │  パーティ:               │    │
│  │ 2024/01/07 18:30│  │  - キャラA               │    │
│  │ 00:45:12        │  │  - キャラB               │    │
│  │                 │  │  完了ステージ: 3/10      │    │
│  │ [スロット2]     │  │                          │    │
│  │ 空きスロット    │  └──────────────────────────┘    │
│  │                 │                                   │
│  │ ...             │  ┌──────────────────────────┐    │
│  └─────────────────┘  │  [保存] [読み込み]       │    │
│                        │  [削除] [オートセーブ:ON]│    │
│                        │  [戻る]                  │    │
│                        └──────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 レイアウト定数

```typescript
private static readonly LAYOUT_CONFIG = {
  // スロットリスト
  slotListX: 150,
  slotListY: 200,
  slotWidth: 300,
  slotHeight: 100,
  slotSpacing: 110,
  
  // 詳細パネル
  detailPanelX: 500,
  detailPanelY: 200,
  detailPanelWidth: 600,
  detailPanelHeight: 500,
  
  // アクションパネル
  actionPanelX: 500,
  actionPanelY: 750,
  buttonWidth: 180,
  buttonHeight: 50,
  buttonSpacing: 200,
};
```


## 4. データフロー設計

### 4.1 シーン初期化フロー

```
SaveLoadScene.create()
  ↓
SaveLoadManager.getSaveSlots() → LocalStorage読み込み
  ↓
SaveSlotList.create(saveSlots) → スロット一覧表示
  ↓
KeyboardNavigationManager.setup() → キーボード操作設定
```

### 4.2 セーブ実行フロー

```
プレイヤーがスロット選択
  ↓
「保存」ボタンクリック
  ↓
既存データチェック
  ├─ データあり → 上書き確認ダイアログ表示
  │   ├─ 「はい」 → セーブ実行
  │   └─ 「いいえ」 → キャンセル
  └─ データなし → セーブ実行
      ↓
SaveLoadManager.saveGame(slotId, chapterState, stageProgress, party, playTime)
  ↓
LocalStorageManager.save() → LocalStorageに保存
  ↓
成功/失敗メッセージ表示
  ↓
スロット一覧更新
```

### 4.3 ロード実行フロー

```
プレイヤーがスロット選択（データあり）
  ↓
「読み込み」ボタンクリック
  ↓
確認ダイアログ表示（「現在の進行状況が失われます」）
  ├─ 「はい」 → ロード実行
  └─ 「いいえ」 → キャンセル
      ↓
SaveLoadManager.loadGame(slotId)
  ↓
LocalStorageManager.load() → LocalStorageから読み込み
  ↓
SaveDataValidator.validateSaveData() → データ検証
  ├─ 有効 → シーン遷移
  │   └─ ChapterSelectScene または StageSelectScene
  └─ 無効 → エラーメッセージ表示
```

### 4.4 削除実行フロー

```
プレイヤーがスロット選択（データあり）
  ↓
「削除」ボタンクリック
  ↓
削除確認ダイアログ表示
  ├─ 「削除する」 → 削除実行
  └─ 「キャンセル」 → キャンセル
      ↓
SaveLoadManager.deleteSaveData(slotId)
  ↓
LocalStorageManager.remove() → LocalStorageから削除
  ↓
成功/失敗メッセージ表示
  ↓
スロット一覧更新
```

## 5. 状態管理設計

### 5.1 シーン状態

```typescript
interface SaveLoadSceneState {
  mode: 'save' | 'load';
  selectedSlotId: number | null;
  isDialogOpen: boolean;
  isProcessing: boolean;
}
```

### 5.2 状態遷移

```
初期状態
  ↓
スロット選択 → selectedSlotId更新
  ↓
アクション実行 → isProcessing = true
  ↓
確認ダイアログ表示 → isDialogOpen = true
  ↓
処理完了 → isProcessing = false, isDialogOpen = false
  ↓
スロット一覧更新
```


## 6. エラーハンドリング設計

### 6.1 エラー種別と対応

| エラー種別 | 検出タイミング | 表示メッセージ | 対処法 |
|-----------|--------------|--------------|--------|
| データ破損 | ロード時 | 「セーブデータが破損しています」 | 別のスロットを選択 |
| ストレージ利用不可 | 初期化時 | 「ストレージが利用できません」 | ブラウザ設定確認 |
| 容量不足 | セーブ時 | 「ストレージ容量が不足しています」 | 不要なデータ削除 |
| 保存失敗 | セーブ時 | 「保存に失敗しました」 | 再試行 |
| 読み込み失敗 | ロード時 | 「読み込みに失敗しました」 | 再試行 |
| 削除失敗 | 削除時 | 「削除に失敗しました」 | 再試行 |

### 6.2 エラー表示コンポーネント

```typescript
class ErrorMessage {
  private container: Phaser.GameObjects.Container;
  
  public show(message: string, type: 'error' | 'warning' | 'info'): void {
    // エラーメッセージを3秒間表示
    // typeに応じて色を変更（error: 赤、warning: 黄、info: 青）
  }
  
  public hide(): void {
    // メッセージを非表示
  }
}
```

## 7. パフォーマンス最適化

### 7.1 最適化戦略

- **遅延読み込み**: 詳細パネルはスロット選択時に初めて描画
- **オブジェクトプール**: 確認ダイアログを再利用
- **テクスチャ共有**: 既存のUIコンポーネントのテクスチャを再利用
- **メモリ管理**: シーン破棄時に全オブジェクトを適切にクリーンアップ

### 7.2 パフォーマンス目標

- シーン初期化: 1秒以内
- セーブ操作: 2秒以内
- ロード操作: 3秒以内
- フレームレート: 60fps維持

## 8. 正確性プロパティ（Correctness Properties）

### 8.1 データ整合性

**プロパティ1**: セーブ後のデータは必ずLocalStorageに永続化される

```typescript
// Property-based test
test('セーブしたデータは必ずLocalStorageから読み込める', () => {
  const saveData = generateRandomSaveData();
  const slotId = randomInt(1, 9);
  
  manager.saveGame(slotId, saveData.chapterState, saveData.stageProgress, 
                   saveData.partyComposition, saveData.playTime);
  
  const loaded = manager.loadGame(slotId);
  
  expect(loaded).toEqual(saveData);
});
```

**プロパティ2**: 削除したスロットは空スロットとして表示される

```typescript
test('削除後のスロットは空として表示される', () => {
  const slotId = randomInt(1, 9);
  
  // セーブしてから削除
  manager.saveGame(slotId, ...);
  manager.deleteSaveData(slotId);
  
  const slots = manager.getSaveSlots();
  
  expect(slots[slotId].saveData).toBeNull();
});
```

### 8.2 UI状態の一貫性

**プロパティ3**: 選択中のスロットは常に1つのみ

```typescript
test('選択中のスロットは常に1つ', () => {
  const slotList = new SaveSlotList(...);
  
  slotList.selectSlot(0);
  slotList.selectSlot(1);
  
  const selectedCount = slotList.getSlots()
    .filter(slot => slot.isSelected).length;
  
  expect(selectedCount).toBe(1);
});
```

**プロパティ4**: 空スロットからのロードは常に禁止される

```typescript
test('空スロットからのロードは禁止', () => {
  const emptySlotId = findEmptySlot();
  
  const result = scene.handleLoadAction(emptySlotId);
  
  expect(result.success).toBe(false);
  expect(result.error).toBe('SLOT_EMPTY');
});
```

### 8.3 操作の冪等性

**プロパティ5**: 同じデータを複数回セーブしても結果は同じ

```typescript
test('同じデータの複数回セーブは冪等', () => {
  const saveData = generateRandomSaveData();
  const slotId = randomInt(1, 9);
  
  manager.saveGame(slotId, ...saveData);
  const firstLoad = manager.loadGame(slotId);
  
  manager.saveGame(slotId, ...saveData);
  const secondLoad = manager.loadGame(slotId);
  
  expect(firstLoad).toEqual(secondLoad);
});
```


## 9. シーン遷移設計

### 9.1 遷移元シーン

SaveLoadSceneへの遷移元:
- TitleScene（タイトル画面から）
- ChapterSelectScene（章選択画面から）
- StageSelectScene（ステージ選択画面から）
- GameplayScene（ゲームプレイ中のポーズメニューから）

### 9.2 遷移先シーン

SaveLoadSceneからの遷移先:
- 元のシーンに戻る（「戻る」ボタン）
- ChapterSelectScene（ロード成功時、章の途中から）
- StageSelectScene（ロード成功時、ステージ選択から）

### 9.3 シーンデータ

```typescript
interface SaveLoadSceneData extends SceneData {
  mode: 'save' | 'load';
  fromScene: string;
  currentGameState?: {
    chapterState: ChapterStateData;
    stageProgress: StageProgressData;
    partyComposition: PartyComposition;
    playTime: number;
  };
}
```

## 10. 既存システムとの統合

### 10.1 SaveLoadManager統合

```typescript
// SaveLoadSceneでの使用例
export class SaveLoadScene extends Phaser.Scene {
  private saveLoadManager: SaveLoadManager;
  
  constructor() {
    super({ key: 'SaveLoadScene' });
    this.saveLoadManager = new SaveLoadManager();
  }
  
  private handleSave(slotId: number): void {
    const gameState = this.getCurrentGameState();
    
    const success = this.saveLoadManager.saveGame(
      slotId,
      gameState.chapterState,
      gameState.stageProgress,
      gameState.partyComposition,
      gameState.playTime
    );
    
    if (success) {
      this.showSuccessMessage('保存完了');
    } else {
      this.showErrorMessage('保存失敗');
    }
  }
}
```

### 10.2 SceneTransition統合

```typescript
// シーン遷移の実装例
private async handleBack(): Promise<void> {
  const fromScene = this.data.get('fromScene') || 'TitleScene';
  
  await SceneTransition.transitionTo(
    this,
    fromScene,
    TransitionType.FADE,
    {
      fromScene: 'SaveLoadScene',
      action: 'back',
    }
  );
}

private async handleLoadSuccess(saveData: SaveData): Promise<void> {
  // ロードしたデータに基づいて適切なシーンに遷移
  const targetScene = this.determineTargetScene(saveData);
  
  await SceneTransition.transitionTo(
    this,
    targetScene,
    TransitionType.FADE,
    {
      fromScene: 'SaveLoadScene',
      action: 'load',
      loadedData: saveData,
    }
  );
}
```

### 10.3 KeyboardNavigationManager統合

```typescript
private setupKeyboardNavigation(): void {
  this.keyboardNavigation = new KeyboardNavigationManager(this);
  
  // スロットボタンを追加
  this.slotButtons.forEach(button => {
    this.keyboardNavigation.addElement(button);
  });
  
  // アクションボタンを追加
  this.keyboardNavigation.addElement(this.saveButton);
  this.keyboardNavigation.addElement(this.loadButton);
  this.keyboardNavigation.addElement(this.deleteButton);
  this.keyboardNavigation.addElement(this.backButton);
}
```

## 11. テスト戦略

### 11.1 ユニットテスト

- SaveLoadScene各メソッドの単体テスト
- SaveSlotList、SaveSlotDetailPanel等のコンポーネントテスト
- エラーハンドリングのテスト

### 11.2 統合テスト

- SaveLoadManagerとの統合テスト
- シーン遷移の統合テスト
- キーボードナビゲーションの統合テスト

### 11.3 プロパティベーステスト

- データ整合性のプロパティテスト（最低100回実行）
- UI状態の一貫性テスト
- 操作の冪等性テスト

### 11.4 E2Eテスト

- セーブ→ロードの完全フロー
- 上書き確認→キャンセルのフロー
- エラー発生時のリカバリーフロー

## 12. 実装の優先順位

### フェーズ1: 基本UI実装（高優先）

1. SaveLoadSceneの基本構造
2. SaveSlotListとSaveSlotButton
3. SaveSlotDetailPanel
4. 基本的なシーン遷移

### フェーズ2: アクション実装（高優先）

1. セーブ機能
2. ロード機能
3. 削除機能
4. 確認ダイアログ

### フェーズ3: 機能拡張（中優先）

1. オートセーブトグル
2. キーボードナビゲーション
3. エラーハンドリング強化
4. アニメーション・エフェクト

### フェーズ4: 品質向上（中優先）

1. テスト実装
2. パフォーマンス最適化
3. UI/UX改善
4. ドキュメント整備

## 13. 参照

- `game/src/systems/chapterStage/SaveLoadManager.ts` - 既存のセーブ・ロード機能
- `game/src/scenes/TitleScene.ts` - UIパターン参考
- `game/src/scenes/ChapterSelectScene.ts` - リスト表示パターン参考
- `game/src/ui/NavigableMenuButton.ts` - ボタンコンポーネント
- `game/src/utils/KeyboardNavigationManager.ts` - キーボード操作
- `game/src/utils/SceneTransition.ts` - シーン遷移
