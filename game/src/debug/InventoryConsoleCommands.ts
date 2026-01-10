/**
 * InventoryConsoleCommands - インベントリシステム専用コンソールコマンド
 * 
 * インベントリシステムのテスト・デバッグ用のコンソールコマンドを提供：
 * - アイテム追加コマンド
 * - アイテム削除コマンド
 * - インベントリクリアコマンド
 * - インベントリ状態表示コマンド
 * - アイテム情報表示コマンド
 */

import { InventoryManager } from '../systems/InventoryManager';
import { Item, ItemType, ItemRarity } from '../types/inventory';

/**
 * コンソールコマンド定義
 */
export interface InventoryConsoleCommand {
    /** コマンド名 */
    name: string;
    /** 説明 */
    description: string;
    /** パラメータ */
    parameters: string[];
    /** 使用例 */
    usage: string;
    /** ハンドラー関数 */
    handler: (...args: any[]) => void | Promise<void>;
}

/**
 * インベントリコンソールコマンド管理クラス
 */
export class InventoryConsoleCommands {
    private inventoryManager: InventoryManager;
    private commands: Map<string, InventoryConsoleCommand> = new Map();

    /**
     * コンストラクタ
     * @param inventoryManager インベントリマネージャー
     */
    constructor(inventoryManager: InventoryManager) {
        this.inventoryManager = inventoryManager;
        this.initializeCommands();
    }

    /**
     * コマンドを初期化
     */
    private initializeCommands(): void {
        // ヘルプコマンド
        this.addCommand({
            name: 'help',
            description: 'インベントリコマンドのヘルプを表示',
            parameters: ['[command]'],
            usage: 'inventory help [command]',
            handler: (commandName?: string) => this.showHelp(commandName)
        });

        // アイテム追加コマンド
        this.addCommand({
            name: 'add',
            description: 'インベントリにアイテムを追加',
            parameters: ['<itemId>', '[quantity]'],
            usage: 'inventory add potion 5',
            handler: (itemId: string, quantity?: string) => this.addItem(itemId, quantity)
        });

        // アイテム削除コマンド
        this.addCommand({
            name: 'remove',
            description: 'インベントリからアイテムを削除',
            parameters: ['<itemId>', '[quantity]'],
            usage: 'inventory remove potion 3',
            handler: (itemId: string, quantity?: string) => this.removeItem(itemId, quantity)
        });

        // インベントリクリアコマンド
        this.addCommand({
            name: 'clear',
            description: 'インベントリを空にする',
            parameters: [],
            usage: 'inventory clear',
            handler: () => this.clearInventory()
        });

        // インベントリ一覧表示コマンド
        this.addCommand({
            name: 'list',
            description: 'インベントリ内のアイテム一覧を表示',
            parameters: ['[filter]'],
            usage: 'inventory list weapon',
            handler: (filter?: string) => this.listItems(filter)
        });

        // アイテム情報表示コマンド
        this.addCommand({
            name: 'info',
            description: 'アイテムの詳細情報を表示',
            parameters: ['<itemId>'],
            usage: 'inventory info potion',
            handler: (itemId: string) => this.showItemInfo(itemId)
        });

        // インベントリ状態表示コマンド
        this.addCommand({
            name: 'status',
            description: 'インベントリの状態を表示',
            parameters: [],
            usage: 'inventory status',
            handler: () => this.showInventoryStatus()
        });

        // アイテムソートコマンド
        this.addCommand({
            name: 'sort',
            description: 'インベントリをソート',
            parameters: ['<type>'],
            usage: 'inventory sort type',
            handler: (sortType: string) => this.sortInventory(sortType)
        });

        // テストアイテム作成コマンド
        this.addCommand({
            name: 'create',
            description: 'テスト用アイテムを作成して追加',
            parameters: ['<itemId>', '<type>', '[quantity]'],
            usage: 'inventory create test-sword weapon 1',
            handler: (itemId: string, type: string, quantity?: string) =>
                this.createTestItem(itemId, type, quantity)
        });

        // インベントリ満杯テストコマンド
        this.addCommand({
            name: 'fill',
            description: 'インベントリを満杯にする（テスト用）',
            parameters: [],
            usage: 'inventory fill',
            handler: () => this.fillInventory()
        });

        // アイテム数取得コマンド
        this.addCommand({
            name: 'count',
            description: '特定アイテムの所持数を表示',
            parameters: ['<itemId>'],
            usage: 'inventory count potion',
            handler: (itemId: string) => this.getItemCount(itemId)
        });
    }

    /**
     * コマンドを追加
     * @param command コマンド定義
     */
    private addCommand(command: InventoryConsoleCommand): void {
        this.commands.set(command.name.toLowerCase(), command);
    }

    /**
     * コマンドを実行
     * @param commandLine コマンドライン
     */
    async executeCommand(commandLine: string): Promise<void> {
        const parts = commandLine.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        const command = this.commands.get(commandName);
        if (!command) {
            console.warn(
                `不明なインベントリコマンド: ${commandName}. 'inventory help' で利用可能なコマンドを確認してください。`
            );
            return;
        }

        try {
            await command.handler(...args);
        } catch (error) {
            console.error(`インベントリコマンド '${commandName}' の実行エラー:`, error.message);
        }
    }

    /**
     * ヘルプを表示
     * @param commandName 特定のコマンド名（省略時は全コマンド）
     */
    private showHelp(commandName?: string): void {
        if (commandName) {
            const command = this.commands.get(commandName.toLowerCase());
            if (command) {
                console.log(`コマンド: ${command.name}`);
                console.log(`説明: ${command.description}`);
                console.log(`パラメータ: ${command.parameters.join(' ')}`);
                console.log(`使用例: ${command.usage}`);
            } else {
                console.log(`コマンド '${commandName}' が見つかりません。`);
            }
        } else {
            console.log('利用可能なインベントリコマンド:');
            this.commands.forEach(command => {
                console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
            });
            console.log('\n"inventory help <command>" で特定のコマンドの詳細情報を表示します。');
        }
    }

    /**
     * アイテム追加
     * @param itemId アイテムID
     * @param quantity 数量
     */
    private addItem(itemId: string, quantity?: string): void {
        if (!itemId) {
            console.log('使用方法: inventory add <itemId> [quantity]');
            return;
        }

        const qty = quantity ? parseInt(quantity) : 1;
        if (isNaN(qty) || qty <= 0) {
            console.log('数量は正の整数である必要があります。');
            return;
        }

        console.log(`アイテムを追加中: ${itemId} x${qty}`);

        try {
            // アイテムデータを取得（実際の実装ではItemDataLoaderを使用）
            const item = this.getOrCreateTestItem(itemId);
            const success = this.inventoryManager.addItem(item, qty);

            if (success) {
                console.log(`✓ アイテムを追加しました: ${item.name} x${qty}`);
                this.showInventoryStatus();
            } else {
                console.log(`✗ アイテムの追加に失敗しました（インベントリが満杯の可能性があります）`);
            }
        } catch (error) {
            console.error('アイテム追加エラー:', error.message);
        }
    }

    /**
     * アイテム削除
     * @param itemId アイテムID
     * @param quantity 数量
     */
    private removeItem(itemId: string, quantity?: string): void {
        if (!itemId) {
            console.log('使用方法: inventory remove <itemId> [quantity]');
            return;
        }

        const qty = quantity ? parseInt(quantity) : 1;
        if (isNaN(qty) || qty <= 0) {
            console.log('数量は正の整数である必要があります。');
            return;
        }

        console.log(`アイテムを削除中: ${itemId} x${qty}`);

        try {
            const success = this.inventoryManager.removeItem(itemId, qty);

            if (success) {
                console.log(`✓ アイテムを削除しました: ${itemId} x${qty}`);
                this.showInventoryStatus();
            } else {
                console.log(`✗ アイテムの削除に失敗しました（アイテムが存在しないか、数量が不足しています）`);
            }
        } catch (error) {
            console.error('アイテム削除エラー:', error.message);
        }
    }

    /**
     * インベントリクリア
     */
    private clearInventory(): void {
        console.log('インベントリをクリア中...');

        try {
            this.inventoryManager.clear();
            console.log('✓ インベントリをクリアしました');
            this.showInventoryStatus();
        } catch (error) {
            console.error('インベントリクリアエラー:', error.message);
        }
    }

    /**
     * アイテム一覧表示
     * @param filter フィルター（アイテム種別）
     */
    private listItems(filter?: string): void {
        console.log('=== インベントリ内のアイテム ===');

        try {
            const allItems = this.inventoryManager.getAllItems();

            if (allItems.length === 0) {
                console.log('インベントリは空です。');
                return;
            }

            let filteredItems = allItems.filter(slot => !slot.isEmpty);

            if (filter) {
                filteredItems = filteredItems.filter(slot =>
                    slot.item?.type.toLowerCase().includes(filter.toLowerCase())
                );
            }

            if (filteredItems.length === 0) {
                console.log('条件に一致するアイテムが見つかりません。');
                return;
            }

            filteredItems.forEach(slot => {
                if (slot.item) {
                    const raritySymbol = this.getRaritySymbol(slot.item.rarity);
                    console.log(
                        `  [${slot.slotIndex}] ${raritySymbol} ${slot.item.name} (${slot.item.type}) x${slot.quantity}`
                    );
                }
            });

            console.log(`\n合計: ${filteredItems.length} 種類のアイテム`);
        } catch (error) {
            console.error('アイテム一覧表示エラー:', error.message);
        }
    }

    /**
     * アイテム情報表示
     * @param itemId アイテムID
     */
    private showItemInfo(itemId: string): void {
        if (!itemId) {
            console.log('使用方法: inventory info <itemId>');
            return;
        }

        console.log(`=== アイテム情報: ${itemId} ===`);

        try {
            const item = this.inventoryManager.getItem(itemId);

            if (!item) {
                console.log(`アイテム '${itemId}' はインベントリに存在しません。`);
                return;
            }

            const count = this.inventoryManager.getItemCount(itemId);

            console.log(`名前: ${item.name}`);
            console.log(`ID: ${item.id}`);
            console.log(`種類: ${item.type}`);
            console.log(`レアリティ: ${item.rarity}`);
            console.log(`説明: ${item.description}`);
            console.log(`所持数: ${count}`);
            console.log(`最大スタック: ${item.maxStack}`);
            console.log(`売却価格: ${item.sellPrice}`);
            console.log(`購入価格: ${item.buyPrice}`);
            console.log(`アイコンパス: ${item.iconPath}`);
        } catch (error) {
            console.error('アイテム情報表示エラー:', error.message);
        }
    }

    /**
     * インベントリ状態表示
     */
    private showInventoryStatus(): void {
        console.log('=== インベントリ状態 ===');

        try {
            const allItems = this.inventoryManager.getAllItems();
            const usedSlots = allItems.filter(slot => !slot.isEmpty).length;
            const maxSlots = 100; // 要件より
            const availableSlots = this.inventoryManager.getAvailableSlots();
            const isFull = this.inventoryManager.isFull();

            console.log(`使用中スロット: ${usedSlots} / ${maxSlots}`);
            console.log(`空きスロット: ${availableSlots}`);
            console.log(`満杯状態: ${isFull ? 'はい' : 'いいえ'}`);

            // アイテム種別ごとの集計
            const typeCount = new Map<string, number>();
            allItems.forEach(slot => {
                if (!slot.isEmpty && slot.item) {
                    const count = typeCount.get(slot.item.type) || 0;
                    typeCount.set(slot.item.type, count + 1);
                }
            });

            if (typeCount.size > 0) {
                console.log('\nアイテム種別ごとの数:');
                typeCount.forEach((count, type) => {
                    console.log(`  ${type}: ${count} 種類`);
                });
            }
        } catch (error) {
            console.error('インベントリ状態表示エラー:', error.message);
        }
    }

    /**
     * インベントリソート
     * @param sortType ソート種別
     */
    private sortInventory(sortType: string): void {
        if (!sortType) {
            console.log('使用方法: inventory sort <type>');
            console.log('利用可能なソート種別: type, rarity, name');
            return;
        }

        console.log(`インベントリをソート中: ${sortType}`);

        try {
            this.inventoryManager.sortItems(sortType as any);
            console.log('✓ インベントリをソートしました');
            this.listItems();
        } catch (error) {
            console.error('インベントリソートエラー:', error.message);
        }
    }

    /**
     * テストアイテム作成
     * @param itemId アイテムID
     * @param type アイテム種別
     * @param quantity 数量
     */
    private createTestItem(itemId: string, type: string, quantity?: string): void {
        if (!itemId || !type) {
            console.log('使用方法: inventory create <itemId> <type> [quantity]');
            console.log('利用可能な種別: weapon, armor, accessory, consumable, material, key');
            return;
        }

        const qty = quantity ? parseInt(quantity) : 1;

        console.log(`テストアイテムを作成中: ${itemId} (${type}) x${qty}`);

        try {
            const testItem: Item = {
                id: itemId,
                name: `Test ${itemId}`,
                description: `コンソールで作成されたテストアイテム`,
                type: type as ItemType,
                rarity: 'common',
                iconPath: 'assets/items/default.png',
                maxStack: type === 'consumable' ? 99 : 1,
                sellPrice: 10,
                buyPrice: 20
            };

            const success = this.inventoryManager.addItem(testItem, qty);

            if (success) {
                console.log(`✓ テストアイテムを作成・追加しました: ${testItem.name} x${qty}`);
                this.showInventoryStatus();
            } else {
                console.log(`✗ テストアイテムの追加に失敗しました`);
            }
        } catch (error) {
            console.error('テストアイテム作成エラー:', error.message);
        }
    }

    /**
     * インベントリ満杯テスト
     */
    private fillInventory(): void {
        console.log('インベントリを満杯にしています（テスト用）...');

        try {
            let added = 0;
            for (let i = 0; i < 100; i++) {
                const testItem: Item = {
                    id: `test-item-${i}`,
                    name: `Test Item ${i}`,
                    description: 'テスト用アイテム',
                    type: 'material',
                    rarity: 'common',
                    iconPath: 'assets/items/default.png',
                    maxStack: 1,
                    sellPrice: 1,
                    buyPrice: 2
                };

                if (this.inventoryManager.addItem(testItem, 1)) {
                    added++;
                } else {
                    break;
                }
            }

            console.log(`✓ ${added} 個のアイテムを追加しました`);
            this.showInventoryStatus();
        } catch (error) {
            console.error('インベントリ満杯テストエラー:', error.message);
        }
    }

    /**
     * アイテム数取得
     * @param itemId アイテムID
     */
    private getItemCount(itemId: string): void {
        if (!itemId) {
            console.log('使用方法: inventory count <itemId>');
            return;
        }

        try {
            const count = this.inventoryManager.getItemCount(itemId);
            console.log(`アイテム '${itemId}' の所持数: ${count}`);
        } catch (error) {
            console.error('アイテム数取得エラー:', error.message);
        }
    }

    /**
     * テストアイテムを取得または作成
     * @param itemId アイテムID
     * @returns アイテム
     */
    private getOrCreateTestItem(itemId: string): Item {
        // 既存のアイテムを取得
        const existingItem = this.inventoryManager.getItem(itemId);
        if (existingItem) {
            return existingItem;
        }

        // テストアイテムを作成
        return {
            id: itemId,
            name: itemId,
            description: 'デバッグコマンドで追加されたアイテム',
            type: 'material',
            rarity: 'common',
            iconPath: 'assets/items/default.png',
            maxStack: 99,
            sellPrice: 10,
            buyPrice: 20
        };
    }

    /**
     * レアリティシンボルを取得
     * @param rarity レアリティ
     * @returns シンボル
     */
    private getRaritySymbol(rarity: ItemRarity): string {
        const symbols: Record<ItemRarity, string> = {
            common: '○',
            uncommon: '◎',
            rare: '★',
            epic: '☆',
            legendary: '◆'
        };
        return symbols[rarity] || '○';
    }

    /**
     * 利用可能なコマンド一覧を取得
     * @returns コマンド一覧
     */
    getAvailableCommands(): string[] {
        return Array.from(this.commands.keys());
    }

    /**
     * 特定のコマンドを取得
     * @param commandName コマンド名
     * @returns コマンド定義
     */
    getCommand(commandName: string): InventoryConsoleCommand | undefined {
        return this.commands.get(commandName.toLowerCase());
    }
}
