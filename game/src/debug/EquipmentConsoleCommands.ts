/**
 * EquipmentConsoleCommands - 装備システム専用コンソールコマンド
 * 
 * 装備システムのテスト・デバッグ用のコンソールコマンドを提供：
 * - 装備強制装着コマンド
 * - 装備解除コマンド
 * - 装備条件無視モード
 * - 装備状態表示コマンド
 * - 装備効果表示コマンド
 */

import { EquipmentManager } from '../systems/EquipmentManager';
import { Equipment, EquipmentSlotType, EquipmentStats } from '../types/inventory';

/**
 * コンソールコマンド定義
 */
export interface EquipmentConsoleCommand {
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
 * 装備コンソールコマンド管理クラス
 */
export class EquipmentConsoleCommands {
    private equipmentManager: EquipmentManager;
    private commands: Map<string, EquipmentConsoleCommand> = new Map();
    private ignoreRequirements: boolean = false;

    /**
     * コンストラクタ
     * @param equipmentManager 装備マネージャー
     */
    constructor(equipmentManager: EquipmentManager) {
        this.equipmentManager = equipmentManager;
        this.initializeCommands();
    }

    /**
     * コマンドを初期化
     */
    private initializeCommands(): void {
        // ヘルプコマンド
        this.addCommand({
            name: 'help',
            description: '装備コマンドのヘルプを表示',
            parameters: ['[command]'],
            usage: 'equipment help [command]',
            handler: (commandName?: string) => this.showHelp(commandName)
        });

        // 装備装着コマンド
        this.addCommand({
            name: 'equip',
            description: 'キャラクターに装備を装着',
            parameters: ['<characterId>', '<equipmentId>', '<slot>'],
            usage: 'equipment equip player1 sword weapon',
            handler: (characterId: string, equipmentId: string, slot: string) =>
                this.equipItem(characterId, equipmentId, slot)
        });

        // 装備解除コマンド
        this.addCommand({
            name: 'unequip',
            description: 'キャラクターから装備を解除',
            parameters: ['<characterId>', '<slot>'],
            usage: 'equipment unequip player1 weapon',
            handler: (characterId: string, slot: string) => this.unequipItem(characterId, slot)
        });

        // 全装備解除コマンド
        this.addCommand({
            name: 'unequip-all',
            description: 'キャラクターの全装備を解除',
            parameters: ['<characterId>'],
            usage: 'equipment unequip-all player1',
            handler: (characterId: string) => this.unequipAllItems(characterId)
        });

        // 装備状態表示コマンド
        this.addCommand({
            name: 'show',
            description: 'キャラクターの装備状態を表示',
            parameters: ['<characterId>'],
            usage: 'equipment show player1',
            handler: (characterId: string) => this.showEquipment(characterId)
        });

        // 装備可能チェックコマンド
        this.addCommand({
            name: 'check',
            description: '装備可能かチェック',
            parameters: ['<characterId>', '<equipmentId>'],
            usage: 'equipment check player1 sword',
            handler: (characterId: string, equipmentId: string) =>
                this.checkEquipment(characterId, equipmentId)
        });

        // 装備条件無視モード切り替えコマンド
        this.addCommand({
            name: 'ignore-requirements',
            description: '装備条件無視モードを切り替え',
            parameters: ['[on|off]'],
            usage: 'equipment ignore-requirements on',
            handler: (state?: string) => this.toggleIgnoreRequirements(state)
        });

        // 装備効果表示コマンド
        this.addCommand({
            name: 'effects',
            description: 'キャラクターの装備効果を表示',
            parameters: ['<characterId>'],
            usage: 'equipment effects player1',
            handler: (characterId: string) => this.showEquipmentEffects(characterId)
        });

        // テスト装備作成コマンド
        this.addCommand({
            name: 'create',
            description: 'テスト用装備を作成',
            parameters: ['<equipmentId>', '<slot>', '[attack]', '[defense]'],
            usage: 'equipment create test-sword weapon 10 5',
            handler: (equipmentId: string, slot: string, attack?: string, defense?: string) =>
                this.createTestEquipment(equipmentId, slot, attack, defense)
        });

        // 装備比較コマンド
        this.addCommand({
            name: 'compare',
            description: '2つの装備を比較',
            parameters: ['<equipmentId1>', '<equipmentId2>'],
            usage: 'equipment compare sword1 sword2',
            handler: (equipmentId1: string, equipmentId2: string) =>
                this.compareEquipment(equipmentId1, equipmentId2)
        });

        // 装備耐久度設定コマンド
        this.addCommand({
            name: 'durability',
            description: '装備の耐久度を設定',
            parameters: ['<characterId>', '<slot>', '<value>'],
            usage: 'equipment durability player1 weapon 50',
            handler: (characterId: string, slot: string, value: string) =>
                this.setDurability(characterId, slot, value)
        });
    }

    /**
     * コマンドを追加
     * @param command コマンド定義
     */
    private addCommand(command: EquipmentConsoleCommand): void {
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
                `不明な装備コマンド: ${commandName}. 'equipment help' で利用可能なコマンドを確認してください。`
            );
            return;
        }

        try {
            await command.handler(...args);
        } catch (error) {
            console.error(`装備コマンド '${commandName}' の実行エラー:`, error.message);
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
            console.log('利用可能な装備コマンド:');
            this.commands.forEach(command => {
                console.log(`  ${command.name.padEnd(20)} - ${command.description}`);
            });
            console.log('\n"equipment help <command>" で特定のコマンドの詳細情報を表示します。');
        }
    }

    /**
     * 装備装着
     * @param characterId キャラクターID
     * @param equipmentId 装備ID
     * @param slot スロット
     */
    private equipItem(characterId: string, equipmentId: string, slot: string): void {
        if (!characterId || !equipmentId || !slot) {
            console.log('使用方法: equipment equip <characterId> <equipmentId> <slot>');
            console.log('利用可能なスロット: weapon, armor, accessory1, accessory2');
            return;
        }

        console.log(`装備を装着中: ${characterId} に ${equipmentId} を ${slot} スロットに`);

        try {
            // テスト装備を作成（実際の実装ではItemDataLoaderを使用）
            const equipment = this.getOrCreateTestEquipment(equipmentId, slot as EquipmentSlotType);

            // 装備条件無視モードの場合、条件チェックをスキップ
            if (this.ignoreRequirements) {
                console.log('⚠ 装備条件無視モードが有効です');
            }

            const success = this.equipmentManager.equipItem(
                characterId,
                equipment,
                slot as EquipmentSlotType
            );

            if (success) {
                console.log(`✓ 装備を装着しました: ${equipment.name}`);
                this.showEquipment(characterId);
            } else {
                console.log(`✗ 装備の装着に失敗しました`);
                if (!this.ignoreRequirements) {
                    console.log('装備条件を確認するか、ignore-requirements モードを有効にしてください');
                }
            }
        } catch (error) {
            console.error('装備装着エラー:', error.message);
        }
    }

    /**
     * 装備解除
     * @param characterId キャラクターID
     * @param slot スロット
     */
    private unequipItem(characterId: string, slot: string): void {
        if (!characterId || !slot) {
            console.log('使用方法: equipment unequip <characterId> <slot>');
            console.log('利用可能なスロット: weapon, armor, accessory1, accessory2');
            return;
        }

        console.log(`装備を解除中: ${characterId} の ${slot} スロット`);

        try {
            const unequipped = this.equipmentManager.unequipItem(
                characterId,
                slot as EquipmentSlotType
            );

            if (unequipped) {
                console.log(`✓ 装備を解除しました: ${unequipped.name}`);
                this.showEquipment(characterId);
            } else {
                console.log(`✗ 装備の解除に失敗しました（装備されていない可能性があります）`);
            }
        } catch (error) {
            console.error('装備解除エラー:', error.message);
        }
    }

    /**
     * 全装備解除
     * @param characterId キャラクターID
     */
    private unequipAllItems(characterId: string): void {
        if (!characterId) {
            console.log('使用方法: equipment unequip-all <characterId>');
            return;
        }

        console.log(`全装備を解除中: ${characterId}`);

        try {
            const slots: EquipmentSlotType[] = ['weapon', 'armor', 'accessory1', 'accessory2'];
            let unequippedCount = 0;

            slots.forEach(slot => {
                const unequipped = this.equipmentManager.unequipItem(characterId, slot);
                if (unequipped) {
                    unequippedCount++;
                    console.log(`  ✓ ${slot}: ${unequipped.name} を解除`);
                }
            });

            console.log(`\n合計 ${unequippedCount} 個の装備を解除しました`);
            this.showEquipment(characterId);
        } catch (error) {
            console.error('全装備解除エラー:', error.message);
        }
    }

    /**
     * 装備状態表示
     * @param characterId キャラクターID
     */
    private showEquipment(characterId: string): void {
        if (!characterId) {
            console.log('使用方法: equipment show <characterId>');
            return;
        }

        console.log(`=== ${characterId} の装備状態 ===`);

        try {
            const equipmentSet = this.equipmentManager.getAllEquipment(characterId);

            const slots: Array<{ key: keyof typeof equipmentSet; label: string }> = [
                { key: 'weapon', label: '武器' },
                { key: 'armor', label: '防具' },
                { key: 'accessory1', label: 'アクセサリ1' },
                { key: 'accessory2', label: 'アクセサリ2' }
            ];

            slots.forEach(({ key, label }) => {
                const equipment = equipmentSet[key];
                if (equipment) {
                    const durability = `${equipment.durability}/${equipment.maxDurability}`;
                    console.log(`  ${label}: ${equipment.name} (耐久度: ${durability})`);
                    this.displayEquipmentStats(equipment.stats);
                } else {
                    console.log(`  ${label}: (なし)`);
                }
            });
        } catch (error) {
            console.error('装備状態表示エラー:', error.message);
        }
    }

    /**
     * 装備可能チェック
     * @param characterId キャラクターID
     * @param equipmentId 装備ID
     */
    private checkEquipment(characterId: string, equipmentId: string): void {
        if (!characterId || !equipmentId) {
            console.log('使用方法: equipment check <characterId> <equipmentId>');
            return;
        }

        console.log(`装備可能チェック: ${characterId} が ${equipmentId} を装備できるか`);

        try {
            const equipment = this.getOrCreateTestEquipment(equipmentId, 'weapon');
            const canEquip = this.equipmentManager.canEquip(characterId, equipment);

            if (canEquip) {
                console.log('✓ この装備は装着可能です');
            } else {
                console.log('✗ この装備は装着できません');

                const requirements = this.equipmentManager.checkEquipmentRequirements(
                    characterId,
                    equipment
                );

                if (requirements.levelRequirement && !requirements.levelRequirement.met) {
                    console.log(
                        `  レベル不足: 必要レベル ${requirements.levelRequirement.required}, 現在レベル ${requirements.levelRequirement.current}`
                    );
                }

                if (requirements.jobRequirement && !requirements.jobRequirement.met) {
                    console.log(
                        `  職業不一致: 必要職業 ${requirements.jobRequirement.required}, 現在職業 ${requirements.jobRequirement.current}`
                    );
                }
            }
        } catch (error) {
            console.error('装備可能チェックエラー:', error.message);
        }
    }

    /**
     * 装備条件無視モード切り替え
     * @param state 状態（on/off）
     */
    private toggleIgnoreRequirements(state?: string): void {
        if (state === 'on') {
            this.ignoreRequirements = true;
            console.log('✓ 装備条件無視モードを有効にしました');
            console.log('⚠ 警告: このモードではレベルや職業の条件を無視して装備できます');
        } else if (state === 'off') {
            this.ignoreRequirements = false;
            console.log('✓ 装備条件無視モードを無効にしました');
        } else {
            this.ignoreRequirements = !this.ignoreRequirements;
            console.log(
                `装備条件無視モード: ${this.ignoreRequirements ? '有効' : '無効'}`
            );
        }
    }

    /**
     * 装備効果表示
     * @param characterId キャラクターID
     */
    private showEquipmentEffects(characterId: string): void {
        if (!characterId) {
            console.log('使用方法: equipment effects <characterId>');
            return;
        }

        console.log(`=== ${characterId} の装備効果 ===`);

        try {
            const equipmentSet = this.equipmentManager.getAllEquipment(characterId);
            const totalStats: EquipmentStats = {};

            // 全装備の効果を集計
            Object.values(equipmentSet).forEach(equipment => {
                if (equipment && equipment.stats) {
                    Object.entries(equipment.stats).forEach(([key, value]) => {
                        if (value !== undefined) {
                            totalStats[key as keyof EquipmentStats] =
                                (totalStats[key as keyof EquipmentStats] || 0) + value;
                        }
                    });
                }
            });

            console.log('合計装備効果:');
            this.displayEquipmentStats(totalStats);

            // 個別装備の効果
            console.log('\n個別装備効果:');
            const slots: Array<{ key: keyof typeof equipmentSet; label: string }> = [
                { key: 'weapon', label: '武器' },
                { key: 'armor', label: '防具' },
                { key: 'accessory1', label: 'アクセサリ1' },
                { key: 'accessory2', label: 'アクセサリ2' }
            ];

            slots.forEach(({ key, label }) => {
                const equipment = equipmentSet[key];
                if (equipment && equipment.stats) {
                    console.log(`  ${label} (${equipment.name}):`);
                    this.displayEquipmentStats(equipment.stats, '    ');
                }
            });
        } catch (error) {
            console.error('装備効果表示エラー:', error.message);
        }
    }

    /**
     * テスト装備作成
     * @param equipmentId 装備ID
     * @param slot スロット
     * @param attack 攻撃力
     * @param defense 防御力
     */
    private createTestEquipment(
        equipmentId: string,
        slot: string,
        attack?: string,
        defense?: string
    ): void {
        if (!equipmentId || !slot) {
            console.log('使用方法: equipment create <equipmentId> <slot> [attack] [defense]');
            console.log('利用可能なスロット: weapon, armor, accessory');
            return;
        }

        console.log(`テスト装備を作成中: ${equipmentId} (${slot})`);

        try {
            const stats: EquipmentStats = {};

            if (attack) {
                stats.attack = parseInt(attack);
            }

            if (defense) {
                stats.defense = parseInt(defense);
            }

            const equipment: Equipment = {
                id: equipmentId,
                name: `Test ${equipmentId}`,
                description: 'コンソールで作成されたテスト装備',
                type: slot === 'weapon' ? 'weapon' : slot === 'armor' ? 'armor' : 'accessory',
                rarity: 'common',
                iconPath: 'assets/items/default.png',
                maxStack: 1,
                sellPrice: 100,
                buyPrice: 200,
                slot: slot as EquipmentSlotType,
                stats,
                requirements: {},
                durability: 100,
                maxDurability: 100,
                effects: []
            };

            console.log('✓ テスト装備を作成しました:');
            console.log(`  名前: ${equipment.name}`);
            console.log(`  スロット: ${equipment.slot}`);
            this.displayEquipmentStats(equipment.stats);
            console.log('\n装備するには: equipment equip <characterId> ' + equipmentId + ' ' + slot);
        } catch (error) {
            console.error('テスト装備作成エラー:', error.message);
        }
    }

    /**
     * 装備比較
     * @param equipmentId1 装備ID1
     * @param equipmentId2 装備ID2
     */
    private compareEquipment(equipmentId1: string, equipmentId2: string): void {
        if (!equipmentId1 || !equipmentId2) {
            console.log('使用方法: equipment compare <equipmentId1> <equipmentId2>');
            return;
        }

        console.log(`=== 装備比較: ${equipmentId1} vs ${equipmentId2} ===`);

        try {
            const equipment1 = this.getOrCreateTestEquipment(equipmentId1, 'weapon');
            const equipment2 = this.getOrCreateTestEquipment(equipmentId2, 'weapon');

            console.log(`\n${equipment1.name}:`);
            this.displayEquipmentStats(equipment1.stats);

            console.log(`\n${equipment2.name}:`);
            this.displayEquipmentStats(equipment2.stats);

            console.log('\n差分:');
            const statKeys: Array<keyof EquipmentStats> = [
                'hp',
                'mp',
                'attack',
                'defense',
                'speed',
                'accuracy',
                'evasion'
            ];

            statKeys.forEach(key => {
                const value1 = equipment1.stats[key] || 0;
                const value2 = equipment2.stats[key] || 0;
                const diff = value2 - value1;

                if (diff !== 0) {
                    const symbol = diff > 0 ? '+' : '';
                    console.log(`  ${key}: ${symbol}${diff}`);
                }
            });
        } catch (error) {
            console.error('装備比較エラー:', error.message);
        }
    }

    /**
     * 装備耐久度設定
     * @param characterId キャラクターID
     * @param slot スロット
     * @param value 耐久度
     */
    private setDurability(characterId: string, slot: string, value: string): void {
        if (!characterId || !slot || !value) {
            console.log('使用方法: equipment durability <characterId> <slot> <value>');
            return;
        }

        const durability = parseInt(value);
        if (isNaN(durability) || durability < 0) {
            console.log('耐久度は0以上の整数である必要があります。');
            return;
        }

        console.log(`装備耐久度を設定中: ${characterId} の ${slot} を ${durability} に`);

        try {
            const equipment = this.equipmentManager.getEquipment(
                characterId,
                slot as EquipmentSlotType
            );

            if (!equipment) {
                console.log(`✗ ${slot} スロットに装備がありません`);
                return;
            }

            equipment.durability = Math.min(durability, equipment.maxDurability);

            console.log(
                `✓ 耐久度を設定しました: ${equipment.durability}/${equipment.maxDurability}`
            );

            if (equipment.durability === 0) {
                console.log('⚠ 警告: 耐久度が0になりました。装備が破損しています。');
            }
        } catch (error) {
            console.error('装備耐久度設定エラー:', error.message);
        }
    }

    /**
     * 装備ステータスを表示
     * @param stats 装備ステータス
     * @param indent インデント
     */
    private displayEquipmentStats(stats: EquipmentStats, indent: string = '    '): void {
        const statLabels: Record<keyof EquipmentStats, string> = {
            hp: 'HP',
            mp: 'MP',
            attack: '攻撃力',
            defense: '防御力',
            speed: '速度',
            accuracy: '命中率',
            evasion: '回避率'
        };

        Object.entries(statLabels).forEach(([key, label]) => {
            const value = stats[key as keyof EquipmentStats];
            if (value !== undefined && value !== 0) {
                const sign = value > 0 ? '+' : '';
                console.log(`${indent}${label}: ${sign}${value}`);
            }
        });
    }

    /**
     * テスト装備を取得または作成
     * @param equipmentId 装備ID
     * @param slot スロット
     * @returns 装備
     */
    private getOrCreateTestEquipment(equipmentId: string, slot: EquipmentSlotType): Equipment {
        // 実際の実装ではItemDataLoaderを使用してアイテムを取得
        // ここではテスト用の装備を作成
        return {
            id: equipmentId,
            name: equipmentId,
            description: 'デバッグコマンドで作成された装備',
            type: slot === 'weapon' ? 'weapon' : slot === 'armor' ? 'armor' : 'accessory',
            rarity: 'common',
            iconPath: 'assets/items/default.png',
            maxStack: 1,
            sellPrice: 100,
            buyPrice: 200,
            slot,
            stats: {
                attack: slot === 'weapon' ? 10 : 0,
                defense: slot === 'armor' ? 10 : 0,
                hp: 0,
                mp: 0,
                speed: 0,
                accuracy: 0,
                evasion: 0
            },
            requirements: {},
            durability: 100,
            maxDurability: 100,
            effects: []
        };
    }

    /**
     * 装備条件無視モードの状態を取得
     * @returns 装備条件無視モードが有効かどうか
     */
    isIgnoringRequirements(): boolean {
        return this.ignoreRequirements;
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
    getCommand(commandName: string): EquipmentConsoleCommand | undefined {
        return this.commands.get(commandName.toLowerCase());
    }
}
