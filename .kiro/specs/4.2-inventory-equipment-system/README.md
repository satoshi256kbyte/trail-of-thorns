# インベントリ・装備システム

## 概要

このシステムは、ゲーム内のアイテム管理と装備システムを提供します。プレイヤーは最大100個のアイテムを保管でき、キャラクターに装備を装着して能力値を強化できます。

## 主要機能

### インベントリ管理

- **容量**: 最大100個のアイテムを保管
- **アイテム種類**: 武器、防具、アクセサリ、消耗品、素材
- **スタック機能**: 同じアイテムを最大99個までスタック可能
- **ソート機能**: 種類、レアリティ、名前、数量でソート
- **アイテム使用**: 消耗品の使用と効果適用

### 装備システム

- **装備スロット**: 武器、防具、アクセサリ1、アクセサリ2の4スロット
- **装備条件**: レベル、職業、能力値による装備制限
- **装備効果**: HP、MP、攻撃力、防御力、速度、命中率、回避率の強化
- **装備耐久度**: 戦闘中に耐久度が減少し、0になると破損

### UI機能

- **グリッド表示**: 10x10のグリッド形式でアイテムを表示
- **詳細情報**: アイテムの詳細情報をパネルに表示
- **アクションメニュー**: 使用、装備、破棄のアクション
- **ドラッグ&ドロップ**: アイテムの並び替え
- **キーボード操作**: 矢印キー、Enter、Escapeキーでの操作

### データ永続化

- **セーブ機能**: LocalStorageへのインベントリ・装備データの保存
- **ロード機能**: 保存されたデータの読み込みと復元
- **データ整合性**: シリアライズ・デシリアライズ時のデータ検証

## システム構成

### コアコンポーネント

- **InventoryManager**: インベントリの管理を担当
- **EquipmentManager**: 装備の管理を担当
- **ItemEffectSystem**: アイテム効果の適用を担当
- **ItemDataLoader**: アイテムデータの読み込みを担当
- **ItemValidator**: アイテムデータの検証を担当

### UIコンポーネント

- **InventoryUI**: インベントリ画面の表示と操作
- **EquipmentUI**: 装備画面の表示と操作

### データ構造

- **Item**: アイテムの基本情報
- **Equipment**: 装備品の情報
- **Consumable**: 消耗品の情報
- **InventorySlot**: インベントリスロットの情報
- **EquipmentSet**: 装備セットの情報

## 使用方法

### インベントリの初期化

```typescript
import { InventoryManager } from './systems/InventoryManager';
import { ItemDataLoader } from './systems/ItemDataLoader';

const itemDataLoader = new ItemDataLoader();
const inventoryManager = new InventoryManager(itemDataLoader, 100);
```

### アイテムの追加

```typescript
const item = {
  id: 'potion-001',
  name: 'ポーション',
  description: 'HPを50回復する',
  type: ItemType.CONSUMABLE,
  rarity: ItemRarity.COMMON,
  iconPath: 'assets/items/potion.png',
  maxStack: 99,
  sellPrice: 50,
  buyPrice: 100,
};

const result = inventoryManager.addItem(item, 5);
if (result.success) {
  console.log('アイテムを追加しました');
}
```

### アイテムの使用

```typescript
const result = inventoryManager.useItem('potion-001', 'character-001');
if (result.success) {
  console.log('アイテムを使用しました');
}
```

### 装備の装着

```typescript
import { EquipmentManager } from './systems/EquipmentManager';
import { ItemEffectSystem } from './systems/ItemEffectSystem';

const itemEffectSystem = new ItemEffectSystem();
const equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);

const equipment = {
  id: 'sword-001',
  name: '鉄の剣',
  description: '攻撃力+10',
  type: ItemType.WEAPON,
  rarity: ItemRarity.COMMON,
  iconPath: 'assets/items/sword.png',
  maxStack: 1,
  sellPrice: 100,
  buyPrice: 200,
  slot: EquipmentSlotType.WEAPON,
  stats: { attack: 10 },
  requirements: { level: 5 },
  durability: 100,
  maxDurability: 100,
  effects: [],
};

const result = equipmentManager.equipItem(
  'character-001',
  equipment,
  EquipmentSlotType.WEAPON,
  character
);

if (result.success) {
  console.log('装備を装着しました');
}
```

### UIの表示

```typescript
import { InventoryUI } from './ui/InventoryUI';

const inventoryUI = new InventoryUI(scene, inventoryManager);
inventoryUI.show();
```

### データの保存・読み込み

```typescript
// 保存
inventoryManager.saveToLocalStorage('inventory_data');
equipmentManager.saveToLocalStorage('equipment_data');

// 読み込み
inventoryManager.loadFromLocalStorage('inventory_data');
equipmentManager.loadFromLocalStorage('equipment_data', itemDataLoader);
```

## デバッグ機能

### コンソールコマンド

開発モードでは、以下のコンソールコマンドが使用できます:

```javascript
// インベントリにアイテムを追加
window.inventoryDebug.addItem('item-id', 10);

// インベントリからアイテムを削除
window.inventoryDebug.removeItem('item-id', 5);

// インベントリをクリア
window.inventoryDebug.clearInventory();

// 装備を強制装着
window.inventoryDebug.forceEquip('character-id', 'equipment-id', 'weapon');

// 装備を解除
window.inventoryDebug.unequip('character-id', 'weapon');

// デバッグUIを表示
window.inventoryDebug.showDebugUI();
```

### キーボードショートカット

- **F7**: デバッグモードの切り替え
- **F8**: デバッグUIの表示/非表示

## テスト

### ユニットテスト

```bash
npm test -- tests/game/systems/InventoryManager.test.ts
npm test -- tests/game/systems/EquipmentManager.test.ts
npm test -- tests/game/systems/ItemEffectSystem.test.ts
```

### プロパティベーステスト

```bash
npm test -- tests/game/systems/InventoryManager.property.test.ts
npm test -- tests/game/systems/EquipmentManager.property.test.ts
```

### 統合テスト

```bash
npm test -- tests/integration/InventoryEquipmentGameplayIntegration.test.ts
```

### E2Eテスト

```bash
npm test -- tests/e2e/InventoryEquipmentSystemE2E.test.ts
```

## パフォーマンス

### 最適化機能

- **仮想スクロール**: 大量のアイテムを効率的に表示
- **能力値計算キャッシュ**: 装備効果の計算結果をキャッシュ
- **オブジェクトプール**: UIオブジェクトの再利用

### パフォーマンス指標

- **インベントリ表示速度**: 100ms以内
- **アイテム追加速度**: 10ms以内
- **装備装着速度**: 50ms以内
- **能力値再計算速度**: 50ms以内
- **メモリ使用量**: 50MB以下

## トラブルシューティング

### よくある問題

#### アイテムが追加できない

- インベントリが満杯でないか確認
- アイテムデータが正しいか確認
- maxStackの設定を確認

#### 装備が装着できない

- 装備条件（レベル、職業、能力値）を満たしているか確認
- インベントリに装備が存在するか確認
- 装備スロットが正しいか確認

#### セーブ・ロードが失敗する

- LocalStorageが利用可能か確認
- ストレージ容量が十分か確認
- データ形式が正しいか確認

### エラーログ

エラーが発生した場合、コンソールに詳細なログが出力されます:

```
[InventoryError][ERROR][2026-01-10T12:00:00.000Z] ADD_ITEM_FAILED: Failed to add item
```

## 今後の拡張

### 計画中の機能

- アイテムの合成・強化システム
- 装備のエンチャントシステム
- アイテムの売買システム
- 倉庫システム

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
