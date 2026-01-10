# インベントリ・装備システム API仕様書

## 概要

このドキュメントは、インベントリ・装備システムの各コンポーネントのAPI仕様を定義します。

## 目次

- [データ型](#データ型)
- [InventoryManager](#inventorymanager)
- [EquipmentManager](#equipmentmanager)
- [ItemEffectSystem](#itemeffectsystem)
- [ItemDataLoader](#itemdataloader)
- [ItemValidator](#itemvalidator)
- [InventoryUI](#inventoryui)
- [EquipmentUI](#equipmentui)

---

## データ型

### ItemType

アイテムの種類を表す列挙型

```typescript
enum ItemType {
  WEAPON = 'weapon',        // 武器
  ARMOR = 'armor',          // 防具
  ACCESSORY = 'accessory',  // アクセサリ
  CONSUMABLE = 'consumable', // 消耗品
  MATERIAL = 'material',    // 素材
}
```

### ItemRarity

アイテムのレアリティを表す列挙型

```typescript
enum ItemRarity {
  COMMON = 'common',       // コモン
  UNCOMMON = 'uncommon',   // アンコモン
  RARE = 'rare',           // レア
  EPIC = 'epic',           // エピック
  LEGENDARY = 'legendary', // レジェンダリー
}
```

### EquipmentSlotType

装備スロットの種類を表す列挙型

```typescript
enum EquipmentSlotType {
  WEAPON = 'weapon',         // 武器
  ARMOR = 'armor',           // 防具
  ACCESSORY1 = 'accessory1', // アクセサリ1
  ACCESSORY2 = 'accessory2', // アクセサリ2
}
```

### Item

アイテムの基本情報を表すインターフェース

```typescript
interface Item {
  id: string;              // アイテムID
  name: string;            // アイテム名
  description: string;     // 説明
  type: ItemType;          // アイテム種類
  rarity: ItemRarity;      // レアリティ
  iconPath: string;        // アイコン画像パス
  maxStack: number;        // 最大スタック数
  sellPrice: number;       // 売却価格
  buyPrice: number;        // 購入価格
}
```

### Equipment

装備品の情報を表すインターフェース

```typescript
interface Equipment extends Item {
  slot: EquipmentSlotType;           // 装備スロット
  stats: Partial<CharacterStats>;    // 能力値ボーナス
  requirements?: EquipmentRequirements; // 装備条件
  durability: number;                // 現在の耐久度
  maxDurability: number;             // 最大耐久度
  effects: ItemEffect[];             // 装備効果
}
```

### Consumable

消耗品の情報を表すインターフェース

```typescript
interface Consumable extends Item {
  effects: ItemEffect[];  // アイテム効果
  usableInBattle: boolean; // 戦闘中使用可能か
}
```

### InventorySlot

インベントリスロットの情報を表すインターフェース

```typescript
interface InventorySlot {
  item: Item | null;  // アイテム（nullの場合は空スロット）
  quantity: number;   // 数量
}
```

### EquipmentSet

装備セットの情報を表すインターフェース

```typescript
interface EquipmentSet {
  weapon: Equipment | null;      // 武器
  armor: Equipment | null;       // 防具
  accessory1: Equipment | null;  // アクセサリ1
  accessory2: Equipment | null;  // アクセサリ2
}
```

---

## InventoryManager

インベントリの管理を担当するクラス

### コンストラクタ

```typescript
constructor(
  itemDataLoader: ItemDataLoader,
  maxCapacity: number = 100
)
```

**パラメータ**:
- `itemDataLoader`: アイテムデータローダー
- `maxCapacity`: 最大容量（デフォルト: 100）

### メソッド

#### addItem

アイテムをインベントリに追加

```typescript
addItem(
  item: Item,
  quantity: number = 1
): OperationResult
```

**パラメータ**:
- `item`: 追加するアイテム
- `quantity`: 追加する数量（デフォルト: 1）

**戻り値**: `OperationResult`
- `success`: 成功したかどうか
- `message`: 結果メッセージ
- `data`: 追加されたアイテム情報

**例**:
```typescript
const result = inventoryManager.addItem(potion, 5);
if (result.success) {
  console.log('アイテムを追加しました');
}
```

#### removeItem

アイテムをインベントリから削除

```typescript
removeItem(
  itemId: string,
  quantity: number = 1
): OperationResult
```

**パラメータ**:
- `itemId`: 削除するアイテムのID
- `quantity`: 削除する数量（デフォルト: 1）

**戻り値**: `OperationResult`

#### getItem

アイテムを取得

```typescript
getItem(itemId: string): Item | null
```

**パラメータ**:
- `itemId`: 取得するアイテムのID

**戻り値**: アイテム（存在しない場合はnull）

#### getItemQuantity

アイテムの所持数を取得

```typescript
getItemQuantity(itemId: string): number
```

**パラメータ**:
- `itemId`: アイテムのID

**戻り値**: 所持数

#### hasItem

アイテムを所持しているか確認

```typescript
hasItem(
  itemId: string,
  quantity: number = 1
): boolean
```

**パラメータ**:
- `itemId`: アイテムのID
- `quantity`: 必要な数量（デフォルト: 1）

**戻り値**: 所持している場合はtrue

#### getAllItems

全てのアイテムを取得

```typescript
getAllItems(): InventorySlot[]
```

**戻り値**: インベントリスロットの配列

#### sortItems

アイテムをソート

```typescript
sortItems(
  sortType: 'type' | 'rarity' | 'name' | 'quantity'
): void
```

**パラメータ**:
- `sortType`: ソート種類
  - `'type'`: 種類別
  - `'rarity'`: レアリティ別
  - `'name'`: 名前順
  - `'quantity'`: 数量順

#### useItem

アイテムを使用

```typescript
useItem(
  itemId: string,
  targetId: string
): OperationResult
```

**パラメータ**:
- `itemId`: 使用するアイテムのID
- `targetId`: 対象キャラクターのID

**戻り値**: `OperationResult`

#### isFull

インベントリが満杯か確認

```typescript
isFull(): boolean
```

**戻り値**: 満杯の場合はtrue

#### getEmptySlotCount

空きスロット数を取得

```typescript
getEmptySlotCount(): number
```

**戻り値**: 空きスロット数

#### saveToLocalStorage

LocalStorageに保存

```typescript
saveToLocalStorage(key: string): void
```

**パラメータ**:
- `key`: 保存キー

#### loadFromLocalStorage

LocalStorageから読み込み

```typescript
loadFromLocalStorage(key: string): void
```

**パラメータ**:
- `key`: 読み込みキー

---

## EquipmentManager

装備の管理を担当するクラス

### コンストラクタ

```typescript
constructor(
  itemEffectSystem: ItemEffectSystem,
  inventoryManager: InventoryManager
)
```

**パラメータ**:
- `itemEffectSystem`: アイテム効果システム
- `inventoryManager`: インベントリマネージャー

### メソッド

#### equipItem

装備を装着

```typescript
equipItem(
  characterId: string,
  equipment: Equipment,
  slot: EquipmentSlotType,
  character: Character
): OperationResult
```

**パラメータ**:
- `characterId`: キャラクターID
- `equipment`: 装備するアイテム
- `slot`: 装備スロット
- `character`: キャラクター情報

**戻り値**: `OperationResult`

**例**:
```typescript
const result = equipmentManager.equipItem(
  'char-001',
  sword,
  EquipmentSlotType.WEAPON,
  character
);
```

#### unequipItem

装備を解除

```typescript
unequipItem(
  characterId: string,
  slot: EquipmentSlotType
): OperationResult
```

**パラメータ**:
- `characterId`: キャラクターID
- `slot`: 装備スロット

**戻り値**: `OperationResult`

#### getEquipment

装備を取得

```typescript
getEquipment(
  characterId: string,
  slot: EquipmentSlotType
): Equipment | null
```

**パラメータ**:
- `characterId`: キャラクターID
- `slot`: 装備スロット

**戻り値**: 装備（装着していない場合はnull）

#### getEquipmentSet

装備セットを取得

```typescript
getEquipmentSet(characterId: string): EquipmentSet
```

**パラメータ**:
- `characterId`: キャラクターID

**戻り値**: 装備セット

#### canEquip

装備可能か確認

```typescript
canEquip(
  equipment: Equipment,
  character: Character
): boolean
```

**パラメータ**:
- `equipment`: 装備
- `character`: キャラクター情報

**戻り値**: 装備可能な場合はtrue

#### getTotalStats

装備による能力値ボーナスを取得

```typescript
getTotalStats(characterId: string): Partial<CharacterStats>
```

**パラメータ**:
- `characterId`: キャラクターID

**戻り値**: 能力値ボーナス

#### decreaseDurability

耐久度を減少

```typescript
decreaseDurability(
  characterId: string,
  slot: EquipmentSlotType,
  amount: number = 1
): void
```

**パラメータ**:
- `characterId`: キャラクターID
- `slot`: 装備スロット
- `amount`: 減少量（デフォルト: 1）

#### saveToLocalStorage

LocalStorageに保存

```typescript
saveToLocalStorage(key: string): void
```

**パラメータ**:
- `key`: 保存キー

#### loadFromLocalStorage

LocalStorageから読み込み

```typescript
loadFromLocalStorage(
  key: string,
  itemDataLoader: ItemDataLoader
): void
```

**パラメータ**:
- `key`: 読み込みキー
- `itemDataLoader`: アイテムデータローダー

---

## ItemEffectSystem

アイテム効果の適用を担当するクラス

### メソッド

#### applyEffect

効果を適用

```typescript
applyEffect(
  effect: ItemEffect,
  target: Character
): OperationResult
```

**パラメータ**:
- `effect`: アイテム効果
- `target`: 対象キャラクター

**戻り値**: `OperationResult`

#### removeEffect

効果を除去

```typescript
removeEffect(
  effectId: string,
  target: Character
): void
```

**パラメータ**:
- `effectId`: 効果ID
- `target`: 対象キャラクター

#### getActiveEffects

アクティブな効果を取得

```typescript
getActiveEffects(characterId: string): ItemEffect[]
```

**パラメータ**:
- `characterId`: キャラクターID

**戻り値**: アクティブな効果の配列

#### updateEffects

効果を更新（ターン経過処理）

```typescript
updateEffects(characterId: string): void
```

**パラメータ**:
- `characterId`: キャラクターID

---

## ItemDataLoader

アイテムデータの読み込みを担当するクラス

### メソッド

#### loadItemData

アイテムデータを読み込み

```typescript
async loadItemData(scene: Phaser.Scene): Promise<void>
```

**パラメータ**:
- `scene`: Phaserシーン

#### getItemDefinition

アイテム定義を取得

```typescript
getItemDefinition(itemId: string): Item | null
```

**パラメータ**:
- `itemId`: アイテムID

**戻り値**: アイテム定義（存在しない場合はnull）

#### getAllItemDefinitions

全てのアイテム定義を取得

```typescript
getAllItemDefinitions(): Item[]
```

**戻り値**: アイテム定義の配列

---

## ItemValidator

アイテムデータの検証を担当するクラス

### メソッド

#### validateItem

アイテムデータを検証

```typescript
validateItem(item: any): ValidationResult
```

**パラメータ**:
- `item`: 検証するアイテムデータ

**戻り値**: `ValidationResult`
- `valid`: 有効な場合はtrue
- `errors`: エラーメッセージの配列

#### validateItemArray

アイテム配列を検証

```typescript
validateItemArray(items: any[]): ValidationResult
```

**パラメータ**:
- `items`: 検証するアイテム配列

**戻り値**: `ValidationResult`

---

## InventoryUI

インベントリ画面の表示と操作を担当するクラス

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  inventoryManager: InventoryManager
)
```

**パラメータ**:
- `scene`: Phaserシーン
- `inventoryManager`: インベントリマネージャー

### メソッド

#### show

インベントリ画面を表示

```typescript
show(): void
```

#### hide

インベントリ画面を非表示

```typescript
hide(): void
```

#### isVisible

表示中か確認

```typescript
isVisible(): boolean
```

**戻り値**: 表示中の場合はtrue

#### refresh

表示を更新

```typescript
refresh(): void
```

#### selectItem

アイテムを選択

```typescript
selectItem(itemId: string): void
```

**パラメータ**:
- `itemId`: アイテムID

#### getSelectedItemId

選択中のアイテムIDを取得

```typescript
getSelectedItemId(): string | null
```

**戻り値**: 選択中のアイテムID（選択していない場合はnull）

---

## EquipmentUI

装備画面の表示と操作を担当するクラス

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  equipmentManager: EquipmentManager,
  inventoryManager: InventoryManager
)
```

**パラメータ**:
- `scene`: Phaserシーン
- `equipmentManager`: 装備マネージャー
- `inventoryManager`: インベントリマネージャー

### メソッド

#### show

装備画面を表示

```typescript
show(characterId: string): void
```

**パラメータ**:
- `characterId`: キャラクターID

#### hide

装備画面を非表示

```typescript
hide(): void
```

#### isVisible

表示中か確認

```typescript
isVisible(): boolean
```

**戻り値**: 表示中の場合はtrue

#### refresh

表示を更新

```typescript
refresh(): void
```

#### selectSlot

装備スロットを選択

```typescript
selectSlot(slot: EquipmentSlotType): void
```

**パラメータ**:
- `slot`: 装備スロット

---

## エラーハンドリング

### OperationResult

操作結果を表すインターフェース

```typescript
interface OperationResult {
  success: boolean;      // 成功したかどうか
  message: string;       // 結果メッセージ
  data?: any;            // 追加データ（オプション）
}
```

### エラーコード

システムで使用されるエラーコード

| コード | 説明 |
|--------|------|
| `INVENTORY_FULL` | インベントリが満杯 |
| `ITEM_NOT_FOUND` | アイテムが見つからない |
| `INSUFFICIENT_QUANTITY` | 数量不足 |
| `INVALID_ITEM_DATA` | 不正なアイテムデータ |
| `EQUIPMENT_REQUIREMENTS_NOT_MET` | 装備条件を満たしていない |
| `INVALID_SLOT` | 不正な装備スロット |
| `DURABILITY_ZERO` | 耐久度が0 |
| `SAVE_FAILED` | 保存失敗 |
| `LOAD_FAILED` | 読み込み失敗 |

---

## イベント

システムが発行するイベント

### インベントリイベント

| イベント名 | データ | 説明 |
|-----------|--------|------|
| `inventory:item-added` | `{ item: Item, quantity: number }` | アイテムが追加された |
| `inventory:item-removed` | `{ itemId: string, quantity: number }` | アイテムが削除された |
| `inventory:item-used` | `{ itemId: string, targetId: string }` | アイテムが使用された |
| `inventory:sorted` | `{ sortType: string }` | アイテムがソートされた |

### 装備イベント

| イベント名 | データ | 説明 |
|-----------|--------|------|
| `equipment:equipped` | `{ characterId: string, equipment: Equipment, slot: EquipmentSlotType }` | 装備が装着された |
| `equipment:unequipped` | `{ characterId: string, slot: EquipmentSlotType }` | 装備が解除された |
| `equipment:durability-changed` | `{ characterId: string, slot: EquipmentSlotType, durability: number }` | 耐久度が変化した |
| `equipment:broken` | `{ characterId: string, slot: EquipmentSlotType }` | 装備が破損した |

---

## パフォーマンス考慮事項

### 最適化手法

1. **仮想スクロール**: 大量のアイテムを効率的に表示
2. **能力値計算キャッシュ**: 装備効果の計算結果をキャッシュ
3. **オブジェクトプール**: UIオブジェクトの再利用
4. **遅延読み込み**: アイテムアイコンの遅延読み込み

### パフォーマンス指標

| 指標 | 目標値 |
|------|--------|
| インベントリ表示速度 | 100ms以内 |
| アイテム追加速度 | 10ms以内 |
| 装備装着速度 | 50ms以内 |
| 能力値再計算速度 | 50ms以内 |
| メモリ使用量 | 50MB以下 |

---

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2026-01-10 | 初版リリース |

---

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
