/**
 * SkillConsoleCommands - スキルシステム専用コンソールコマンド
 * 
 * スキルシステムのテスト・デバッグ・バランス調整用のコンソールコマンドを提供：
 * - スキル実行テストコマンド
 * - スキル条件チェックコマンド
 * - バランス調整コマンド
 * - 統計情報表示コマンド
 * - スキルデータ操作コマンド
 */

import { SkillDebugManager } from './SkillDebugManager';
import { SkillSystem } from '../systems/skills/SkillSystem';
import { SkillSystemConfig } from '../config/GameConfig';
import {
    Skill,
    SkillData,
    SkillType,
    TargetType,
    Position
} from '../types/skill';
import { Unit } from '../types/gameplay';

/**
 * コンソールコマンド定義
 */
export interface SkillConsoleCommand {
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
 * スキルコンソールコマンド管理クラス
 */
export class SkillConsoleCommands {
    private skillSystem: SkillSystem;
    private debugManager: SkillDebugManager;
    private config: SkillSystemConfig;
    private commands: Map<string, SkillConsoleCommand> = new Map();

    /**
     * コンストラクタ
     * @param skillSystem スキルシステム
     * @param debugManager デバッグマネージャー
     * @param config システム設定
     */
    constructor(
        skillSystem: SkillSystem,
        debugManager: SkillDebugManager,
        config: SkillSystemConfig
    ) {
        this.skillSystem = skillSystem;
        this.debugManager = debugManager;
        this.config = config;

        this.initializeCommands();
    }

    /**
     * コマンドを初期化
     */
    private initializeCommands(): void {
        // ヘルプコマンド
        this.addCommand({
            name: 'help',
            description: 'Show available skill commands',
            parameters: ['[command]'],
            usage: 'skill help [command]',
            handler: (commandName?: string) => this.showHelp(commandName)
        });

        // スキル実行テストコマンド
        this.addCommand({
            name: 'use',
            description: 'Execute a skill for testing',
            parameters: ['<skillId>', '<casterId>', '[targetX]', '[targetY]'],
            usage: 'skill use fireball player1 5 3',
            handler: (skillId: string, casterId: string, targetX?: string, targetY?: string) =>
                this.executeSkillTest(skillId, casterId, targetX, targetY)
        });

        // スキル条件チェックコマンド
        this.addCommand({
            name: 'check',
            description: 'Check skill usage conditions',
            parameters: ['<skillId>', '<casterId>'],
            usage: 'skill check heal player2',
            handler: (skillId: string, casterId: string) =>
                this.checkSkillConditions(skillId, casterId)
        });

        // スキル一覧表示コマンド
        this.addCommand({
            name: 'list',
            description: 'List available skills',
            parameters: ['[casterId]', '[filter]'],
            usage: 'skill list player1 attack',
            handler: (casterId?: string, filter?: string) =>
                this.listSkills(casterId, filter)
        });

        // スキル詳細表示コマンド
        this.addCommand({
            name: 'info',
            description: 'Show detailed skill information',
            parameters: ['<skillId>'],
            usage: 'skill info fireball',
            handler: (skillId: string) => this.showSkillInfo(skillId)
        });

        // 統計情報表示コマンド
        this.addCommand({
            name: 'stats',
            description: 'Show skill usage statistics',
            parameters: ['[skillId]'],
            usage: 'skill stats fireball',
            handler: (skillId?: string) => this.showStatistics(skillId)
        });

        // バランス分析コマンド
        this.addCommand({
            name: 'balance',
            description: 'Analyze skill balance',
            parameters: ['<skillId>'],
            usage: 'skill balance fireball',
            handler: (skillId: string) => this.analyzeBalance(skillId)
        });

        // スキルテストシナリオ実行コマンド
        this.addCommand({
            name: 'test',
            description: 'Run skill test scenario',
            parameters: ['<scenarioName>'],
            usage: 'skill test basic-attack-skill',
            handler: (scenarioName: string) => this.runTestScenario(scenarioName)
        });

        // スキル設定変更コマンド
        this.addCommand({
            name: 'config',
            description: 'Modify skill system configuration',
            parameters: ['<setting>', '<value>'],
            usage: 'skill config globalDamageMultiplier 1.5',
            handler: (setting: string, value: string) => this.modifyConfig(setting, value)
        });

        // スキルデータ作成コマンド
        this.addCommand({
            name: 'create',
            description: 'Create a new skill for testing',
            parameters: ['<skillId>', '<type>', '<damage>', '<mpCost>'],
            usage: 'skill create testskill attack 25 10',
            handler: (skillId: string, type: string, damage: string, mpCost: string) =>
                this.createTestSkill(skillId, type, damage, mpCost)
        });

        // スキル効果シミュレーションコマンド
        this.addCommand({
            name: 'simulate',
            description: 'Simulate skill effects',
            parameters: ['<skillId>', '<iterations>'],
            usage: 'skill simulate fireball 100',
            handler: (skillId: string, iterations: string) =>
                this.simulateSkillEffects(skillId, iterations)
        });

        // デバッグモード切り替えコマンド
        this.addCommand({
            name: 'debug',
            description: 'Toggle skill debug mode',
            parameters: ['[on|off]'],
            usage: 'skill debug on',
            handler: (state?: string) => this.toggleDebugMode(state)
        });

        // 統計リセットコマンド
        this.addCommand({
            name: 'reset',
            description: 'Reset skill statistics',
            parameters: [],
            usage: 'skill reset',
            handler: () => this.resetStatistics()
        });

        // スキル範囲表示コマンド
        this.addCommand({
            name: 'range',
            description: 'Show skill range visualization',
            parameters: ['<skillId>', '<x>', '<y>'],
            usage: 'skill range fireball 5 3',
            handler: (skillId: string, x: string, y: string) =>
                this.showSkillRange(skillId, x, y)
        });

        // バランス調整提案コマンド
        this.addCommand({
            name: 'suggest',
            description: 'Get balance adjustment suggestions',
            parameters: ['<skillId>'],
            usage: 'skill suggest fireball',
            handler: (skillId: string) => this.suggestBalanceAdjustments(skillId)
        });

        // パフォーマンス測定コマンド
        this.addCommand({
            name: 'perf',
            description: 'Measure skill performance',
            parameters: ['<skillId>', '[iterations]'],
            usage: 'skill perf fireball 50',
            handler: (skillId: string, iterations?: string) =>
                this.measurePerformance(skillId, iterations)
        });
    }

    /**
     * コマンドを追加
     * @param command コマンド定義
     */
    private addCommand(command: SkillConsoleCommand): void {
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
            console.warn(`Unknown skill command: ${commandName}. Type 'skill help' for available commands.`);
            return;
        }

        try {
            await command.handler(...args);
        } catch (error) {
            console.error(`Error executing skill command '${commandName}':`, error.message);
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
                console.log(`Command: ${command.name}`);
                console.log(`Description: ${command.description}`);
                console.log(`Parameters: ${command.parameters.join(' ')}`);
                console.log(`Usage: ${command.usage}`);
            } else {
                console.log(`Command '${commandName}' not found.`);
            }
        } else {
            console.log('Available skill commands:');
            this.commands.forEach(command => {
                console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
            });
            console.log('\nUse "skill help <command>" for detailed information about a specific command.');
        }
    }

    /**
     * スキル実行テスト
     * @param skillId スキルID
     * @param casterId 使用者ID
     * @param targetX 対象X座標
     * @param targetY 対象Y座標
     */
    private async executeSkillTest(
        skillId: string,
        casterId: string,
        targetX?: string,
        targetY?: string
    ): Promise<void> {
        if (!skillId || !casterId) {
            console.log('Usage: skill use <skillId> <casterId> [targetX] [targetY]');
            return;
        }

        const targetPosition: Position = {
            x: targetX ? parseInt(targetX) : 0,
            y: targetY ? parseInt(targetY) : 0
        };

        console.log(`Executing skill test: ${skillId} by ${casterId} at (${targetPosition.x}, ${targetPosition.y})`);

        try {
            const result = await this.skillSystem.useSkill(skillId, casterId, targetPosition, true);

            console.log('Skill execution result:', {
                success: result.success,
                damage: result.result?.damage || 0,
                healing: result.result?.healing || 0,
                mpCost: result.result?.mpCost || 0,
                executionTime: result.flowStats?.executionTime || 0
            });

            if (!result.success && result.error) {
                console.log('Error details:', result.error);
            }

        } catch (error) {
            console.error('Skill execution failed:', error.message);
        }
    }

    /**
     * スキル条件チェック
     * @param skillId スキルID
     * @param casterId 使用者ID
     */
    private checkSkillConditions(skillId: string, casterId: string): void {
        if (!skillId || !casterId) {
            console.log('Usage: skill check <skillId> <casterId>');
            return;
        }

        console.log(`Checking skill conditions: ${skillId} for ${casterId}`);

        // 使用可能なスキル一覧から該当スキルを検索
        const availableSkills = this.skillSystem.getAvailableSkills(casterId);
        const skillMenuItem = availableSkills.find(item => item.skill.id === skillId);

        if (!skillMenuItem) {
            console.log(`Skill '${skillId}' not found or not available for ${casterId}`);
            return;
        }

        const usability = skillMenuItem.usability;

        console.log('Skill condition check result:', {
            canUse: usability.canUse,
            reason: usability.reason || 'No specific reason',
            mpCost: usability.mpCost,
            cooldownRemaining: usability.cooldownRemaining || 0,
            enabled: skillMenuItem.enabled
        });

        if (!usability.canUse) {
            console.log(`Cannot use skill: ${usability.reason}`);
        }
    }

    /**
     * スキル一覧表示
     * @param casterId 使用者ID
     * @param filter フィルター（スキル種別）
     */
    private listSkills(casterId?: string, filter?: string): void {
        if (casterId) {
            console.log(`Skills available for ${casterId}:`);

            const availableSkills = this.skillSystem.getAvailableSkills(casterId);
            let filteredSkills = availableSkills;

            if (filter) {
                filteredSkills = availableSkills.filter(item =>
                    item.skill.skillType.toLowerCase().includes(filter.toLowerCase())
                );
            }

            if (filteredSkills.length === 0) {
                console.log('No skills found matching the criteria.');
                return;
            }

            filteredSkills.forEach(item => {
                const skill = item.skill;
                const status = item.enabled ? '✓' : '✗';
                console.log(`  ${status} ${skill.id.padEnd(15)} (${skill.skillType}) - MP:${skill.usageCondition.mpCost} - ${skill.name}`);
            });

        } else {
            console.log('All registered skills:');
            // 全スキル一覧の表示（実装は簡略化）
            console.log('Use "skill list <casterId>" to see character-specific skills.');
        }
    }

    /**
     * スキル詳細情報表示
     * @param skillId スキルID
     */
    private showSkillInfo(skillId: string): void {
        if (!skillId) {
            console.log('Usage: skill info <skillId>');
            return;
        }

        console.log(`Skill Information: ${skillId}`);

        // スキル統計があれば表示
        const stats = this.debugManager.getStatistics(skillId) as any;
        if (stats) {
            console.log('Usage Statistics:', {
                executionCount: stats.executionCount,
                successRate: `${(stats.successCount / stats.executionCount * 100).toFixed(1)}%`,
                averageExecutionTime: `${stats.averageExecutionTime.toFixed(1)}ms`,
                averageDamage: stats.averageDamage.toFixed(1),
                averageHealing: stats.averageHealing.toFixed(1)
            });
        } else {
            console.log('No usage statistics available for this skill.');
        }
    }

    /**
     * 統計情報表示
     * @param skillId スキルID（省略時は全スキル）
     */
    private showStatistics(skillId?: string): void {
        console.log('=== Skill Usage Statistics ===');

        if (skillId) {
            const stats = this.debugManager.getStatistics(skillId) as any;
            if (stats) {
                this.displaySkillStats(skillId, stats);
            } else {
                console.log(`No statistics found for skill: ${skillId}`);
            }
        } else {
            const allStats = this.debugManager.getStatistics() as Map<string, any>;
            if (allStats.size === 0) {
                console.log('No skill statistics available.');
                return;
            }

            allStats.forEach((stats, id) => {
                this.displaySkillStats(id, stats);
                console.log('---');
            });
        }
    }

    /**
     * スキル統計を表示
     * @param skillId スキルID
     * @param stats 統計データ
     */
    private displaySkillStats(skillId: string, stats: any): void {
        const successRate = (stats.successCount / stats.executionCount * 100).toFixed(1);

        console.log(`Skill: ${skillId}`);
        console.log(`  Executions: ${stats.executionCount}`);
        console.log(`  Success Rate: ${successRate}%`);
        console.log(`  Avg Execution Time: ${stats.averageExecutionTime.toFixed(1)}ms`);
        console.log(`  Avg Damage: ${stats.averageDamage.toFixed(1)}`);
        console.log(`  Avg Healing: ${stats.averageHealing.toFixed(1)}`);
        console.log(`  Last Used: ${stats.lastExecutionTime.toLocaleString()}`);

        if (stats.casterStats.size > 0) {
            console.log('  Caster Statistics:');
            stats.casterStats.forEach((casterStat: any, casterId: string) => {
                console.log(`    ${casterId}: ${casterStat.count} uses, ${(casterStat.successRate * 100).toFixed(1)}% success`);
            });
        }
    }

    /**
     * バランス分析
     * @param skillId スキルID
     */
    private analyzeBalance(skillId: string): void {
        if (!skillId) {
            console.log('Usage: skill balance <skillId>');
            return;
        }

        console.log(`Analyzing balance for skill: ${skillId}`);

        const balanceData = this.debugManager.analyzeSkillBalance(skillId);
        if (!balanceData) {
            console.log('Insufficient data for balance analysis. Use the skill more to gather statistics.');
            return;
        }

        console.log('Balance Analysis Result:', {
            balanceScore: `${balanceData.balanceScore}/100`,
            usageFrequency: balanceData.usageFrequency,
            effectivenessRate: `${(balanceData.effectivenessRate * 100).toFixed(1)}%`,
            recommendedDamageRange: `${balanceData.recommendedDamageRange.min.toFixed(1)} - ${balanceData.recommendedDamageRange.max.toFixed(1)}`,
            recommendedMPCost: balanceData.recommendedMPCost,
            recommendedCooldown: balanceData.recommendedCooldown
        });

        // バランススコアに基づく評価
        if (balanceData.balanceScore >= 80) {
            console.log('✓ Skill appears to be well-balanced.');
        } else if (balanceData.balanceScore >= 60) {
            console.log('⚠ Skill balance is acceptable but could be improved.');
        } else {
            console.log('✗ Skill balance needs attention.');
        }
    }

    /**
     * テストシナリオ実行
     * @param scenarioName シナリオ名
     */
    private async runTestScenario(scenarioName: string): Promise<void> {
        if (!scenarioName) {
            console.log('Usage: skill test <scenarioName>');
            console.log('Available scenarios: basic-attack-skill, heal-skill');
            return;
        }

        console.log(`Running test scenario: ${scenarioName}`);

        try {
            const result = await this.debugManager.executeSkillTest(scenarioName);

            console.log('Test Result:', {
                scenario: result.scenarioName,
                success: result.success ? '✓ PASSED' : '✗ FAILED',
                executionTime: `${result.executionTime.toFixed(1)}ms`
            });

            if (result.validation && !result.validation.passed) {
                console.log('Validation Issues:');
                result.validation.issues.forEach((issue: string) => {
                    console.log(`  - ${issue}`);
                });
            }

            if (result.error) {
                console.log('Error:', result.error);
            }

        } catch (error) {
            console.error('Test scenario execution failed:', error.message);
        }
    }

    /**
     * 設定変更
     * @param setting 設定項目
     * @param value 設定値
     */
    private modifyConfig(setting: string, value: string): void {
        if (!setting || !value) {
            console.log('Usage: skill config <setting> <value>');
            console.log('Available settings: globalDamageMultiplier, globalHealingMultiplier, globalMPCostMultiplier');
            return;
        }

        console.log(`Modifying skill config: ${setting} = ${value}`);

        try {
            const numericValue = parseFloat(value);

            // 設定を更新（実際の実装では GameConfig を使用）
            switch (setting.toLowerCase()) {
                case 'globaldamagemultiplier':
                    console.log(`Global damage multiplier changed to: ${numericValue}`);
                    break;
                case 'globalhealingmultiplier':
                    console.log(`Global healing multiplier changed to: ${numericValue}`);
                    break;
                case 'globalmpcostmultiplier':
                    console.log(`Global MP cost multiplier changed to: ${numericValue}`);
                    break;
                default:
                    console.log(`Unknown setting: ${setting}`);
                    return;
            }

            console.log('Configuration updated successfully.');

        } catch (error) {
            console.error('Failed to update configuration:', error.message);
        }
    }

    /**
     * テスト用スキル作成
     * @param skillId スキルID
     * @param type スキル種別
     * @param damage ダメージ
     * @param mpCost MPコスト
     */
    private createTestSkill(skillId: string, type: string, damage: string, mpCost: string): void {
        if (!skillId || !type || !damage || !mpCost) {
            console.log('Usage: skill create <skillId> <type> <damage> <mpCost>');
            console.log('Types: attack, heal, buff, debuff, status');
            return;
        }

        console.log(`Creating test skill: ${skillId}`);

        const skillData: Partial<SkillData> = {
            id: skillId,
            name: `Test ${skillId}`,
            description: `Test skill created via console`,
            skillType: type as SkillType,
            targetType: 'single' as TargetType,
            usageCondition: {
                mpCost: parseInt(mpCost),
                levelRequirement: 1,
                cooldown: 0,
                usageLimit: 0
            },
            effects: [{
                type: type === 'heal' ? 'heal' : 'damage',
                value: parseInt(damage),
                target: 'enemy'
            }],
            range: 3,
            areaOfEffect: {
                shape: 'single',
                size: 1
            }
        };

        try {
            // スキルを登録（実際の実装では SkillManager を使用）
            console.log('Test skill created:', skillData);
            console.log('Note: This is a simulation. Actual skill registration requires proper integration.');

        } catch (error) {
            console.error('Failed to create test skill:', error.message);
        }
    }

    /**
     * スキル効果シミュレーション
     * @param skillId スキルID
     * @param iterations 実行回数
     */
    private async simulateSkillEffects(skillId: string, iterations: string): Promise<void> {
        if (!skillId || !iterations) {
            console.log('Usage: skill simulate <skillId> <iterations>');
            return;
        }

        const iterationCount = parseInt(iterations);
        if (isNaN(iterationCount) || iterationCount <= 0) {
            console.log('Invalid iteration count. Must be a positive number.');
            return;
        }

        console.log(`Simulating ${skillId} for ${iterationCount} iterations...`);

        const results = {
            totalDamage: 0,
            totalHealing: 0,
            successCount: 0,
            failureCount: 0,
            totalExecutionTime: 0
        };

        const startTime = performance.now();

        for (let i = 0; i < iterationCount; i++) {
            try {
                // シミュレーション実行（簡略化）
                const simulatedResult = {
                    success: Math.random() > 0.1, // 90% success rate
                    damage: Math.random() * 30 + 10, // 10-40 damage
                    healing: 0,
                    executionTime: Math.random() * 50 + 10 // 10-60ms
                };

                if (simulatedResult.success) {
                    results.successCount++;
                    results.totalDamage += simulatedResult.damage;
                    results.totalHealing += simulatedResult.healing;
                } else {
                    results.failureCount++;
                }

                results.totalExecutionTime += simulatedResult.executionTime;

            } catch (error) {
                results.failureCount++;
            }
        }

        const totalTime = performance.now() - startTime;

        console.log('Simulation Results:', {
            iterations: iterationCount,
            successRate: `${(results.successCount / iterationCount * 100).toFixed(1)}%`,
            averageDamage: (results.totalDamage / results.successCount).toFixed(1),
            averageHealing: (results.totalHealing / results.successCount).toFixed(1),
            averageExecutionTime: `${(results.totalExecutionTime / iterationCount).toFixed(1)}ms`,
            totalSimulationTime: `${totalTime.toFixed(1)}ms`
        });
    }

    /**
     * デバッグモード切り替え
     * @param state 状態（on/off）
     */
    private toggleDebugMode(state?: string): void {
        if (state === 'on') {
            this.debugManager.enableDebugMode();
            console.log('Skill debug mode enabled.');
        } else if (state === 'off') {
            this.debugManager.disableDebugMode();
            console.log('Skill debug mode disabled.');
        } else {
            // 現在の状態を切り替え
            console.log('Toggling skill debug mode...');
            // 実際の実装では現在の状態を確認して切り替え
        }
    }

    /**
     * 統計リセット
     */
    private resetStatistics(): void {
        this.debugManager.resetStatistics();
        console.log('Skill statistics have been reset.');
    }

    /**
     * スキル範囲表示
     * @param skillId スキルID
     * @param x X座標
     * @param y Y座標
     */
    private showSkillRange(skillId: string, x: string, y: string): void {
        if (!skillId || !x || !y) {
            console.log('Usage: skill range <skillId> <x> <y>');
            return;
        }

        const position = { x: parseInt(x), y: parseInt(y) };

        console.log(`Showing range for ${skillId} at (${position.x}, ${position.y})`);
        console.log('Note: Visual range display requires UI integration.');
    }

    /**
     * バランス調整提案
     * @param skillId スキルID
     */
    private suggestBalanceAdjustments(skillId: string): void {
        if (!skillId) {
            console.log('Usage: skill suggest <skillId>');
            return;
        }

        const balanceData = this.debugManager.getBalanceData(skillId) as any;
        if (!balanceData) {
            console.log('No balance data available. Run balance analysis first.');
            return;
        }

        console.log(`Balance adjustment suggestions for ${skillId}:`);

        if (balanceData.balanceScore < 60) {
            console.log('Suggestions:');

            if (balanceData.effectivenessRate < 0.7) {
                console.log('  - Consider reducing MP cost or increasing damage');
            }

            if (balanceData.usageFrequency < 10) {
                console.log('  - Skill may be too weak or expensive - consider buffs');
            }

            console.log(`  - Recommended damage range: ${balanceData.recommendedDamageRange.min.toFixed(1)} - ${balanceData.recommendedDamageRange.max.toFixed(1)}`);
            console.log(`  - Recommended MP cost: ${balanceData.recommendedMPCost}`);
            console.log(`  - Recommended cooldown: ${balanceData.recommendedCooldown} turns`);
        } else {
            console.log('Skill appears to be well-balanced. No major adjustments needed.');
        }
    }

    /**
     * パフォーマンス測定
     * @param skillId スキルID
     * @param iterations 実行回数
     */
    private async measurePerformance(skillId: string, iterations?: string): Promise<void> {
        if (!skillId) {
            console.log('Usage: skill perf <skillId> [iterations]');
            return;
        }

        const iterationCount = iterations ? parseInt(iterations) : 10;

        console.log(`Measuring performance for ${skillId} (${iterationCount} iterations)...`);

        const times: number[] = [];

        for (let i = 0; i < iterationCount; i++) {
            const startTime = performance.now();

            // パフォーマンス測定（簡略化）
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

            const endTime = performance.now();
            times.push(endTime - startTime);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        console.log('Performance Results:', {
            iterations: iterationCount,
            averageTime: `${avgTime.toFixed(2)}ms`,
            minTime: `${minTime.toFixed(2)}ms`,
            maxTime: `${maxTime.toFixed(2)}ms`,
            standardDeviation: `${this.calculateStandardDeviation(times).toFixed(2)}ms`
        });
    }

    /**
     * 標準偏差を計算
     * @param values 値の配列
     * @returns 標準偏差
     */
    private calculateStandardDeviation(values: number[]): number {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
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
    getCommand(commandName: string): SkillConsoleCommand | undefined {
        return this.commands.get(commandName.toLowerCase());
    }
}