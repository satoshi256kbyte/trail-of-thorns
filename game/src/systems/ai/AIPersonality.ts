/**
 * AI性格システム
 * AIキャラクターの性格特性と行動修正値を管理
 */

import {
    AIPersonality,
    AIPersonalityType,
    ActionType,
    AIContext
} from '../../types/ai';
import { Unit } from '../../types/gameplay';

/**
 * AI性格の基底クラス
 * 各性格タイプの共通機能を提供
 */
export abstract class BaseAIPersonality implements AIPersonality {
    public readonly type: AIPersonalityType;
    public readonly aggressiveness: number;
    public readonly defensiveness: number;
    public readonly supportiveness: number;
    public readonly tacticalness: number;
    public readonly riskTolerance: number;

    constructor(
        type: AIPersonalityType,
        aggressiveness: number,
        defensiveness: number,
        supportiveness: number,
        tacticalness: number,
        riskTolerance: number
    ) {
        this.type = type;
        this.aggressiveness = this.clampValue(aggressiveness);
        this.defensiveness = this.clampValue(defensiveness);
        this.supportiveness = this.clampValue(supportiveness);
        this.tacticalness = this.clampValue(tacticalness);
        this.riskTolerance = this.clampValue(riskTolerance);
    }

    /**
     * 値を0-1の範囲にクランプ
     */
    private clampValue(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    /**
     * 行動タイプ別の修正値を取得
     * @param actionType 行動タイプ
     * @returns 修正値（-1.0 ～ 1.0）
     */
    public getActionModifier(actionType: ActionType): number {
        switch (actionType) {
            case ActionType.ATTACK:
                return this.getAttackModifier();
            case ActionType.MOVE:
                return this.getMoveModifier();
            case ActionType.SKILL:
                return this.getSkillModifier();
            case ActionType.WAIT:
                return this.getWaitModifier();
            case ActionType.DEFEND:
                return this.getDefendModifier();
            default:
                return 0;
        }
    }

    /**
     * リスクを取るべきかの判定
     * @param riskLevel リスクレベル（0-1）
     * @returns リスクを取るべきかどうか
     */
    public shouldTakeRisk(riskLevel: number): boolean {
        // リスク許容度とランダム要素を組み合わせて判定
        const threshold = this.riskTolerance + (Math.random() - 0.5) * 0.2;
        return riskLevel <= threshold;
    }

    /**
     * ターゲット優先度修正値を取得
     * @param target 対象ユニット
     * @returns 優先度修正値（-1.0 ～ 1.0）
     */
    public getPriorityModifier(target: Unit): number {
        let modifier = 0;

        // HP比率による修正
        const hpRatio = target.currentHP / target.stats.maxHP;

        // 攻撃的性格は低HPの敵を優先
        if (this.aggressiveness > 0.5) {
            modifier += (1 - hpRatio) * this.aggressiveness * 0.3;
        }

        // 防御的性格は脅威度の高い敵を優先
        if (this.defensiveness > 0.5) {
            const threatLevel = this.calculateThreatLevel(target);
            modifier += threatLevel * this.defensiveness * 0.2;
        }

        // 戦術的性格は位置や能力を考慮
        if (this.tacticalness > 0.5) {
            const tacticalValue = this.calculateTacticalValue(target);
            modifier += tacticalValue * this.tacticalness * 0.25;
        }

        return this.clampValue(modifier);
    }

    /**
     * 攻撃行動の修正値を計算
     */
    protected getAttackModifier(): number {
        return (this.aggressiveness - this.defensiveness) * 0.5;
    }

    /**
     * 移動行動の修正値を計算
     */
    protected getMoveModifier(): number {
        return (this.tacticalness - this.aggressiveness * 0.3) * 0.4;
    }

    /**
     * スキル使用の修正値を計算
     */
    protected getSkillModifier(): number {
        return (this.tacticalness + this.supportiveness) * 0.3;
    }

    /**
     * 待機行動の修正値を計算
     */
    protected getWaitModifier(): number {
        return (this.defensiveness - this.aggressiveness) * 0.3;
    }

    /**
     * 防御行動の修正値を計算
     */
    protected getDefendModifier(): number {
        return this.defensiveness * 0.6;
    }

    /**
     * ターゲットの脅威レベルを計算
     */
    private calculateThreatLevel(target: Unit): number {
        // 攻撃力、速度、残りHPを考慮した脅威度
        const attackThreat = target.stats.attack / 100; // 正規化
        const speedThreat = target.stats.speed / 100; // 正規化
        const hpRatio = target.currentHP / target.stats.maxHP;

        return (attackThreat * 0.4 + speedThreat * 0.3 + hpRatio * 0.3);
    }

    /**
     * ターゲットの戦術的価値を計算
     */
    private calculateTacticalValue(target: Unit): number {
        // 位置、能力、役割を考慮した戦術的価値
        let value = 0;

        // 支援系キャラクターは戦術的価値が高い
        if (target.stats.maxMP > 0) {
            value += 0.3;
        }

        // 高速キャラクターは戦術的価値が高い
        if (target.stats.speed > 15) {
            value += 0.2;
        }

        // 低防御キャラクターは狙いやすい
        if (target.stats.defense < 10) {
            value += 0.2;
        }

        return Math.min(1, value);
    }
}

/**
 * 攻撃的AI性格
 * 積極的な攻撃を好み、リスクを恐れない
 */
export class AggressivePersonality extends BaseAIPersonality {
    constructor() {
        super(
            AIPersonalityType.AGGRESSIVE,
            0.9,  // 高い攻撃性
            0.2,  // 低い防御性
            0.3,  // 低い支援性
            0.5,  // 中程度の戦術性
            0.8   // 高いリスク許容度
        );
    }

    protected getAttackModifier(): number {
        // 攻撃的性格は攻撃行動により大きなボーナス
        return this.aggressiveness * 0.7;
    }

    protected getMoveModifier(): number {
        // 前進的な移動を好む
        return this.aggressiveness * 0.4;
    }
}

/**
 * 防御的AI性格
 * 慎重な行動を好み、安全を重視
 */
export class DefensivePersonality extends BaseAIPersonality {
    constructor() {
        super(
            AIPersonalityType.DEFENSIVE,
            0.3,  // 低い攻撃性
            0.9,  // 高い防御性
            0.4,  // 中程度の支援性
            0.6,  // 中程度の戦術性
            0.2   // 低いリスク許容度
        );
    }

    protected getDefendModifier(): number {
        // 防御的性格は防御行動により大きなボーナス
        return this.defensiveness * 0.8;
    }

    protected getWaitModifier(): number {
        // 様子見を好む
        return this.defensiveness * 0.5;
    }

    public shouldTakeRisk(riskLevel: number): boolean {
        // より慎重なリスク判定
        const threshold = this.riskTolerance * 0.7;
        return riskLevel <= threshold;
    }
}

/**
 * 支援AI性格
 * 味方のサポートを重視し、チームプレイを好む
 */
export class SupportPersonality extends BaseAIPersonality {
    constructor() {
        super(
            AIPersonalityType.SUPPORT,
            0.4,  // 中程度の攻撃性
            0.6,  // 中程度の防御性
            0.9,  // 高い支援性
            0.7,  // 高い戦術性
            0.4   // 中程度のリスク許容度
        );
    }

    protected getSkillModifier(): number {
        // 支援性格はスキル使用により大きなボーナス
        return (this.supportiveness + this.tacticalness) * 0.5;
    }

    public getPriorityModifier(target: Unit): number {
        let modifier = super.getPriorityModifier(target);

        // 味方の場合は支援優先度を上げる
        if (target.faction === 'player') {
            const hpRatio = target.currentHP / target.stats.maxHP;
            if (hpRatio < 0.5) {
                modifier += this.supportiveness * 0.4;
            }
        }

        return this.clampValue(modifier);
    }
}

/**
 * 戦術的AI性格
 * 戦略的思考を重視し、効率的な行動を好む
 */
export class TacticalPersonality extends BaseAIPersonality {
    constructor() {
        super(
            AIPersonalityType.TACTICAL,
            0.6,  // 中程度の攻撃性
            0.5,  // 中程度の防御性
            0.5,  // 中程度の支援性
            0.9,  // 高い戦術性
            0.6   // 中程度のリスク許容度
        );
    }

    protected getMoveModifier(): number {
        // 戦術的性格は位置取りを重視
        return this.tacticalness * 0.6;
    }

    protected getSkillModifier(): number {
        // 効果的なスキル使用を好む
        return this.tacticalness * 0.5;
    }

    public shouldTakeRisk(riskLevel: number): boolean {
        // 計算されたリスクを取る
        const expectedValue = this.calculateExpectedValue(riskLevel);
        return expectedValue > 0.5;
    }

    /**
     * リスクの期待値を計算
     */
    private calculateExpectedValue(riskLevel: number): number {
        // 戦術的性格は期待値に基づいてリスクを判定
        const successProbability = 1 - riskLevel;
        const reward = 1.0; // 成功時の報酬
        const penalty = -0.5; // 失敗時のペナルティ

        return successProbability * reward + riskLevel * penalty;
    }
}

/**
 * バランス型AI性格
 * 全ての要素をバランス良く持つ汎用的な性格
 */
export class BalancedPersonality extends BaseAIPersonality {
    constructor() {
        super(
            AIPersonalityType.BALANCED,
            0.5,  // 中程度の攻撃性
            0.5,  // 中程度の防御性
            0.5,  // 中程度の支援性
            0.5,  // 中程度の戦術性
            0.5   // 中程度のリスク許容度
        );
    }

    public getActionModifier(actionType: ActionType): number {
        // バランス型は状況に応じて修正値を調整
        const baseModifier = super.getActionModifier(actionType);

        // 状況に応じた微調整（実装時にコンテキストを考慮）
        return baseModifier * 0.8; // やや控えめな修正
    }
}

/**
 * AI性格ファクトリー
 * 性格タイプに基づいてAIPersonalityインスタンスを生成
 */
export class AIPersonalityFactory {
    /**
     * 性格タイプに基づいてAIPersonalityを作成
     * @param type 性格タイプ
     * @returns AIPersonalityインスタンス
     */
    public static create(type: AIPersonalityType): AIPersonality {
        switch (type) {
            case AIPersonalityType.AGGRESSIVE:
                return new AggressivePersonality();
            case AIPersonalityType.DEFENSIVE:
                return new DefensivePersonality();
            case AIPersonalityType.SUPPORT:
                return new SupportPersonality();
            case AIPersonalityType.TACTICAL:
                return new TacticalPersonality();
            case AIPersonalityType.BALANCED:
                return new BalancedPersonality();
            default:
                return new BalancedPersonality();
        }
    }

    /**
     * カスタム性格を作成
     * @param params 性格パラメータ
     * @returns AIPersonalityインスタンス
     */
    public static createCustom(params: {
        aggressiveness: number;
        defensiveness: number;
        supportiveness: number;
        tacticalness: number;
        riskTolerance: number;
    }): AIPersonality {
        return new (class extends BaseAIPersonality {
            constructor() {
                super(
                    AIPersonalityType.BALANCED,
                    params.aggressiveness,
                    params.defensiveness,
                    params.supportiveness,
                    params.tacticalness,
                    params.riskTolerance
                );
            }
        })();
    }

    /**
     * ランダムな性格を生成
     * @returns ランダムなAIPersonalityインスタンス
     */
    public static createRandom(): AIPersonality {
        const types = Object.values(AIPersonalityType);
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.create(randomType);
    }
}

/**
 * AI性格管理システム
 * 複数のAI性格を管理し、動的な変更をサポート
 */
export class AIPersonalityManager {
    private personalities: Map<string, AIPersonality> = new Map();
    private personalityHistory: Map<string, AIPersonalityType[]> = new Map();

    /**
     * キャラクターに性格を割り当て
     * @param characterId キャラクターID
     * @param personality AI性格
     */
    public assignPersonality(characterId: string, personality: AIPersonality): void {
        this.personalities.set(characterId, personality);

        // 履歴を記録
        if (!this.personalityHistory.has(characterId)) {
            this.personalityHistory.set(characterId, []);
        }
        this.personalityHistory.get(characterId)!.push(personality.type);
    }

    /**
     * キャラクターの性格を取得
     * @param characterId キャラクターID
     * @returns AI性格（存在しない場合はバランス型）
     */
    public getPersonality(characterId: string): AIPersonality {
        return this.personalities.get(characterId) || AIPersonalityFactory.create(AIPersonalityType.BALANCED);
    }

    /**
     * 性格を動的に変更
     * @param characterId キャラクターID
     * @param newType 新しい性格タイプ
     */
    public changePersonality(characterId: string, newType: AIPersonalityType): void {
        const newPersonality = AIPersonalityFactory.create(newType);
        this.assignPersonality(characterId, newPersonality);
    }

    /**
     * 性格の履歴を取得
     * @param characterId キャラクターID
     * @returns 性格変更履歴
     */
    public getPersonalityHistory(characterId: string): AIPersonalityType[] {
        return this.personalityHistory.get(characterId) || [];
    }

    /**
     * 全ての性格を取得
     * @returns 全キャラクターの性格マップ
     */
    public getAllPersonalities(): Map<string, AIPersonality> {
        return new Map(this.personalities);
    }

    /**
     * 性格を削除
     * @param characterId キャラクターID
     */
    public removePersonality(characterId: string): void {
        this.personalities.delete(characterId);
        this.personalityHistory.delete(characterId);
    }

    /**
     * 全ての性格をクリア
     */
    public clear(): void {
        this.personalities.clear();
        this.personalityHistory.clear();
    }
}