/**
 * ExperienceConsoleCommands - 経験値システムコンソールコマンド
 * 
 * このクラスは経験値システムのコンソールコマンドを提供します:
 * - 経験値・レベル操作テスト機能
 * - バランス調整用のコマンド
 * - シミュレーション・統計コマンド
 * 
 * 要件: 全要件の設定可能性とデバッグ支援
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    ExperienceAction,
    ExperienceSource,
    ExperienceContext,
    GrowthRates,
    StatGrowthResult
} from '../types/experience';
import { Unit } from '../types/gameplay';
import { ExperienceSystem } from '../systems/experience/ExperienceSystem';
import { ExperienceDebugManager } from './ExperienceDebugManager';
import { GameConfig } from '../config/GameConfig';

/**
 * コンソールコマンド結果
 */
interface CommandResult {
    success: boolean;
    message: string;
    data?: any;
}

/**
 * ExperienceConsoleCommandsクラス
 * 経験値システムのコンソールコマンドを管理
 */
export class ExperienceConsoleCommands {
    private experienceSystem: ExperienceSystem;
    private debugManager: ExperienceDebugManager;
    private gameConfig: GameConfig;

    constructor(
        experienceSystem: ExperienceSystem,
        debugManager: ExperienceDebugManager
    ) {
        this.experienceSystem = experienceSystem;
        this.debugManager = debugManager;
        this.gameConfig = new GameConfig();

        // コンソールコマンドを登録
        this.registerCommands();
    }

    /**
     * コンソールコマンドを登録
     */
    private registerCommands(): void {
        const config = this.gameConfig.getExperienceSystemConfig();

        if (!config.consoleCommands.enableCommands) {
            return;
        }

        const prefix = config.consoleCommands.commandPrefix;

        // グローバルオブジェクトにコマンドを追加
        (window as any).experienceCommands = {
            // 基本コマンド
            help: () => this.showHelp(),
            status: () => this.showStatus(),

            // 経験値操作コマンド
            addExp: (characterId: string, amount: number) => this.addExperience(characterId, amount),
            setExp: (characterId: string, amount: number) => this.setExperience(characterId, amount),
            setLevel: (characterId: string, level: number) => this.setLevel(characterId, level),
            levelUp: (characterId: string) => this.forceLevelUp(characterId),
            maxLevel: (characterId: string) => this.setMaxLevel(characterId),

            // 経験値獲得テスト
            testAttack: (characterId: string, count: number = 1) => this.testExperienceGain(characterId, ExperienceAction.ATTACK, count),
            testDefeat: (characterId: string, count: number = 1) => this.testExperienceGain(characterId, ExperienceAction.DEFEAT, count),
            testHeal: (characterId: string, count: number = 1) => this.testExperienceGain(characterId, ExperienceAction.HEAL, count),
            testSupport: (characterId: string, count: number = 1) => this.testExperienceGain(characterId, ExperienceAction.SUPPORT, count),

            // バランス調整コマンド
            setMultiplier: (multiplier: number) => this.setExperienceMultiplier(multiplier),
            setBaseExp: (action: string, amount: number) => this.setBaseExperience(action, amount),
            setMaxLevelCap: (level: number) => this.setMaxLevelCap(level),

            // 成長率操作
            setGrowthRate: (characterId: string, stat: string, rate: number) => this.setGrowthRate(characterId, stat, rate),
            showGrowthRates: (characterId: string) => this.showGrowthRates(characterId),

            // シミュレーション
            simulate: (characterId: string, actions: string, count: number) => this.runSimulation(characterId, actions, count),
            simulateLeveling: (characterId: string, targetLevel: number) => this.simulateLeveling(characterId, targetLevel),

            // 統計・デバッグ
            stats: () => this.showStatistics(),
            balance: () => this.showBalanceStatistics(),
            performance: () => this.showPerformanceStats(),
            debug: (enable?: boolean) => this.toggleDebug(enable),
            clear: () => this.clearDebugData(),
            export: () => this.exportDebugData(),

            // リセット・復元
            reset: (characterId: string) => this.resetCharacter(characterId),
            resetAll: () => this.resetAllCharacters(),
            backup: (characterId: string) => this.backupCharacter(characterId),
            restore: (characterId: string) => this.restoreCharacter(characterId)
        };

        // エイリアスを設定
        (window as any)[prefix] = (window as any).experienceCommands;

        console.log(`Experience console commands registered with prefix '${prefix}'`);
        console.log('Type experienceCommands.help() or exp.help() for available commands');
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): CommandResult {
        const helpText = `
Experience System Console Commands:

=== Basic Commands ===
help()                          - Show this help
status()                        - Show system status
stats()                         - Show experience statistics

=== Experience Manipulation ===
addExp(characterId, amount)     - Add experience to character
setExp(characterId, amount)     - Set character's current experience
setLevel(characterId, level)    - Set character's level
levelUp(characterId)           - Force level up
maxLevel(characterId)          - Set character to max level

=== Experience Testing ===
testAttack(characterId, count)  - Test attack hit experience
testDefeat(characterId, count)  - Test enemy defeat experience
testHeal(characterId, count)    - Test healing experience
testSupport(characterId, count) - Test support experience

=== Balance Adjustment ===
setMultiplier(multiplier)       - Set global experience multiplier
setBaseExp(action, amount)      - Set base experience for action
setMaxLevelCap(level)          - Set maximum level cap

=== Growth Rate Manipulation ===
setGrowthRate(charId, stat, rate) - Set growth rate for stat
showGrowthRates(characterId)    - Show character's growth rates

=== Simulation ===
simulate(charId, actions, count) - Run experience simulation
simulateLeveling(charId, level)  - Simulate leveling to target

=== Debug & Statistics ===
balance()                       - Show balance statistics
performance()                   - Show performance metrics
debug(enable)                   - Toggle debug display
clear()                         - Clear debug data
export()                        - Export debug data

=== Reset & Backup ===
reset(characterId)              - Reset character experience
resetAll()                      - Reset all characters
backup(characterId)             - Backup character data
restore(characterId)            - Restore character data

Examples:
exp.addExp('player-001', 100)
exp.testAttack('player-001', 5)
exp.setMultiplier(2.0)
exp.simulate('player-001', 'attack', 50)
        `;

        console.log(helpText);
        return { success: true, message: 'Help displayed' };
    }

    /**
     * システム状態を表示
     */
    private showStatus(): CommandResult {
        try {
            const systemState = this.experienceSystem.getSystemState();
            const config = this.gameConfig.getExperienceSystemConfig();

            const status = {
                initialized: systemState.isInitialized,
                experienceTableLoaded: systemState.experienceTableLoaded,
                growthRatesLoaded: systemState.growthRatesLoaded,
                activeCharacters: Array.from(systemState.activeCharacters),
                experienceMultiplier: systemState.experienceMultiplier,
                maxLevel: config.balanceSettings.maxLevel,
                debugEnabled: config.enableExperienceDebug,
                pendingLevelUps: systemState.pendingLevelUps.size
            };

            console.table(status);
            return { success: true, message: 'Status displayed', data: status };

        } catch (error) {
            return { success: false, message: `Failed to show status: ${error}` };
        }
    }

    /**
     * 経験値を追加
     */
    private addExperience(characterId: string, amount: number): CommandResult {
        try {
            if (!characterId || amount < 0) {
                return { success: false, message: 'Invalid parameters' };
            }

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const result = this.experienceSystem.awardExperience(characterId, ExperienceAction.ATTACK, context);

            if (result) {
                const info = this.experienceSystem.getExperienceInfo(characterId);
                return {
                    success: true,
                    message: `Added ${result.finalAmount} experience to ${characterId}`,
                    data: info
                };
            } else {
                return { success: false, message: 'Failed to add experience' };
            }

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 経験値を設定
     */
    private setExperience(characterId: string, amount: number): CommandResult {
        try {
            // 現在の経験値を取得
            const currentInfo = this.experienceSystem.getExperienceInfo(characterId);
            const difference = amount - currentInfo.currentExperience;

            if (difference > 0) {
                return this.addExperience(characterId, difference);
            } else if (difference < 0) {
                // 経験値を減らす場合（実装が必要）
                return { success: false, message: 'Reducing experience not implemented' };
            } else {
                return { success: true, message: 'Experience already at target value' };
            }

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * レベルを設定
     */
    private setLevel(characterId: string, level: number): CommandResult {
        try {
            const config = this.gameConfig.getExperienceSystemConfig();

            if (level < 1 || level > config.balanceSettings.maxLevel) {
                return {
                    success: false,
                    message: `Level must be between 1 and ${config.balanceSettings.maxLevel}`
                };
            }

            // 目標レベルまでレベルアップを繰り返す
            let currentInfo = this.experienceSystem.getExperienceInfo(characterId);
            let levelUpsPerformed = 0;

            while (currentInfo.currentLevel < level) {
                const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(characterId);
                if (!levelUpResult) {
                    // 経験値が足りない場合は追加
                    const expNeeded = currentInfo.experienceToNextLevel;
                    this.addExperience(characterId, expNeeded);
                    continue;
                }

                levelUpsPerformed++;
                currentInfo = this.experienceSystem.getExperienceInfo(characterId);

                if (levelUpsPerformed > 100) {
                    return { success: false, message: 'Too many level ups, aborting' };
                }
            }

            return {
                success: true,
                message: `Set ${characterId} to level ${level} (${levelUpsPerformed} level ups)`,
                data: currentInfo
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 強制レベルアップ
     */
    private forceLevelUp(characterId: string): CommandResult {
        try {
            const result = this.experienceSystem.checkAndProcessLevelUp(characterId);

            if (result) {
                return {
                    success: true,
                    message: `${characterId} leveled up: ${result.oldLevel} → ${result.newLevel}`,
                    data: result
                };
            } else {
                return { success: false, message: 'Cannot level up (insufficient experience or max level)' };
            }

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 最大レベルに設定
     */
    private setMaxLevel(characterId: string): CommandResult {
        const config = this.gameConfig.getExperienceSystemConfig();
        return this.setLevel(characterId, config.balanceSettings.maxLevel);
    }

    /**
     * 経験値獲得をテスト
     */
    private testExperienceGain(characterId: string, action: ExperienceAction, count: number): CommandResult {
        try {
            const results = [];

            for (let i = 0; i < count; i++) {
                const context: ExperienceContext = {
                    source: this.mapActionToSource(action),
                    action,
                    timestamp: Date.now()
                };

                const result = this.experienceSystem.awardExperience(characterId, action, context);
                if (result) {
                    results.push(result.finalAmount);
                }
            }

            const totalExp = results.reduce((sum, exp) => sum + exp, 0);
            const avgExp = totalExp / results.length;

            return {
                success: true,
                message: `Tested ${action} ${count} times: Total ${totalExp} EXP, Average ${avgExp.toFixed(1)} EXP`,
                data: { totalExp, avgExp, results }
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 経験値倍率を設定
     */
    private setExperienceMultiplier(multiplier: number): CommandResult {
        try {
            if (multiplier < 0) {
                return { success: false, message: 'Multiplier cannot be negative' };
            }

            this.experienceSystem.setExperienceMultiplier(multiplier, 'Console command');

            return {
                success: true,
                message: `Experience multiplier set to ${multiplier}x`
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 基本経験値を設定
     */
    private setBaseExperience(action: string, amount: number): CommandResult {
        try {
            if (amount < 0) {
                return { success: false, message: 'Experience amount cannot be negative' };
            }

            const success = this.gameConfig.updateExperienceSystemBalanceSetting(
                `base${action}Experience`,
                amount
            );

            if (success) {
                return {
                    success: true,
                    message: `Base ${action} experience set to ${amount}`
                };
            } else {
                return { success: false, message: `Unknown action: ${action}` };
            }

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 最大レベル上限を設定
     */
    private setMaxLevelCap(level: number): CommandResult {
        try {
            const success = this.gameConfig.updateExperienceSystemBalanceSetting('maxLevel', level);

            if (success) {
                return {
                    success: true,
                    message: `Maximum level cap set to ${level}`
                };
            } else {
                return { success: false, message: 'Failed to set max level cap' };
            }

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 成長率を設定
     */
    private setGrowthRate(characterId: string, stat: string, rate: number): CommandResult {
        try {
            if (rate < 0 || rate > 100) {
                return { success: false, message: 'Growth rate must be between 0 and 100' };
            }

            // 実装が必要: GrowthCalculatorに成長率設定機能を追加
            return { success: false, message: 'Growth rate setting not implemented yet' };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 成長率を表示
     */
    private showGrowthRates(characterId: string): CommandResult {
        try {
            // 実装が必要: GrowthCalculatorから成長率取得
            return { success: false, message: 'Growth rate display not implemented yet' };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * シミュレーションを実行
     */
    private async runSimulation(characterId: string, actions: string, count: number): Promise<CommandResult> {
        try {
            const actionMap: Record<string, ExperienceAction> = {
                'attack': ExperienceAction.ATTACK,
                'defeat': ExperienceAction.DEFEAT,
                'heal': ExperienceAction.HEAL,
                'support': ExperienceAction.SUPPORT
            };

            const action = actionMap[actions.toLowerCase()];
            if (!action) {
                return { success: false, message: `Unknown action: ${actions}` };
            }

            const result = await this.debugManager.runExperienceSimulation(
                characterId,
                [{ action, count }],
                { logResults: true, visualize: false }
            );

            return {
                success: true,
                message: `Simulation completed: ${result.levelUpsCount} level ups, ${result.totalExperienceGained} total EXP`,
                data: result
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * レベリングシミュレーション
     */
    private async simulateLeveling(characterId: string, targetLevel: number): Promise<CommandResult> {
        try {
            const currentInfo = this.experienceSystem.getExperienceInfo(characterId);

            if (currentInfo.currentLevel >= targetLevel) {
                return { success: false, message: 'Character is already at or above target level' };
            }

            // 必要な経験値を概算
            const levelsNeeded = targetLevel - currentInfo.currentLevel;
            const estimatedActions = levelsNeeded * 20; // 概算

            const result = await this.debugManager.runExperienceSimulation(
                characterId,
                [{ action: ExperienceAction.ATTACK, count: estimatedActions }],
                { logResults: true, visualize: true }
            );

            return {
                success: true,
                message: `Leveling simulation completed: Reached level ${result.finalLevel}`,
                data: result
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 統計情報を表示
     */
    private showStatistics(): CommandResult {
        try {
            const debugData = this.debugManager.exportDebugData();
            console.table(debugData.statistics);

            return {
                success: true,
                message: 'Statistics displayed',
                data: debugData.statistics
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * バランス統計を表示
     */
    private showBalanceStatistics(): CommandResult {
        try {
            const balanceStats = this.debugManager.generateBalanceStatistics();
            console.table(balanceStats);

            return {
                success: true,
                message: 'Balance statistics displayed',
                data: balanceStats
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * パフォーマンス統計を表示
     */
    private showPerformanceStats(): CommandResult {
        try {
            const perfStats = this.debugManager.getPerformanceStatistics();
            console.table(perfStats);

            return {
                success: true,
                message: 'Performance statistics displayed',
                data: perfStats
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * デバッグ表示を切り替え
     */
    private toggleDebug(enable?: boolean): CommandResult {
        try {
            if (enable !== undefined) {
                this.gameConfig.updateExperienceSystemConfig({
                    enableExperienceDebug: enable
                });
                return {
                    success: true,
                    message: `Debug display ${enable ? 'enabled' : 'disabled'}`
                };
            } else {
                this.debugManager.toggleDebugDisplay();
                return {
                    success: true,
                    message: 'Debug display toggled'
                };
            }

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * デバッグデータをクリア
     */
    private clearDebugData(): CommandResult {
        try {
            this.debugManager.clearDebugData();
            return {
                success: true,
                message: 'Debug data cleared'
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * デバッグデータをエクスポート
     */
    private exportDebugData(): CommandResult {
        try {
            const debugData = this.debugManager.exportDebugData();

            // JSONとしてダウンロード可能にする
            const dataStr = JSON.stringify(debugData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `experience-debug-${Date.now()}.json`;
            link.click();

            URL.revokeObjectURL(url);

            return {
                success: true,
                message: 'Debug data exported to file',
                data: debugData
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * キャラクターをリセット
     */
    private resetCharacter(characterId: string): CommandResult {
        try {
            // キャラクターを削除して再登録
            this.experienceSystem.unregisterCharacter(characterId);

            // 仮のキャラクターデータで再登録（実際の実装では適切なデータを使用）
            const mockCharacter: Unit = {
                id: characterId,
                name: `Character ${characterId}`,
                position: { x: 0, y: 0 },
                stats: {
                    maxHP: 100,
                    maxMP: 50,
                    attack: 20,
                    defense: 15,
                    speed: 10,
                    movement: 3
                },
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false,
                level: 1
            };

            this.experienceSystem.registerCharacter(mockCharacter, 1, 0);

            return {
                success: true,
                message: `Character ${characterId} reset to level 1`
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * 全キャラクターをリセット
     */
    private resetAllCharacters(): CommandResult {
        try {
            const systemState = this.experienceSystem.getSystemState();
            const characterIds = Array.from(systemState.activeCharacters);

            let resetCount = 0;
            for (const characterId of characterIds) {
                const result = this.resetCharacter(characterId);
                if (result.success) {
                    resetCount++;
                }
            }

            return {
                success: true,
                message: `Reset ${resetCount} characters`
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * キャラクターをバックアップ
     */
    private backupCharacter(characterId: string): CommandResult {
        try {
            const info = this.experienceSystem.getExperienceInfo(characterId);

            // ローカルストレージにバックアップ
            const backupKey = `exp_backup_${characterId}`;
            localStorage.setItem(backupKey, JSON.stringify({
                characterId,
                experienceInfo: info,
                timestamp: Date.now()
            }));

            return {
                success: true,
                message: `Character ${characterId} backed up`,
                data: info
            };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * キャラクターを復元
     */
    private restoreCharacter(characterId: string): CommandResult {
        try {
            const backupKey = `exp_backup_${characterId}`;
            const backupData = localStorage.getItem(backupKey);

            if (!backupData) {
                return { success: false, message: 'No backup found for character' };
            }

            const backup = JSON.parse(backupData);

            // 復元処理（実装が必要）
            return { success: false, message: 'Character restoration not implemented yet' };

        } catch (error) {
            return { success: false, message: `Error: ${error}` };
        }
    }

    // ===== ヘルパーメソッド =====

    private mapActionToSource(action: ExperienceAction): ExperienceSource {
        switch (action) {
            case ExperienceAction.ATTACK:
                return ExperienceSource.ATTACK_HIT;
            case ExperienceAction.DEFEAT:
                return ExperienceSource.ENEMY_DEFEAT;
            case ExperienceAction.HEAL:
                return ExperienceSource.HEALING;
            case ExperienceAction.SUPPORT:
                return ExperienceSource.ALLY_SUPPORT;
            default:
                return ExperienceSource.ATTACK_HIT;
        }
    }

    /**
     * コンソールコマンドを無効化
     */
    public disable(): void {
        delete (window as any).experienceCommands;

        const config = this.gameConfig.getExperienceSystemConfig();
        const prefix = config.consoleCommands.commandPrefix;
        delete (window as any)[prefix];

        console.log('Experience console commands disabled');
    }
}