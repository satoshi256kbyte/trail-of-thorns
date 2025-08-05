import { Unit } from '../types/battle';
import { GameConfig } from '../config/GameConfig';
import { BattleDebugManager } from './BattleDebugManager';
import { BattleBalanceTool } from './BattleBalanceTool';
import { DamageCalculator } from '../systems/DamageCalculator';
import { AttackRangeCalculator } from '../systems/AttackRangeCalculator';

/**
 * コンソールコマンドの結果
 */
export interface CommandResult {
    success: boolean;
    message: string;
    data?: any;
}

/**
 * 戦闘テスト用のモックユニット作成オプション
 */
export interface MockUnitOptions {
    name?: string;
    level?: number;
    attack?: number;
    defense?: number;
    hp?: number;
    mp?: number;
    agility?: number;
    luck?: number;
    weaponType?: string;
    weaponPower?: number;
}

/**
 * 戦闘コンソールコマンドシステム
 * 開発者向けの戦闘システムテスト・デバッグコマンドを提供
 */
export class BattleConsoleCommands {
    private gameConfig: GameConfig;
    private debugManager?: BattleDebugManager;
    private balanceTool?: BattleBalanceTool;
    private damageCalculator: DamageCalculator;
    private attackRangeCalculator: AttackRangeCalculator;
    private mockUnits: Map<string, Unit> = new Map();

    constructor(debugManager?: BattleDebugManager) {
        this.gameConfig = new GameConfig();
        this.debugManager = debugManager;
        this.balanceTool = debugManager?.getBalanceTool();
        this.damageCalculator = new DamageCalculator();
        this.attackRangeCalculator = new AttackRangeCalculator();

        this.initializeConsoleCommands();
    }

    /**
     * コンソールコマンドの初期化
     */
    private initializeConsoleCommands(): void {
        if (typeof window === 'undefined') return;

        // グローバルオブジェクトに戦闘コマンドを追加
        (window as any).battleCommands = {
            // 設定関連
            getConfig: () => this.getConfig(),
            setDamageMultiplier: (multiplier: number) => this.setDamageMultiplier(multiplier),
            setCriticalChance: (chance: number) => this.setCriticalChance(chance),
            setEvasionChance: (chance: number) => this.setEvasionChance(chance),
            setAnimationSpeed: (speed: number) => this.setAnimationSpeed(speed),

            // ユニット作成・管理
            createMockUnit: (id: string, options?: MockUnitOptions) => this.createMockUnit(id, options),
            listMockUnits: () => this.listMockUnits(),
            getMockUnit: (id: string) => this.getMockUnit(id),
            deleteMockUnit: (id: string) => this.deleteMockUnit(id),

            // 戦闘テスト
            testBattle: (attackerId: string, targetId: string) => this.testBattle(attackerId, targetId),
            simulateBattle: (attackerId: string, targetId: string, count?: number) => this.simulateBattle(attackerId, targetId, count),
            testDamageCalculation: (attackerId: string, targetId: string) => this.testDamageCalculation(attackerId, targetId),

            // 統計・分析
            getStatistics: () => this.getStatistics(),
            analyzeBalance: () => this.analyzeBalance(),
            generateReport: () => this.generateReport(),
            resetStatistics: () => this.resetStatistics(),

            // デバッグ制御
            enableDebug: (enable: boolean) => this.enableDebug(enable),
            showAttackRangeDebug: (enable: boolean) => this.showAttackRangeDebug(enable),
            showDamageDebug: (enable: boolean) => this.showDamageDebug(enable),
            clearDebugInfo: () => this.clearDebugInfo(),

            // ヘルプ
            help: () => this.showHelp(),
        };

        console.log('戦闘コンソールコマンドが利用可能です。battleCommands.help() でヘルプを表示できます。');
    }

    /**
     * 現在の設定を取得
     */
    private getConfig(): CommandResult {
        const config = this.gameConfig.getBattleSystemConfig();
        return {
            success: true,
            message: '現在の戦闘システム設定',
            data: {
                damageMultiplier: config.damageModifiers.globalDamageMultiplier,
                criticalMultiplier: config.damageModifiers.criticalDamageMultiplier,
                baseCriticalChance: config.balanceSettings.baseCriticalChance,
                baseEvasionChance: config.balanceSettings.baseEvasionChance,
                experienceMultiplier: config.balanceSettings.experienceMultiplier,
                animationSpeed: config.animationConfig.animationSpeed,
                enableDebug: config.enableBattleDebug,
            },
        };
    }

    /**
     * ダメージ倍率の設定
     */
    private setDamageMultiplier(multiplier: number): CommandResult {
        if (multiplier <= 0) {
            return {
                success: false,
                message: 'ダメージ倍率は0より大きい値である必要があります',
            };
        }

        const currentConfig = this.gameConfig.getBattleSystemConfig();
        this.gameConfig.updateBattleSystemConfig({
            damageModifiers: {
                ...currentConfig.damageModifiers,
                globalDamageMultiplier: multiplier,
            },
        });

        return {
            success: true,
            message: `ダメージ倍率を ${multiplier} に設定しました`,
        };
    }

    /**
     * クリティカル率の設定
     */
    private setCriticalChance(chance: number): CommandResult {
        if (chance < 0 || chance > 100) {
            return {
                success: false,
                message: 'クリティカル率は0-100の範囲で設定してください',
            };
        }

        const currentConfig = this.gameConfig.getBattleSystemConfig();
        this.gameConfig.updateBattleSystemConfig({
            balanceSettings: {
                ...currentConfig.balanceSettings,
                baseCriticalChance: chance,
            },
        });

        return {
            success: true,
            message: `基本クリティカル率を ${chance}% に設定しました`,
        };
    }

    /**
     * 回避率の設定
     */
    private setEvasionChance(chance: number): CommandResult {
        if (chance < 0 || chance > 100) {
            return {
                success: false,
                message: '回避率は0-100の範囲で設定してください',
            };
        }

        const currentConfig = this.gameConfig.getBattleSystemConfig();
        this.gameConfig.updateBattleSystemConfig({
            balanceSettings: {
                ...currentConfig.balanceSettings,
                baseEvasionChance: chance,
            },
        });

        return {
            success: true,
            message: `基本回避率を ${chance}% に設定しました`,
        };
    }

    /**
     * アニメーション速度の設定
     */
    private setAnimationSpeed(speed: number): CommandResult {
        if (speed <= 0) {
            return {
                success: false,
                message: 'アニメーション速度は0より大きい値である必要があります',
            };
        }

        const currentConfig = this.gameConfig.getBattleSystemConfig();
        this.gameConfig.updateBattleSystemConfig({
            animationConfig: {
                ...currentConfig.animationConfig,
                animationSpeed: speed,
            },
        });

        return {
            success: true,
            message: `アニメーション速度を ${speed}x に設定しました`,
        };
    }

    /**
     * モックユニットの作成
     */
    private createMockUnit(id: string, options: MockUnitOptions = {}): CommandResult {
        const unit: Unit = {
            id,
            name: options.name || `MockUnit_${id}`,
            position: { x: 0, y: 0 },
            stats: {
                level: options.level || 1,
                maxHP: options.hp || 100,
                maxMP: options.mp || 50,
                attack: options.attack || 20,
                defense: options.defense || 15,
                speed: 10,
                movement: 3,
                agility: options.agility || 10,
                luck: options.luck || 5,
            },
            currentHP: options.hp || 100,
            currentMP: options.mp || 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            weapon: {
                id: 'mock_weapon',
                name: options.weaponType || 'Mock Weapon',
                type: 'sword',
                attackPower: options.weaponPower || 25,
                range: 1,
                rangePattern: { type: 'single', range: 1, pattern: [{ x: 0, y: 0 }] },
                element: 'none',
                criticalRate: 5,
                accuracy: 90,
                specialEffects: [],
            },
        };

        this.mockUnits.set(id, unit);

        return {
            success: true,
            message: `モックユニット '${id}' を作成しました`,
            data: unit,
        };
    }

    /**
     * モックユニット一覧の取得
     */
    private listMockUnits(): CommandResult {
        const units = Array.from(this.mockUnits.entries()).map(([id, unit]) => ({
            id,
            name: unit.name,
            level: unit.stats.level,
            hp: `${unit.currentHP}/${unit.stats.maxHP}`,
            attack: unit.stats.attack,
            defense: unit.stats.defense,
        }));

        return {
            success: true,
            message: `${units.length} 個のモックユニットが存在します`,
            data: units,
        };
    }

    /**
     * モックユニットの取得
     */
    private getMockUnit(id: string): CommandResult {
        const unit = this.mockUnits.get(id);
        if (!unit) {
            return {
                success: false,
                message: `モックユニット '${id}' が見つかりません`,
            };
        }

        return {
            success: true,
            message: `モックユニット '${id}' の詳細`,
            data: unit,
        };
    }

    /**
     * モックユニットの削除
     */
    private deleteMockUnit(id: string): CommandResult {
        if (!this.mockUnits.has(id)) {
            return {
                success: false,
                message: `モックユニット '${id}' が見つかりません`,
            };
        }

        this.mockUnits.delete(id);
        return {
            success: true,
            message: `モックユニット '${id}' を削除しました`,
        };
    }

    /**
     * 戦闘テストの実行
     */
    private testBattle(attackerId: string, targetId: string): CommandResult {
        const attacker = this.mockUnits.get(attackerId);
        const target = this.mockUnits.get(targetId);

        if (!attacker) {
            return {
                success: false,
                message: `攻撃者 '${attackerId}' が見つかりません`,
            };
        }

        if (!target) {
            return {
                success: false,
                message: `対象 '${targetId}' が見つかりません`,
            };
        }

        // ダメージ計算
        const baseDamage = this.damageCalculator.calculateBaseDamage(attacker, target, attacker.weapon);
        const criticalResult = this.damageCalculator.calculateCritical(attacker, target);
        const isEvaded = this.damageCalculator.calculateEvasion(attacker, target);

        const finalDamage = isEvaded ? 0 :
            criticalResult.isCritical ? baseDamage * criticalResult.multiplier :
                baseDamage;

        // 結果の記録
        if (this.balanceTool) {
            this.balanceTool.recordBattle(attacker, target, finalDamage, criticalResult.isCritical, isEvaded, 0);
        }

        return {
            success: true,
            message: '戦闘テスト完了',
            data: {
                attacker: attacker.name,
                target: target.name,
                baseDamage,
                finalDamage,
                isCritical: criticalResult.isCritical,
                isEvaded,
                criticalChance: criticalResult.chance,
                targetHP: `${target.currentHP}/${target.stats.maxHP}`,
            },
        };
    }

    /**
     * 戦闘シミュレーションの実行
     */
    private simulateBattle(attackerId: string, targetId: string, count: number = 100): CommandResult {
        const attacker = this.mockUnits.get(attackerId);
        const target = this.mockUnits.get(targetId);

        if (!attacker || !target) {
            return {
                success: false,
                message: '指定されたユニットが見つかりません',
            };
        }

        if (!this.balanceTool) {
            return {
                success: false,
                message: 'バランスツールが利用できません',
            };
        }

        const result = this.balanceTool.simulateBattle(attacker, target, count);

        return {
            success: true,
            message: `戦闘シミュレーション完了 (${count}回)`,
            data: result,
        };
    }

    /**
     * ダメージ計算テスト
     */
    private testDamageCalculation(attackerId: string, targetId: string): CommandResult {
        const attacker = this.mockUnits.get(attackerId);
        const target = this.mockUnits.get(targetId);

        if (!attacker || !target) {
            return {
                success: false,
                message: '指定されたユニットが見つかりません',
            };
        }

        const baseDamage = this.damageCalculator.calculateBaseDamage(attacker, target, attacker.weapon);
        const criticalResult = this.damageCalculator.calculateCritical(attacker, target);
        const isEvaded = this.damageCalculator.calculateEvasion(attacker, target);

        // 属性相性の計算（仮実装）
        const elementalModifier = this.damageCalculator.applyElementalModifier(
            baseDamage,
            attacker.weapon.element,
            'none' // target element
        );

        return {
            success: true,
            message: 'ダメージ計算詳細',
            data: {
                attacker: {
                    name: attacker.name,
                    attack: attacker.stats.attack,
                    weaponPower: attacker.weapon.attackPower,
                    luck: attacker.stats.luck,
                },
                target: {
                    name: target.name,
                    defense: target.stats.defense,
                    agility: target.stats.agility,
                    currentHP: target.currentHP,
                },
                calculations: {
                    baseDamage,
                    elementalModifier,
                    criticalChance: criticalResult.chance,
                    criticalMultiplier: criticalResult.multiplier,
                    evasionChance: isEvaded ? 'EVADED' : 'HIT',
                    finalDamage: isEvaded ? 0 :
                        criticalResult.isCritical ? baseDamage * criticalResult.multiplier :
                            baseDamage,
                },
            },
        };
    }

    /**
     * 統計データの取得
     */
    private getStatistics(): CommandResult {
        if (!this.balanceTool) {
            return {
                success: false,
                message: 'バランスツールが利用できません',
            };
        }

        const statistics = this.balanceTool.getStatistics();
        return {
            success: true,
            message: '戦闘統計データ',
            data: statistics,
        };
    }

    /**
     * バランス分析の実行
     */
    private analyzeBalance(): CommandResult {
        if (!this.balanceTool) {
            return {
                success: false,
                message: 'バランスツールが利用できません',
            };
        }

        const recommendations = this.balanceTool.analyzeBalance();
        return {
            success: true,
            message: `${recommendations.length} 個のバランス調整提案があります`,
            data: recommendations,
        };
    }

    /**
     * レポートの生成
     */
    private generateReport(): CommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'デバッグマネージャーが利用できません',
            };
        }

        const report = this.debugManager.generateDebugReport();
        console.log(report);

        return {
            success: true,
            message: 'デバッグレポートをコンソールに出力しました',
            data: report,
        };
    }

    /**
     * 統計データのリセット
     */
    private resetStatistics(): CommandResult {
        if (this.balanceTool) {
            this.balanceTool.resetStatistics();
        }

        if (this.debugManager) {
            this.debugManager.clearDebugInfo();
        }

        return {
            success: true,
            message: '統計データとデバッグ情報をリセットしました',
        };
    }

    /**
     * デバッグモードの切り替え
     */
    private enableDebug(enable: boolean): CommandResult {
        this.gameConfig.updateBattleSystemConfig({
            enableBattleDebug: enable,
            showDamageCalculationDebug: enable,
            showAttackRangeDebug: enable,
            showTargetSelectionDebug: enable,
            showBattleStatistics: enable,
        });

        if (this.debugManager) {
            this.debugManager.updateDisplayOptions({
                logToConsole: enable,
                logToScreen: enable,
                enableDetailedLogging: enable,
            });
        }

        return {
            success: true,
            message: `デバッグモードを ${enable ? '有効' : '無効'} にしました`,
        };
    }

    /**
     * 攻撃範囲デバッグの切り替え
     */
    private showAttackRangeDebug(enable: boolean): CommandResult {
        if (this.debugManager) {
            this.debugManager.updateDisplayOptions({
                showAttackRange: enable,
            });
        }

        return {
            success: true,
            message: `攻撃範囲デバッグ表示を ${enable ? '有効' : '無効'} にしました`,
        };
    }

    /**
     * ダメージ計算デバッグの切り替え
     */
    private showDamageDebug(enable: boolean): CommandResult {
        if (this.debugManager) {
            this.debugManager.updateDisplayOptions({
                showDamageCalculation: enable,
            });
        }

        return {
            success: true,
            message: `ダメージ計算デバッグ表示を ${enable ? '有効' : '無効'} にしました`,
        };
    }

    /**
     * デバッグ情報のクリア
     */
    private clearDebugInfo(): CommandResult {
        if (this.debugManager) {
            this.debugManager.clearDebugInfo();
        }

        return {
            success: true,
            message: 'デバッグ情報をクリアしました',
        };
    }

    /**
     * ヘルプの表示
     */
    private showHelp(): CommandResult {
        const helpText = `
=== 戦闘コンソールコマンド ヘルプ ===

【設定関連】
battleCommands.getConfig()                    - 現在の設定を表示
battleCommands.setDamageMultiplier(1.5)       - ダメージ倍率を設定
battleCommands.setCriticalChance(10)          - クリティカル率を設定 (0-100)
battleCommands.setEvasionChance(15)           - 回避率を設定 (0-100)
battleCommands.setAnimationSpeed(2.0)         - アニメーション速度を設定

【ユニット管理】
battleCommands.createMockUnit('unit1', {name: 'テストユニット', attack: 30})
battleCommands.listMockUnits()                - モックユニット一覧
battleCommands.getMockUnit('unit1')           - ユニット詳細表示
battleCommands.deleteMockUnit('unit1')        - ユニット削除

【戦闘テスト】
battleCommands.testBattle('unit1', 'unit2')   - 1回の戦闘テスト
battleCommands.simulateBattle('unit1', 'unit2', 1000) - 戦闘シミュレーション
battleCommands.testDamageCalculation('unit1', 'unit2') - ダメージ計算詳細

【統計・分析】
battleCommands.getStatistics()               - 統計データ表示
battleCommands.analyzeBalance()              - バランス分析
battleCommands.generateReport()              - 詳細レポート生成
battleCommands.resetStatistics()             - 統計リセット

【デバッグ制御】
battleCommands.enableDebug(true)             - デバッグモード切り替え
battleCommands.showAttackRangeDebug(true)    - 攻撃範囲表示切り替え
battleCommands.showDamageDebug(true)         - ダメージ計算表示切り替え
battleCommands.clearDebugInfo()              - デバッグ情報クリア

使用例:
1. battleCommands.createMockUnit('hero', {attack: 50, defense: 30})
2. battleCommands.createMockUnit('enemy', {attack: 40, defense: 20, hp: 80})
3. battleCommands.testBattle('hero', 'enemy')
4. battleCommands.simulateBattle('hero', 'enemy', 500)
5. battleCommands.analyzeBalance()
        `;

        console.log(helpText);

        return {
            success: true,
            message: 'ヘルプをコンソールに表示しました',
            data: helpText,
        };
    }

    /**
     * コンソールコマンドの破棄
     */
    public destroy(): void {
        if (typeof window !== 'undefined') {
            delete (window as any).battleCommands;
        }
        this.mockUnits.clear();
    }
}