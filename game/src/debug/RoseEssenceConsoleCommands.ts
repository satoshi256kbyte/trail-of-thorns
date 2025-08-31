/**
 * 薔薇の力システム用コンソールコマンド
 * 
 * 開発・デバッグ用のコンソールコマンドを提供します。
 */

import { RoseEssenceManager, BossType } from '../systems/jobs/RoseEssenceManager';
import { RoseEssenceSource, RoseEssenceSourceType } from '../types/job';

/**
 * 薔薇の力システム用コンソールコマンドクラス
 */
export class RoseEssenceConsoleCommands {
    private roseEssenceManager: RoseEssenceManager;

    constructor(roseEssenceManager: RoseEssenceManager) {
        this.roseEssenceManager = roseEssenceManager;
    }

    /**
     * コンソールコマンドを登録
     */
    registerCommands(): void {
        if (typeof window !== 'undefined') {
            // グローバルオブジェクトに薔薇の力コマンドを追加
            (window as any).roseEssence = {
                // 薔薇の力獲得
                add: (amount: number, sourceType: string = 'debug', sourceId: string = 'console') => {
                    return this.addRoseEssence(amount, sourceType, sourceId);
                },

                // 薔薇の力消費
                spend: (amount: number, purpose: string = 'debug', characterId?: string) => {
                    return this.spendRoseEssence(amount, purpose, characterId);
                },

                // 現在の薔薇の力表示
                show: () => {
                    return this.showCurrentEssence();
                },

                // 履歴表示
                history: (limit?: number) => {
                    return this.showHistory(limit);
                },

                // 統計表示
                stats: () => {
                    return this.showStatistics();
                },

                // ボス撃破シミュレーション
                defeatBoss: (bossType: string, isFirstTime: boolean = false) => {
                    return this.simulateBossDefeat(bossType, isFirstTime);
                },

                // 獲得予測
                predict: (bossType: string, isFirstTime: boolean = false, difficultyModifier: number = 1.0) => {
                    return this.predictGain(bossType, isFirstTime, difficultyModifier);
                },

                // データリセット
                reset: () => {
                    return this.resetData();
                },

                // 履歴クリア
                clearHistory: () => {
                    return this.clearHistory();
                },

                // ヘルプ表示
                help: () => {
                    return this.showHelp();
                }
            };

            console.log('薔薇の力デバッグコマンドが登録されました。roseEssence.help() でヘルプを表示できます。');
        }
    }

    /**
     * 薔薇の力を追加
     */
    private addRoseEssence(amount: number, sourceType: string, sourceId: string): string {
        try {
            const source: RoseEssenceSource = {
                type: sourceType as RoseEssenceSourceType,
                sourceId: sourceId
            };

            const gained = this.roseEssenceManager.addRoseEssence(amount, source);
            return `薔薇の力 ${gained} を獲得しました。現在: ${this.roseEssenceManager.getCurrentRoseEssence()}`;
        } catch (error) {
            return `エラー: ${error}`;
        }
    }

    /**
     * 薔薇の力を消費
     */
    private spendRoseEssence(amount: number, purpose: string, characterId?: string): string {
        try {
            const success = this.roseEssenceManager.consumeRoseEssence(amount, purpose, characterId);
            if (success) {
                return `薔薇の力 ${amount} を消費しました。残り: ${this.roseEssenceManager.getCurrentRoseEssence()}`;
            } else {
                return `薔薇の力が不足しています。必要: ${amount}, 現在: ${this.roseEssenceManager.getCurrentRoseEssence()}`;
            }
        } catch (error) {
            return `エラー: ${error}`;
        }
    }

    /**
     * 現在の薔薇の力を表示
     */
    private showCurrentEssence(): string {
        const current = this.roseEssenceManager.getCurrentRoseEssence();
        return `現在の薔薇の力: ${current}`;
    }

    /**
     * 履歴を表示
     */
    private showHistory(limit?: number): void {
        const history = this.roseEssenceManager.getEssenceHistory(limit);

        console.log('=== 薔薇の力取引履歴 ===');
        if (history.length === 0) {
            console.log('履歴がありません');
            return;
        }

        history.forEach((transaction, index) => {
            const date = transaction.timestamp.toLocaleString();
            const type = transaction.type === 'gain' ? '獲得' : '消費';
            const sign = transaction.type === 'gain' ? '+' : '-';

            console.log(`${index + 1}. [${date}] ${type}: ${sign}${transaction.amount}`);
            console.log(`   ${transaction.description}`);
            if (transaction.characterId) {
                console.log(`   キャラクター: ${transaction.characterId}`);
            }
        });
    }

    /**
     * 統計情報を表示
     */
    private showStatistics(): void {
        const stats = this.roseEssenceManager.getEssenceStatistics();

        console.log('=== 薔薇の力統計情報 ===');
        console.log(`現在の薔薇の力: ${stats.current}`);
        console.log(`総獲得量: ${stats.totalEarned}`);
        console.log(`総消費量: ${stats.totalSpent}`);
        console.log(`取引回数: ${stats.transactionCount}`);
        console.log(`平均獲得量: ${stats.averageGain.toFixed(1)}`);
        console.log(`平均消費量: ${stats.averageSpend.toFixed(1)}`);
    }

    /**
     * ボス撃破をシミュレーション
     */
    private simulateBossDefeat(bossType: string, isFirstTime: boolean): string {
        try {
            // ボスタイプの変換
            let actualBossType: BossType;
            switch (bossType.toLowerCase()) {
                case 'minor':
                case 'minor_boss':
                    actualBossType = BossType.MINOR_BOSS;
                    break;
                case 'major':
                case 'major_boss':
                    actualBossType = BossType.MAJOR_BOSS;
                    break;
                case 'chapter':
                case 'chapter_boss':
                    actualBossType = BossType.CHAPTER_BOSS;
                    break;
                case 'final':
                case 'final_boss':
                    actualBossType = BossType.FINAL_BOSS;
                    break;
                default:
                    return `不明なボスタイプ: ${bossType}。使用可能: minor, major, chapter, final`;
            }

            // 予測獲得量を計算
            const predicted = this.roseEssenceManager.predictEssenceGain(actualBossType, isFirstTime);

            // 実際に獲得
            const source: RoseEssenceSource = {
                type: actualBossType,
                sourceId: `debug_${actualBossType}`,
                bossId: `debug_${actualBossType}_${Date.now()}`
            };

            const gained = this.roseEssenceManager.addRoseEssence(predicted, source, isFirstTime);

            return `${bossType}ボスを撃破！薔薇の力 ${gained} を獲得しました。現在: ${this.roseEssenceManager.getCurrentRoseEssence()}`;
        } catch (error) {
            return `エラー: ${error}`;
        }
    }

    /**
     * 獲得予測を表示
     */
    private predictGain(bossType: string, isFirstTime: boolean, difficultyModifier: number): string {
        try {
            let actualBossType: BossType;
            switch (bossType.toLowerCase()) {
                case 'minor':
                case 'minor_boss':
                    actualBossType = BossType.MINOR_BOSS;
                    break;
                case 'major':
                case 'major_boss':
                    actualBossType = BossType.MAJOR_BOSS;
                    break;
                case 'chapter':
                case 'chapter_boss':
                    actualBossType = BossType.CHAPTER_BOSS;
                    break;
                case 'final':
                case 'final_boss':
                    actualBossType = BossType.FINAL_BOSS;
                    break;
                default:
                    return `不明なボスタイプ: ${bossType}`;
            }

            const predicted = this.roseEssenceManager.predictEssenceGain(actualBossType, isFirstTime, difficultyModifier);

            let message = `${bossType}ボス撃破時の予測獲得量: ${predicted}`;
            if (isFirstTime) {
                message += ' (初回ボーナス込み)';
            }
            if (difficultyModifier !== 1.0) {
                message += ` (難易度修正: x${difficultyModifier})`;
            }

            return message;
        } catch (error) {
            return `エラー: ${error}`;
        }
    }

    /**
     * データをリセット
     */
    private resetData(): string {
        this.roseEssenceManager.reset();
        return '薔薇の力データをリセットしました';
    }

    /**
     * 履歴をクリア
     */
    private clearHistory(): string {
        this.roseEssenceManager.clearHistory();
        return '薔薇の力履歴をクリアしました';
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        console.log('=== 薔薇の力デバッグコマンド ===');
        console.log('roseEssence.add(amount, sourceType?, sourceId?) - 薔薇の力を追加');
        console.log('roseEssence.spend(amount, purpose?, characterId?) - 薔薇の力を消費');
        console.log('roseEssence.show() - 現在の薔薇の力を表示');
        console.log('roseEssence.history(limit?) - 取引履歴を表示');
        console.log('roseEssence.stats() - 統計情報を表示');
        console.log('roseEssence.defeatBoss(bossType, isFirstTime?) - ボス撃破をシミュレーション');
        console.log('  - bossType: minor, major, chapter, final');
        console.log('roseEssence.predict(bossType, isFirstTime?, difficultyModifier?) - 獲得予測');
        console.log('roseEssence.reset() - データをリセット');
        console.log('roseEssence.clearHistory() - 履歴をクリア');
        console.log('roseEssence.help() - このヘルプを表示');
        console.log('');
        console.log('使用例:');
        console.log('roseEssence.add(50) - 薔薇の力50を追加');
        console.log('roseEssence.defeatBoss("major", true) - メジャーボスを初回撃破');
        console.log('roseEssence.spend(20, "rank_up", "hero_001") - ランクアップで20消費');
    }
}