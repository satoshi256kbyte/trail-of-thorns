# API仕様書

## 概要

本ドキュメントは、インベントリ・装備システムの各コンポーネントのAPI仕様を定義します。

## 目次

1. [InventoryManager](#inventorymanager)
2. [EquipmentManager](#equipmentmanager)
3. [ItemEffectSystem](#itemeffectsystem)
4. [ItemDataLoader](#itemdataloader)
5. [InventoryUI](#inventoryui)
6. [EquipmentUI](#equipmentui)
7. [データ型定義](#データ型定義)
8. [エラーコード](#エラーコード)

---

## InventoryManager

インベントリの管理を担当するコアコンポーネント。

### コンストラクタ

```typescript
constructor(
  itemDataLoader: ItemDataLoader,
  maxSlots: number = 100,
  errorHandler?: InventoryErrorHandler
)
```

**パラメータ:**
- `itemDataLoader`: アイテムデータローダー
- `maxSlots`: 最大スロット数（デフォルト: 100）
- `errorHandler`: エラーハンドラー（オプション）

### メソッド

#### addItem

アイテムをインベントリに追加します。

```typescript
addItem(item: Item, quantity: number = 1): InventoryOperationResult
```

**パラメータ:**
- `item`: 追加するアイテム
- `quantity`: 追加する数量（デフォルト: 1）

**戻り値:** `InventoryOperationResult`
- `success`: 操作成功フラグ
- `message`: 結果メッセージ
- `affectedSlots`: 影響を受けたスロット番号の配列
- `newQuantity`: 追加後のアイテム総数（オプション）

**要件:** 1.2, 1.3

**例:**
```typescript
const result = inventoryManager.addItem(potion, 5);
if (result.success) {
  console.log(`Added 5 potions, total: ${result.newQuantity}`);
}
```

#### removeItem

アイテムをインベントリから削除します。

```typescript
removeItem(itemId: string, quantity: number = 1): InventoryOperationResult
```

**パラメータ:**
- `itemId`: 削除するアイテムのID
- `quantity`: 削除する数量（デフォルト: 1）

**戻り値:** `InventoryOperationResult`

**要件:** 1.4

**例:**
```typescript
const result = inventoryManager.removeItem('potion_hp_small', 1);
```

#### useItem

アイテムを使用します（消耗品のみ）。

```typescript
useItem(itemId: string, targetCharacterId?: string): ItemUseResult
```

**パラメータ:**
- `itemId`: 使用するアイテムのID
- `targetCharacterId`: 対象キャラクターID（オプション）

**戻り値:** `ItemUseResult`
- `success`: 使用成功フラグ
- `effectsApplied`: 適用された効果の配列
- `itemConsumed`: アイテム消費フラグ
- `remainingQuantity`: 残り数量
- `message`: 結果メッセージ

**要件:** 1.4, 3.2

**例:**
```typescript
const result = inventoryManager.useItem('potion_hp_small', 'character_001');
```

#### getItem

アイテムを取得します。

```typescript
getItem(itemId: string): Item | null
```

**パラメータ:**
- `itemId`: アイテムID

**戻り値:** アイテム、存在しない場合はnull

**要件:** 1.6

#### getAllItems

全てのインベントリスロットを取得します。

```typescript
getAllItems(): InventorySlot[]
```

**戻り値:** 全てのインベントリスロット

**要件:** 1.6

#### getItemCount

アイテムの総数を取得します。

```typescript
getItemCount(itemId: string): number
```

**パラメータ:**
- `itemId`: アイテムID

**戻り値:** アイテムの総数

#### getAvailableSlots

空きスロット数を取得します。

```typescript
getAvailableSlots(): number
```

**戻り値:** 空きスロット数

**要件:** 1.3

#### isFull

インベントリが満杯かどうかをチェックします。

```typescript
isFull(): boolean
```

**戻り値:** 満杯の場合true

**要件:** 1.3

#### sortItems

アイテムをソートします。

```typescript
sortItems(sortType: ItemSortType): void
```

**パラメータ:**
- `sortType`: ソートタイプ（TYPE, RARITY, NAME, QUANTITY）

**要件:** 1.5

**例:**
```typescript
inventoryManager.sortItems(ItemSortType.RARITY);
```

#### saveToLocalStorage / loadFromLocalStorage

インベントリをLocalStorageに保存・読み込みします。

```typescript
saveToLocalStorage(key: string = 'inventory_data'): boolean
loadFromLocalStorage(key: string = 'inventory_data'): boolean
```

**パラメータ:**
- `key`: 保存・読み込みキー

**戻り値:** 成功フラグ

**要件:** 9.1, 9.3, 9.5

---

## EquipmentManager

キャラクターの装備管理を担当するコンポーネント。

### コンストラクタ

```typescript
constructor(
  itemEffectSystem: ItemEffectSystem,
  inventoryManager: InventoryManager,
  errorHandler?: InventoryErrorHandler
)
```

### メソッド

#### equipItem

装備を装着します。

```typescript
equipItem(
  characterId: string,
  item: Equipment,
  slot: EquipmentSlotType,
  character: Character
): EquipmentOperationResult
```

**パラメータ:**
- `characterId`: キャラクターID
- `item`: 装備アイテム
- `slot`: 装備スロット（WEAPON, ARMOR, ACCESSORY1, ACCESSORY2）
- `character`: キャラクター情報

**戻り値:** `EquipmentOperationResult`
- `success`: 操作成功フラグ
- `message`: 結果メッセージ
- `previousEquipment`: 以前の装備
- `newEquipment`: 新しい装備
- `statsChanged`: 変更された能力値

**要件:** 2.1, 2.2, 2.3, 2.4, 2.6, 2.7

**例:**
```typescript
const result = equipmentManager.equipItem(
  'character_001',
  ironSword,
  EquipmentSlotType.WEAPON,
  character
);
```

#### unequipItem

装備を解除します。

```typescript
unequipItem(
  characterId: string,
  slot: EquipmentSlotType,
  character: Character
): Equipment | null
```

**パラメータ:**
- `characterId`: キャラクターID
- `slot`: 装備スロット
- `character`: キャラクター情報

**戻り値:** 解除された装備、存在しない場合はnull

**要件:** 2.5

#### getAllEquipment

全装備を取得します。

```typescript
getAllEquipment(characterId: string): EquipmentSet
```

**パラメータ:**
- `characterId`: キャラクターID

**戻り値:** 装備セット

**要件:** 2.1, 2.2, 2.3

#### checkEquipmentRequirements

装備条件をチェックします。

```typescript
checkEquipmentRequirements(
  characterId: string,
  item: Equipment,
  character: Character
): EquipmentCheckResult
```

**パラメータ:**
- `characterId`: キャラクターID
- `item`: 装備アイテム
- `character`: キャラクター情報

**戻り値:** `EquipmentCheckResult`
- `canEquip`: 装備可能フラグ
- `failureReasons`: 失敗理由の配列
- `missingRequirements`: 不足している条件

**要件:** 2.7, 4.3, 4.4

---

## ItemEffectSystem

アイテム効果の適用・管理を担当するコンポーネント。

### メソッド

#### applyEffect

効果を適用します。

```typescript
applyEffect(
  effect: ItemEffect,
  targetCharacterId: string,
  character: Character
): EffectApplicationResult
```

**パラメータ:**
- `effect`: 適用する効果
- `targetCharacterId`: 対象キャラクターID
- `character`: 対象キャラクター

**戻り値:** `EffectApplicationResult`
- `success`: 適用成功フラグ
- `message`: 結果メッセージ
- `valueApplied`: 適用された効果値
- `effectId`: 効果ID

**要件:** 3.1, 3.2, 3.3, 3.4, 3.5

#### updateTemporaryEffects

一時効果を更新します（ターン経過処理）。

```typescript
updateTemporaryEffects(deltaTime: number): ActiveEffect[]
```

**パラメータ:**
- `deltaTime`: 経過時間（ミリ秒）

**戻り値:** 解除された効果のリスト

**要件:** 3.6

#### getActiveEffects

アクティブな効果を取得します。

```typescript
getActiveEffects(characterId: string): ItemEffect[]
```

**パラメータ:**
- `characterId`: キャラクターID

**戻り値:** アクティブな効果のリスト

---

## ItemDataLoader

アイテムデータの読み込みと検証を担当するコンポーネント。

### メソッド

#### loadItemData

JSONファイルからアイテムデータを読み込みます。

```typescript
async loadItemData(filePath: string): Promise<void>
```

**パラメータ:**
- `filePath`: JSONファイルのパス

**要件:** 5.1

#### getItemDefinition

アイテム定義を取得します。

```typescript
getItemDefinition(itemId: string): ItemDefinition | null
```

**パラメータ:**
- `itemId`: アイテムID

**戻り値:** アイテム定義、存在しない場合はnull

**要件:** 5.1

#### getAllItemDefinitions

全てのアイテム定義を取得します。

```typescript
getAllItemDefinitions(): ItemDefinition[]
```

**戻り値:** 全てのアイテム定義

---

## InventoryUI

インベントリ画面の表示と操作を担当するUIコンポーネント。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  inventoryManager: InventoryManager,
  config?: Partial<InventoryUIConfig>
)
```

### メソッド

#### show / hide

画面を表示・非表示します。

```typescript
show(): void
hide(): void
```

**要件:** 6.1

#### updateItemDisplay

アイテム表示を更新します。

```typescript
updateItemDisplay(): void
```

**要件:** 6.2, 6.3

#### selectItem

アイテムを選択します。

```typescript
selectItem(itemId: string): void
```

**パラメータ:**
- `itemId`: アイテムID

**要件:** 6.3

#### showActionMenu

アクションメニューを表示します。

```typescript
showActionMenu(itemId: string): void
```

**パラメータ:**
- `itemId`: アイテムID

**要件:** 6.4

#### sortItems

アイテムをソートします。

```typescript
sortItems(sortType: ItemSortType): void
```

**パラメータ:**
- `sortType`: ソートタイプ

**要件:** 6.2

#### handleDragDrop

ドラッグ&ドロップ処理を実行します。

```typescript
handleDragDrop(fromSlot: number, toSlot: number): void
```

**パラメータ:**
- `fromSlot`: 移動元スロット番号
- `toSlot`: 移動先スロット番号

**要件:** 6.6

### イベント

- `show`: 画面表示時
- `hide`: 画面非表示時
- `itemUsed`: アイテム使用時
- `equipRequested`: 装備要求時
- `itemDiscarded`: アイテム破棄時
- `itemMoved`: アイテム移動時

---

## EquipmentUI

装備画面の表示と操作を担当するUIコンポーネント。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  equipmentManager: EquipmentManager,
  inventoryManager: InventoryManager,
  config?: Partial<EquipmentUIConfig>
)
```

### メソッド

#### show / hide

画面を表示・非表示します。

```typescript
show(characterId: string, character: Character): void
hide(): void
```

**パラメータ:**
- `characterId`: キャラクターID
- `character`: キャラクター情報

**要件:** 7.1

#### updateEquipmentDisplay

装備表示を更新します。

```typescript
updateEquipmentDisplay(characterId: string): void
```

**パラメータ:**
- `characterId`: キャラクターID

**要件:** 7.2

#### showEquippableItems

装備可能アイテム一覧を表示します。

```typescript
showEquippableItems(slot: EquipmentSlotType): void
```

**パラメータ:**
- `slot`: 装備スロット

**要件:** 7.3, 7.5

#### showStatComparison

能力値比較を表示します。

```typescript
showStatComparison(
  currentEquipment: Equipment | null,
  newEquipment: Equipment
): void
```

**パラメータ:**
- `currentEquipment`: 現在の装備
- `newEquipment`: 新しい装備

**要件:** 7.4

#### showEquipmentPreview

装備プレビューを表示します。

```typescript
showEquipmentPreview(equipment: Equipment): void
```

**パラメータ:**
- `equipment`: 装備

**要件:** 7.6

### イベント

- `show`: 画面表示時
- `hide`: 画面非表示時
- `equipmentChanged`: 装備変更時

---

## データ型定義

### Item（アイテム基底型）

```typescript
interface Item {
  id: string;                    // アイテムID
  name: string;                  // アイテム名
  description: string;           // 説明
  type: ItemType;                // アイテム種類
  rarity: ItemRarity;            // レアリティ
  iconPath: string;              // アイコン画像パス
  maxStack: number;              // 最大スタック数
  sellPrice: number;             // 売却価格
  buyPrice: number;              // 購入価格
}

type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'key';
type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
```

### Equipment（装備品）

```typescript
interface Equipment extends Item {
  type: 'weapon' | 'armor' | 'accessory';
  slot: EquipmentSlotType;       // 装備スロット
  stats: EquipmentStats;         // 能力値ボーナス
  requirements: EquipmentRequirements; // 装備条件
  durability: number;            // 耐久度
  maxDurability: number;         // 最大耐久度
  effects: ItemEffect[];         // 装備効果
}

type EquipmentSlotType = 'weapon' | 'armor' | 'accessory1' | 'accessory2';

interface EquipmentStats {
  hp?: number;
  mp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  accuracy?: number;
  evasion?: number;
}

interface EquipmentRequirements {
  level?: number;                // 必要レベル
  job?: string;                  // 必要職業
  stats?: Partial<EquipmentStats>; // 必要能力値
}
```

### Consumable（消耗品）

```typescript
interface Consumable extends Item {
  type: 'consumable';
  consumableType: ConsumableType;
  effects: ItemEffect[];         // 使用効果
  usableInBattle: boolean;       // 戦闘中使用可能
  targetType: TargetType;        // 対象タイプ
}

type ConsumableType = 'healing' | 'buff' | 'debuff' | 'cure' | 'revive';
type TargetType = 'self' | 'single' | 'all' | 'area';
```

### ItemEffect（アイテム効果）

```typescript
interface ItemEffect {
  id: string;                    // 効果ID
  type: EffectType;              // 効果タイプ
  target: EffectTarget;          // 効果対象
  value: number;                 // 効果値
  duration: number;              // 持続時間（ターン数、0=永続）
  isPermanent: boolean;          // 永続効果フラグ
  stackable: boolean;            // 重複可能フラグ
}

type EffectType = 
  | 'stat_boost'                 // 能力値上昇
  | 'stat_reduction'             // 能力値減少
  | 'hp_recovery'                // HP回復
  | 'mp_recovery'                // MP回復
  | 'status_cure'                // 状態異常回復
  | 'status_inflict'             // 状態異常付与
  | 'damage'                     // ダメージ
  | 'shield';                    // シールド

type EffectTarget = 'hp' | 'mp' | 'attack' | 'defense' | 'speed' | 'accuracy' | 'evasion' | 'status';
```

### InventorySlot（インベントリスロット）

```typescript
interface InventorySlot {
  slotIndex: number;             // スロット番号
  item: Item | null;             // アイテム
  quantity: number;              // 数量
  isEmpty: boolean;              // 空きスロットフラグ
}
```

### EquipmentSet（装備セット）

```typescript
interface EquipmentSet {
  weapon: Equipment | null;
  armor: Equipment | null;
  accessory1: Equipment | null;
  accessory2: Equipment | null;
}
```

### InventoryOperationResult（インベントリ操作結果）

```typescript
interface InventoryOperationResult {
  success: boolean;              // 操作成功フラグ
  message: string;               // 結果メッセージ
  affectedSlots: number[];       // 影響を受けたスロット番号
  newQuantity?: number;          // 新しい数量（オプション）
}
```

### ItemUseResult（アイテム使用結果）

```typescript
interface ItemUseResult {
  success: boolean;              // 使用成功フラグ
  effectsApplied: ItemEffect[];  // 適用された効果
  itemConsumed: boolean;         // アイテム消費フラグ
  remainingQuantity: number;     // 残り数量
  message: string;               // 結果メッセージ
}
```

### EquipmentOperationResult（装備操作結果）

```typescript
interface EquipmentOperationResult {
  success: boolean;              // 操作成功フラグ
  message: string;               // 結果メッセージ
  previousEquipment: Equipment | null; // 以前の装備
  newEquipment: Equipment | null;      // 新しい装備
  statsChanged: EquipmentStats;        // 変更された能力値
}
```

### EquipmentCheckResult（装備条件チェック結果）

```typescript
interface EquipmentCheckResult {
  canEquip: boolean;             // 装備可能フラグ
  failureReasons: string[];      // 失敗理由
  missingRequirements: {         // 不足している条件
    level?: number;
    job?: string;
    stats?: Partial<EquipmentStats>;
  };
}
```

---

## エラーコード

### InventoryManager エラーコード

| コード | 説明 | 対処方法 |
|--------|------|----------|
| `ADD_ITEM_FAILED` | アイテム追加失敗 | インベントリの空き容量を確認 |
| `REMOVE_ITEM_FAILED` | アイテム削除失敗 | アイテムの存在を確認 |
| `USE_ITEM_FAILED` | アイテム使用失敗 | アイテムタイプと対象を確認 |
| `SORT_ITEMS_FAILED` | ソート失敗 | ソートタイプを確認 |
| `SERIALIZE_FAILED` | シリアライズ失敗 | データ構造を確認 |
| `DESERIALIZE_FAILED` | デシリアライズ失敗 | セーブデータの整合性を確認 |
| `STORAGE_FULL` | ストレージ容量不足 | 古いセーブデータを削除 |
| `SAVE_FAILED` | 保存失敗 | LocalStorageの利用可能性を確認 |
| `LOAD_FAILED` | 読み込み失敗 | セーブデータの存在を確認 |

### EquipmentManager エラーコード

| コード | 説明 | 対処方法 |
|--------|------|----------|
| `EQUIP_ITEM_FAILED` | 装備装着失敗 | 装備条件とインベントリ空き容量を確認 |
| `UNEQUIP_ITEM_FAILED` | 装備解除失敗 | 装備の存在を確認 |

### ItemEffectSystem エラーコード

| コード | 説明 | 対処方法 |
|--------|------|----------|
| `APPLY_EFFECT_FAILED` | 効果適用失敗 | 効果データの妥当性を確認 |

---

## 使用例

### 基本的なワークフロー

```typescript
// 1. システムの初期化
const itemDataLoader = new ItemDataLoader(scene);
await itemDataLoader.loadItemData('data/items.json');

const inventoryManager = new InventoryManager(itemDataLoader);
const itemEffectSystem = new ItemEffectSystem();
const equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);

inventoryManager.setItemEffectSystem(itemEffectSystem);

// 2. アイテムの追加
const potionDef = itemDataLoader.getItemDefinition('potion_hp_small');
if (potionDef) {
  inventoryManager.addItem(potionDef.baseItem, 10);
}

// 3. アイテムの使用
const useResult = inventoryManager.useItem('potion_hp_small', 'character_001');
console.log(`HP recovered: ${useResult.effectsApplied[0]?.value}`);

// 4. 装備の装着
const swordDef = itemDataLoader.getItemDefinition('sword_iron');
if (swordDef?.equipmentData) {
  const character = getCharacter('character_001');
  const equipResult = equipmentManager.equipItem(
    'character_001',
    swordDef.equipmentData,
    EquipmentSlotType.WEAPON,
    character
  );
  
  if (equipResult.success) {
    console.log(`Attack increased by: ${equipResult.statsChanged.attack}`);
  }
}

// 5. セーブ
inventoryManager.saveToLocalStorage('save_slot_1_inventory');
equipmentManager.saveToLocalStorage('save_slot_1_equipment');

// 6. ロード
inventoryManager.loadFromLocalStorage('save_slot_1_inventory');
equipmentManager.loadFromLocalStorage('save_slot_1_equipment', itemDataLoader);
```

---

## パフォーマンス考慮事項

### 推奨事項

1. **アイテムアイコンの遅延読み込み**: 大量のアイテムがある場合、表示されるアイコンのみを読み込む
2. **能力値計算のキャッシュ**: 装備変更時の能力値計算結果をキャッシュして再利用
3. **UI要素の再利用**: オブジェクトプールを使用してUI要素を再利用
4. **バッチ処理**: 複数のアイテム操作を一度に実行する場合はバッチ処理を検討

### パフォーマンス指標

- インベントリ画面表示: 500ms以内
- アイテム使用・装備操作: 100ms以内
- 装備変更時の能力値再計算: 50ms以内
- メモリ使用量: 50MB以下

---

## バージョン履歴

### v1.0.0 (2024-01-10)
- 初回リリース
- 基本的なインベントリ・装備システムの実装
- LocalStorageへのセーブ・ロード機能
- 戦闘システム連携

---

## 関連ドキュメント

- [README](./README.md) - システム概要と使用方法
- [要件定義書](./requirements.md) - 詳細な要件
- [設計書](./design.md) - アーキテクチャと設計
- [実装計画](./tasks.md) - タスクと進捗状況
