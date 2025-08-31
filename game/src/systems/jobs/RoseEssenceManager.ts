/**
 * 薔薇の力管理システム
 * 
 * このクラスは薔薇の力の獲得・消費・履歴管理を行います。
 * 要件4.1-4.5に対応した機能を提供します。
 */

import {
    RoseEssenceData,
    RoseEssenceTransaction,
    RoseEssenceSource,
    RoseEssenceSourceType,
    RoseEssenceSourceConfig,
    JobSystemError
} from '../../types/job';

/**
 * ボスタイプの定義
 */
export enum BossType {
    MINOR_BOSS = 'minor_boss',
    MAJOR_BOSS = 'major_boss',
    CHAPTER_BOSS = 'chapter_boss',
    FINAL_BOSS = 'final_boss'
}

/**
 * 薔薇の力管理システムのメインクラス
 */
export class RoseEssenceManager {
    private roseEssenceAmount: number = 0;
    private totalEarned: number = 0;
    private totalSpent: number = 0;
    private essenceHistory: RoseEssenceTransaction[] = [];
    private sourceConfigs: Map<string, RoseEssenceSourceConfig> = new Map();
    private transactionIdCounter: number = 0;

    constructor(initialData?: Partial<RoseEssenceData>) {
        if (initialData) {
            this.initialize(initialData);
        } else {
            this.initializeDefaultSourceConfigs();
        }
    }

    /**
     * 薔薇の力管理システムを初期化
     * 
     * @param data 初期化データ
     */
    initialize(data: Partial<RoseEssenceData>): void {
        this.roseEssenceAmount = data.currentAmount || 0;
        this.totalEarned = data.totalEarned || 0;
        this.totalSpent = data.totalSpent || 0;

        // デフォルトの獲得源設定を初期化
        this.initializeDefaultSourceConfigs();

        // カスタム設定があれば上書き
        if (data.sources) {
            Object.entries(data.sources).forEach(([sourceType, config]) => {
                this.sourceConfigs.set(sourceType, config);
            });
        }

        console.log('RoseEssenceManager初期化完了:', {
            currentAmount: this.roseEssenceAmount,
            totalEarned: this.totalEarned,
            totalSpent: this.totalSpent,
        });
    }

    /**
     * デフォルトの獲得源設定を初期化
     * 要件4.1: ボス撃破時の薔薇の力獲得に対応
     */
    private initializeDefaultSourceConfigs(): void {
        // ボス種別ごとの基本獲得量設定
        this.sourceConfigs.set(BossType.MINOR_BOSS, {
            baseAmount: 5,
            difficultyMultiplier: 1.0,
            firstTimeBonus: 2
        });

        this.sourceConfigs.set(BossType.MAJOR_BOSS, {
            baseAmount: 10,
            difficultyMultiplier: 1.2,
            firstTimeBonus: 5
        });

        this.sourceConfigs.set(BossType.CHAPTER_BOSS, {
            baseAmount: 20,
            difficultyMultiplier: 1.5,
            firstTimeBonus: 10
        });

        this.sourceConfigs.set(BossType.FINAL_BOSS, {
            baseAmount: 50,
            difficultyMultiplier: 2.0,
            firstTimeBonus: 25
        });

        // その他の獲得源
        this.sourceConfigs.set(RoseEssenceSourceType.STAGE_CLEAR, {
            baseAmount: 1,
            difficultyMultiplier: 1.0,
            firstTimeBonus: 1
        });

        this.sourceConfigs.set(RoseEssenceSourceType.SPECIAL_EVENT, {
            baseAmount: 3,
            difficultyMultiplier: 1.0,
            firstTimeBonus: 0
        });
    }

    /**
     * 薔薇の力を獲得する
     * 要件4.1, 4.2: ボス撃破時の薔薇の力獲得と獲得量表示
     * 
     * @param amount 獲得量
     * @param source 獲得源情報
     * @param isFirstTime 初回撃破かどうか
     * @returns 実際の獲得量
     */
    addRoseEssence(amount: number, source: RoseEssenceSource, isFirstTime: boolean = false): number {
        if (amount <= 0) {
            throw new Error('獲得量は正の値である必要があります');
        }

        let actualAmount = amount;

        // 獲得源設定に基づく修正
        const sourceConfig = this.sourceConfigs.get(source.type);
        if (sourceConfig) {
            actualAmount = Math.floor(amount * sourceConfig.difficultyMultiplier);
            if (isFirstTime) {
                actualAmount += sourceConfig.firstTimeBonus;
            }
        }

        // 薔薇の力を追加
        this.roseEssenceAmount += actualAmount;
        this.totalEarned += actualAmount;

        // 取引履歴を記録
        const transaction: RoseEssenceTransaction = {
            id: this.generateTransactionId(),
            type: 'gain',
            amount: actualAmount,
            source: source,
            timestamp: new Date(),
            description: this.generateGainDescription(source, actualAmount, isFirstTime)
        };

        this.essenceHistory.push(transaction);

        console.log(`薔薇の力を${actualAmount}獲得しました (現在: ${this.roseEssenceAmount})`);

        return actualAmount;
    }

    /**
     * 薔薇の力を消費する
     * 要件4.4: 薔薇の力の使用と保有量からの差し引き
     * 
     * @param amount 消費量
     * @param purpose 使用目的
     * @param characterId 対象キャラクターID（オプション）
     * @returns 消費が成功したかどうか
     */
    consumeRoseEssence(amount: number, purpose: string, characterId?: string): boolean {
        if (amount <= 0) {
            throw new Error('消費量は正の値である必要があります');
        }

        // 要件4.5: 薔薇の力不足チェック
        if (!this.hasEnoughEssence(amount)) {
            console.warn(`薔薇の力が不足しています (必要: ${amount}, 現在: ${this.roseEssenceAmount})`);
            return false;
        }

        // 薔薇の力を消費
        this.roseEssenceAmount -= amount;
        this.totalSpent += amount;

        // 取引履歴を記録
        const transaction: RoseEssenceTransaction = {
            id: this.generateTransactionId(),
            type: 'spend',
            amount: amount,
            source: purpose,
            timestamp: new Date(),
            characterId: characterId,
            description: this.generateSpendDescription(purpose, amount, characterId)
        };

        this.essenceHistory.push(transaction);

        console.log(`薔薇の力を${amount}消費しました (残り: ${this.roseEssenceAmount})`);

        return true;
    }

    /**
     * 現在の薔薇の力残量を取得
     * 要件4.3: 薔薇の力残量の正確な表示
     * 
     * @returns 現在の薔薇の力残量
     */
    getCurrentRoseEssence(): number {
        return this.roseEssenceAmount;
    }

    /**
     * 薔薇の力の取引履歴を取得
     * 要件4.3: 薔薇の力取引履歴の記録
     * 
     * @param limit 取得する履歴の最大数（オプション）
     * @returns 取引履歴の配列
     */
    getEssenceHistory(limit?: number): RoseEssenceTransaction[] {
        const history = [...this.essenceHistory].reverse(); // 新しい順にソート
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * 薔薇の力が十分にあるかチェック
     * 要件4.4, 4.5: 薔薇の力不足チェック機能
     * 
     * @param requiredAmount 必要な薔薇の力
     * @returns 十分な薔薇の力があるかどうか
     */
    hasEnoughEssence(requiredAmount: number): boolean {
        return this.roseEssenceAmount >= requiredAmount;
    }

    /**
     * 薔薇の力獲得予測機能
     * 要件4.5: 薔薇の力獲得予測機能
     * 
     * @param bossType ボスタイプ
     * @param isFirstTime 初回撃破かどうか
     * @param difficultyModifier 難易度修正値（オプション）
     * @returns 予測獲得量
     */
    predictEssenceGain(bossType: BossType, isFirstTime: boolean = false, difficultyModifier: number = 1.0): number {
        const sourceConfig = this.sourceConfigs.get(bossType);
        if (!sourceConfig) {
            console.warn(`未知のボスタイプです: ${bossType}`);
            return 0;
        }

        let predictedAmount = Math.floor(sourceConfig.baseAmount * sourceConfig.difficultyMultiplier * difficultyModifier);

        if (isFirstTime) {
            predictedAmount += sourceConfig.firstTimeBonus;
        }

        return predictedAmount;
    }

    /**
     * 特定の獲得源からの総獲得量を取得
     * 
     * @param sourceType 獲得源タイプ
     * @returns 総獲得量
     */
    getTotalEssenceFromSource(sourceType: string): number {
        return this.essenceHistory
            .filter(transaction =>
                transaction.type === 'gain' &&
                (typeof transaction.source === 'object' ? transaction.source.type === sourceType : false)
            )
            .reduce((total, transaction) => total + transaction.amount, 0);
    }

    /**
     * 特定の用途での総消費量を取得
     * 
     * @param purpose 使用目的
     * @returns 総消費量
     */
    getTotalEssenceSpentOn(purpose: string): number {
        return this.essenceHistory
            .filter(transaction =>
                transaction.type === 'spend' &&
                transaction.source === purpose
            )
            .reduce((total, transaction) => total + transaction.amount, 0);
    }

    /**
     * 薔薇の力の統計情報を取得
     * 
     * @returns 統計情報オブジェクト
     */
    getEssenceStatistics(): {
        current: number;
        totalEarned: number;
        totalSpent: number;
        transactionCount: number;
        averageGain: number;
        averageSpend: number;
    } {
        const gainTransactions = this.essenceHistory.filter(t => t.type === 'gain');
        const spendTransactions = this.essenceHistory.filter(t => t.type === 'spend');

        return {
            current: this.roseEssenceAmount,
            totalEarned: this.totalEarned,
            totalSpent: this.totalSpent,
            transactionCount: this.essenceHistory.length,
            averageGain: gainTransactions.length > 0 ?
                gainTransactions.reduce((sum, t) => sum + t.amount, 0) / gainTransactions.length : 0,
            averageSpend: spendTransactions.length > 0 ?
                spendTransactions.reduce((sum, t) => sum + t.amount, 0) / spendTransactions.length : 0
        };
    }

    /**
     * 薔薇の力データをエクスポート（セーブ用）
     * 
     * @returns エクスポート用データ
     */
    exportData(): RoseEssenceData {
        const sources: { [sourceType: string]: RoseEssenceSourceConfig } = {};
        this.sourceConfigs.forEach((config, sourceType) => {
            sources[sourceType] = config;
        });

        return {
            currentAmount: this.roseEssenceAmount,
            totalEarned: this.totalEarned,
            totalSpent: this.totalSpent,
            sources: sources,
            costs: {
                rankUp: {
                    warrior: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    mage: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    archer: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    healer: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    thief: { 2: 10, 3: 20, 4: 40, 5: 80 },
                    special: { 2: 15, 3: 30, 4: 60, 5: 120 }
                },
                jobChange: 5,
                skillUnlock: 3
            }
        };
    }

    /**
     * 薔薇の力データをインポート（ロード用）
     * 
     * @param data インポートするデータ
     */
    importData(data: RoseEssenceData): void {
        this.roseEssenceAmount = data.currentAmount;
        this.totalEarned = data.totalEarned;
        this.totalSpent = data.totalSpent;

        // 獲得源設定を更新
        if (data.sources) {
            this.sourceConfigs.clear();
            Object.entries(data.sources).forEach(([sourceType, config]) => {
                this.sourceConfigs.set(sourceType, config);
            });
        }
    }

    /**
     * 薔薇の力履歴をクリア（デバッグ用）
     */
    clearHistory(): void {
        this.essenceHistory = [];
        console.log('薔薇の力履歴をクリアしました');
    }

    /**
     * 薔薇の力をリセット（デバッグ用）
     */
    reset(): void {
        this.roseEssenceAmount = 0;
        this.totalEarned = 0;
        this.totalSpent = 0;
        this.essenceHistory = [];
        this.transactionIdCounter = 0;
        console.log('薔薇の力データをリセットしました');
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * 取引IDを生成
     */
    private generateTransactionId(): string {
        return `rose_essence_${Date.now()}_${++this.transactionIdCounter}`;
    }

    /**
     * 獲得時の説明文を生成
     */
    private generateGainDescription(source: RoseEssenceSource, amount: number, isFirstTime: boolean): string {
        let description = '';

        if (typeof source === 'object') {
            switch (source.type) {
                case RoseEssenceSourceType.BOSS_DEFEAT:
                    description = `ボス「${source.bossId || '不明'}」を撃破`;
                    break;
                case RoseEssenceSourceType.STAGE_CLEAR:
                    description = `ステージ「${source.stageId || '不明'}」をクリア`;
                    break;
                case RoseEssenceSourceType.SPECIAL_EVENT:
                    description = `特別イベント「${source.eventId || '不明'}」`;
                    break;
                default:
                    description = `${source.type}から獲得`;
            }
        } else {
            description = `${source}から獲得`;
        }

        if (isFirstTime) {
            description += '（初回ボーナス込み）';
        }

        return `${description} - 薔薇の力 ${amount} 獲得`;
    }

    /**
     * 消費時の説明文を生成
     */
    private generateSpendDescription(purpose: string, amount: number, characterId?: string): string {
        let description = '';

        switch (purpose) {
            case 'rank_up':
                description = characterId ?
                    `キャラクター「${characterId}」の職業ランクアップ` :
                    '職業ランクアップ';
                break;
            case 'job_change':
                description = characterId ?
                    `キャラクター「${characterId}」の職業変更` :
                    '職業変更';
                break;
            case 'skill_unlock':
                description = characterId ?
                    `キャラクター「${characterId}」のスキル解放` :
                    'スキル解放';
                break;
            default:
                description = purpose;
        }

        return `${description} - 薔薇の力 ${amount} 消費`;
    }
}