import { Unit } from '../types/battle';
import { DamageCalculator } from '../systems/DamageCalculator';
import { AttackRangeCalculator } from '../systems/AttackRangeCalculator';
import { BattleSystem } from '../systems/BattleSystem';
import { GameConfig } from '../config/GameConfig';

/**
 * 戦闘統計データ
 */
export interface BattleStatistics {
    totalBattles: number;
    totalDamageDealt: number;
    totalDamageReceived: number;
    criticalHits: number;
    missedAttacks: number;
    averageDamage: number;
    criticalHitRate: number;
    hitRate: number;
    averageBattleDuration: number;
    unitsDefeated: number;
    experienceGained: number;
}

/**
 * 戦闘シミュレーション結果
 */
export interface BattleSimulationResult {
    attacker: Unit;
    target: Unit;
    damage: number;
    isCritical: boolean;
    isEvaded: boolean;
    hitChance: number;
    criticalChance: number;
    evasionChance: number;
    expectedDamage: number;
    simulationCount: number;
    statistics: {
        totalDamage: number;
        criticalHits: number;
        missedAttacks: number;
        averageDamage: number;
        criticalRate: number;
        hitRate: number;
    };
}

/**
 * バランス調整提案
 */
export interface BalanceRecommendation {
    type: 'damage' | 'critical' | 'evasion' | 'experience';
    severity: 'low' | 'medium' | 'high';
    description: string;
    currentValue: number;
    recommendedValue: number;
    reason: string;
}

/**
 * 戦闘バランス調整ツール
 * 戦闘システムの統計収集、シミュレーション、バランス分析を行う
 */
export class BattleBalanceTool {
    private statistics: BattleStatistics;
    private battleHistory: Array<{
        timestamp: number;
        attacker: string;
        target: string;
        damage: number;
        isCritical: boolean;
        isEvaded: boolean;
        duration: number;
    }>;
    private damageCalculator: DamageCalculator;
    private attackRangeCalculator: AttackRangeCalculator;
    private gameConfig: GameConfig;

    constructor() {
        this.statistics = this.initializeStatistics();
        this.battleHistory = [];
        this.damageCalculator = new DamageCalculator();
        this.attackRangeCalculator = new AttackRangeCalculator();
        this.gameConfig = new GameConfig();
    }

    /**
     * 統計データの初期化
     */
    private initializeStatistics(): BattleStatistics {
        return {
            totalBattles: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            criticalHits: 0,
            missedAttacks: 0,
            averageDamage: 0,
            criticalHitRate: 0,
            hitRate: 0,
            averageBattleDuration: 0,
            unitsDefeated: 0,
            experienceGained: 0,
        };
    }

    /**
     * 戦闘結果を記録
     */
    public recordBattle(
        attacker: Unit,
        target: Unit,
        damage: number,
        isCritical: boolean,
        isEvaded: boolean,
        duration: number
    ): void {
        // 統計更新
        this.statistics.totalBattles++;
        this.statistics.totalDamageDealt += damage;

        if (isCritical) {
            this.statistics.criticalHits++;
        }

        if (isEvaded) {
            this.statistics.missedAttacks++;
        }

        if (target.currentHP <= 0) {
            this.statistics.unitsDefeated++;
        }

        // 履歴記録
        this.battleHistory.push({
            timestamp: Date.now(),
            attacker: attacker.id,
            target: target.id,
            damage,
            isCritical,
            isEvaded,
            duration,
        });

        // 統計の再計算
        this.updateStatistics();

        // デバッグログ出力
        if (this.gameConfig.getBattleSystemConfig().showBattleStatistics) {
            console.log(`[BattleBalanceTool] Battle recorded:`, {
                attacker: attacker.name,
                target: target.name,
                damage,
                isCritical,
                isEvaded,
                duration: `${duration}ms`,
            });
        }
    }

    /**
     * 統計データの更新
     */
    private updateStatistics(): void {
        if (this.statistics.totalBattles === 0) return;

        this.statistics.averageDamage = this.statistics.totalDamageDealt / this.statistics.totalBattles;
        this.statistics.criticalHitRate = (this.statistics.criticalHits / this.statistics.totalBattles) * 100;
        this.statistics.hitRate = ((this.statistics.totalBattles - this.statistics.missedAttacks) / this.statistics.totalBattles) * 100;

        const totalDuration = this.battleHistory.reduce((sum, battle) => sum + battle.duration, 0);
        this.statistics.averageBattleDuration = totalDuration / this.statistics.totalBattles;
    }

    /**
     * 戦闘シミュレーション実行
     */
    public simulateBattle(
        attacker: Unit,
        target: Unit,
        simulationCount: number = 1000
    ): BattleSimulationResult {
        let totalDamage = 0;
        let criticalHits = 0;
        let missedAttacks = 0;

        // 基本確率計算
        const battleConfig = this.gameConfig.getBattleSystemConfig();
        const baseCriticalChance = battleConfig.balanceSettings.baseCriticalChance;
        const baseEvasionChance = battleConfig.balanceSettings.baseEvasionChance;

        // 実際の確率計算（キャラクター能力値を考慮）
        const criticalChance = Math.min(baseCriticalChance + (attacker.stats.luck || 0), 95);
        const evasionChance = Math.min(baseEvasionChance + (target.stats.agility || 0), 95);
        const hitChance = 100 - evasionChance;

        // シミュレーション実行
        for (let i = 0; i < simulationCount; i++) {
            const isEvaded = Math.random() * 100 < evasionChance;
            if (isEvaded) {
                missedAttacks++;
                continue;
            }

            const isCritical = Math.random() * 100 < criticalChance;
            if (isCritical) {
                criticalHits++;
            }

            const damage = this.damageCalculator.calculateBaseDamage(attacker, target, attacker.weapon);
            const finalDamage = isCritical
                ? damage * battleConfig.damageModifiers.criticalDamageMultiplier
                : damage;

            totalDamage += finalDamage;
        }

        const averageDamage = totalDamage / simulationCount;
        const expectedDamage = averageDamage * (hitChance / 100);

        return {
            attacker,
            target,
            damage: Math.round(averageDamage),
            isCritical: criticalHits > 0,
            isEvaded: missedAttacks > 0,
            hitChance,
            criticalChance,
            evasionChance,
            expectedDamage: Math.round(expectedDamage),
            simulationCount,
            statistics: {
                totalDamage,
                criticalHits,
                missedAttacks,
                averageDamage,
                criticalRate: (criticalHits / simulationCount) * 100,
                hitRate: ((simulationCount - missedAttacks) / simulationCount) * 100,
            },
        };
    }

    /**
     * バランス分析とおすすめ設定の生成
     */
    public analyzeBalance(): BalanceRecommendation[] {
        const recommendations: BalanceRecommendation[] = [];
        const config = this.gameConfig.getBattleSystemConfig();

        // ダメージバランス分析
        if (this.statistics.averageDamage > 100) {
            recommendations.push({
                type: 'damage',
                severity: 'high',
                description: '平均ダメージが高すぎます',
                currentValue: config.damageModifiers.globalDamageMultiplier,
                recommendedValue: config.damageModifiers.globalDamageMultiplier * 0.8,
                reason: `平均ダメージ ${this.statistics.averageDamage.toFixed(1)} は推奨値(50-80)を超えています`,
            });
        } else if (this.statistics.averageDamage < 20) {
            recommendations.push({
                type: 'damage',
                severity: 'medium',
                description: '平均ダメージが低すぎます',
                currentValue: config.damageModifiers.globalDamageMultiplier,
                recommendedValue: config.damageModifiers.globalDamageMultiplier * 1.2,
                reason: `平均ダメージ ${this.statistics.averageDamage.toFixed(1)} は推奨値(50-80)を下回っています`,
            });
        }

        // クリティカル率分析
        if (this.statistics.criticalHitRate > 20) {
            recommendations.push({
                type: 'critical',
                severity: 'medium',
                description: 'クリティカル率が高すぎます',
                currentValue: config.balanceSettings.baseCriticalChance,
                recommendedValue: Math.max(config.balanceSettings.baseCriticalChance - 5, 1),
                reason: `クリティカル率 ${this.statistics.criticalHitRate.toFixed(1)}% は推奨値(5-15%)を超えています`,
            });
        } else if (this.statistics.criticalHitRate < 3) {
            recommendations.push({
                type: 'critical',
                severity: 'low',
                description: 'クリティカル率が低すぎます',
                currentValue: config.balanceSettings.baseCriticalChance,
                recommendedValue: config.balanceSettings.baseCriticalChance + 3,
                reason: `クリティカル率 ${this.statistics.criticalHitRate.toFixed(1)}% は推奨値(5-15%)を下回っています`,
            });
        }

        // 命中率分析
        if (this.statistics.hitRate < 70) {
            recommendations.push({
                type: 'evasion',
                severity: 'high',
                description: '命中率が低すぎます',
                currentValue: config.balanceSettings.baseEvasionChance,
                recommendedValue: Math.max(config.balanceSettings.baseEvasionChance - 5, 0),
                reason: `命中率 ${this.statistics.hitRate.toFixed(1)}% は推奨値(75-90%)を下回っています`,
            });
        } else if (this.statistics.hitRate > 95) {
            recommendations.push({
                type: 'evasion',
                severity: 'medium',
                description: '命中率が高すぎます',
                currentValue: config.balanceSettings.baseEvasionChance,
                recommendedValue: config.balanceSettings.baseEvasionChance + 5,
                reason: `命中率 ${this.statistics.hitRate.toFixed(1)}% は推奨値(75-90%)を超えています`,
            });
        }

        return recommendations;
    }

    /**
     * 統計データの取得
     */
    public getStatistics(): BattleStatistics {
        return { ...this.statistics };
    }

    /**
     * 戦闘履歴の取得
     */
    public getBattleHistory(limit?: number): typeof this.battleHistory {
        if (limit) {
            return this.battleHistory.slice(-limit);
        }
        return [...this.battleHistory];
    }

    /**
     * 統計データのリセット
     */
    public resetStatistics(): void {
        this.statistics = this.initializeStatistics();
        this.battleHistory = [];
        console.log('[BattleBalanceTool] Statistics reset');
    }

    /**
     * 統計データをCSV形式でエクスポート
     */
    public exportStatisticsCSV(): string {
        const headers = [
            'timestamp',
            'attacker',
            'target',
            'damage',
            'isCritical',
            'isEvaded',
            'duration',
        ];

        const rows = this.battleHistory.map(battle => [
            new Date(battle.timestamp).toISOString(),
            battle.attacker,
            battle.target,
            battle.damage.toString(),
            battle.isCritical.toString(),
            battle.isEvaded.toString(),
            battle.duration.toString(),
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * 詳細な戦闘レポートの生成
     */
    public generateBattleReport(): string {
        const stats = this.statistics;
        const recommendations = this.analyzeBalance();

        let report = '=== 戦闘システム分析レポート ===\n\n';

        report += '【基本統計】\n';
        report += `総戦闘回数: ${stats.totalBattles}\n`;
        report += `総ダメージ: ${stats.totalDamageDealt}\n`;
        report += `平均ダメージ: ${stats.averageDamage.toFixed(1)}\n`;
        report += `クリティカル率: ${stats.criticalHitRate.toFixed(1)}%\n`;
        report += `命中率: ${stats.hitRate.toFixed(1)}%\n`;
        report += `平均戦闘時間: ${stats.averageBattleDuration.toFixed(0)}ms\n`;
        report += `撃破ユニット数: ${stats.unitsDefeated}\n\n`;

        if (recommendations.length > 0) {
            report += '【バランス調整提案】\n';
            recommendations.forEach((rec, index) => {
                report += `${index + 1}. [${rec.severity.toUpperCase()}] ${rec.description}\n`;
                report += `   現在値: ${rec.currentValue} → 推奨値: ${rec.recommendedValue}\n`;
                report += `   理由: ${rec.reason}\n\n`;
            });
        } else {
            report += '【バランス調整提案】\n';
            report += '現在のバランスは適切です。\n\n';
        }

        report += '【最近の戦闘履歴】\n';
        const recentBattles = this.getBattleHistory(10);
        recentBattles.forEach((battle, index) => {
            const time = new Date(battle.timestamp).toLocaleTimeString();
            const result = battle.isEvaded ? 'MISS' :
                battle.isCritical ? `CRIT ${battle.damage}` :
                    battle.damage.toString();
            report += `${index + 1}. ${time} ${battle.attacker} → ${battle.target}: ${result}\n`;
        });

        return report;
    }
}