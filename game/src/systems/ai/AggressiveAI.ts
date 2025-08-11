/**
 * AggressiveAI - 攻撃的AI行動パターン
 *
 * このモジュールは以下を提供します：
 * - 最も近い敵への攻撃優先
 * - 積極的な前進行動
 * - 高リスク・高リターンの戦術選択
 * - 攻撃機会の最大化
 */

import { AIController } from '../AIController';
import { ActionEvaluator, ActionEvaluation } from '../ActionEvaluator';
import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonality,
    AIPersonalityType,
    DifficultySettings,
    AIControllerConfig,
    AISystemIntegration,
} from '../../types/ai';
import { Unit, Position } from '../../types/gameplay';

/**
 * 攻撃的AI性格の実装
 */
export class AggressivePersonality implements AIPersonality {
    public readonly type = AIPersonalityType.AGGRESSIVE;
    public readonly aggressiveness = 0.9;
    public readonly defensiveness = 0.2;
    public readonly supportiveness = 0.1;
    public readonly tacticalness = 0.6;
    public readonly riskTolerance = 0.8;

    public getActionModifier(actionType: AIActionType): number {
        switch (actionType) {
            case AIActionType.ATTACK:
                return 1.5; // 攻撃行動を大幅に優遇
            case AIActionType.MOVE:
                return 1.2; // 積極的な移動を優遇
            case AIActionType.SKILL:
                return 1.3; // 攻撃的スキルを優遇
            case AIActionType.WAIT:
                return 0.3; // 待機を大幅に減点
            default:
                return 1.0;
        }
    }

    public shouldTakeRisk(riskLevel: number): boolean {
        // 高いリスクでも積極的に取る
        return riskLevel <= this.riskTolerance;
    }

    public getPriorityModifier(target: Unit): number {
        let modifier = 1.0;

        // 低HPの敵を優先（とどめを刺す）
        const healthRatio = target.currentHP / target.stats.maxHP;
        if (healthRatio < 0.3) {
            modifier += 0.5;
        }

        // 攻撃力の高い敵を優先（脅威を排除）
        const attackRatio = target.stats.attack / 100; // 正規化
        modifier += attackRatio * 0.3;

        return modifier;
    }
}

/**
 * 攻撃的AIコントローラー
 */
export class AggressiveAI extends AIController {
    private actionEvaluator: ActionEvaluator;

    constructor(
        unit: Unit,
        difficultySettings: DifficultySettings,
        config: AIControllerConfig,
        integration: AISystemIntegration = {}
    ) {
        const personality = new AggressivePersonality();
        super(unit, personality, difficultySettings, config, integration);
        this.actionEvaluator = new ActionEvaluator(integration, difficultySettings);
    }

    /**
     * 攻撃的AIの行動決定
     * @param context 現在のゲームコンテキスト
     * @returns 選択された行動
     */
    protected async makeDecision(context: AIContext): Promise<AIAction> {
        const validActions = this.getValidActions(context);

        if (validActions.length === 0) {
            return this.createWaitAction('No valid actions available');
        }

        // 攻撃的AIの行動優先順位
        const evaluatedActions = await this.evaluateActionsAggressively(validActions, context);

        // 最高評価の行動を選択
        const bestAction = this.selectBestAction(evaluatedActions, context);

        return bestAction;
    }

    /**
     * 攻撃的な観点から行動を評価
     * @param actions 評価対象の行動リスト
     * @param context 現在のゲームコンテキスト
     * @returns 評価済み行動リスト
     */
    private async evaluateActionsAggressively(
        actions: AIAction[],
        context: AIContext
    ): Promise<ActionEvaluation[]> {
        const evaluations: ActionEvaluation[] = [];

        for (const action of actions) {
            let evaluation: ActionEvaluation;

            switch (action.type) {
                case AIActionType.ATTACK:
                    evaluation = await this.evaluateAttackAction(action, context);
                    break;
                case AIActionType.MOVE:
                    evaluation = await this.evaluateMoveAction(action, context);
                    break;
                case AIActionType.SKILL:
                    evaluation = await this.evaluateSkillAction(action, context);
                    break;
                case AIActionType.WAIT:
                    evaluation = await this.evaluateWaitAction(action, context);
                    break;
                default:
                    evaluation = this.createDefaultEvaluation(action);
            }

            // 攻撃的性格による修正を適用
            evaluation = this.applyAggressiveModifiers(evaluation, context);
            evaluations.push(evaluation);
        }

        return evaluations;
    }

    /**
     * 攻撃行動の評価
     * @param action 攻撃行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateAttackAction(action: AIAction, context: AIContext): Promise<ActionEvaluation> {
        if (!action.target) {
            return this.createDefaultEvaluation(action);
        }

        const baseEvaluation = this.actionEvaluator.evaluateAttack(
            this.unit,
            action.target,
            context
        );

        // 攻撃的AIの追加評価要素
        let aggressiveBonus = 0;

        // 最も近い敵への攻撃を優遇
        const nearestEnemy = this.findNearestEnemy(context);
        if (nearestEnemy && action.target.id === nearestEnemy.id) {
            aggressiveBonus += 20;
        }

        // 複数の敵を攻撃できる場合のボーナス
        const potentialTargets = this.countPotentialTargetsFromPosition(
            this.unit.position,
            context
        );
        aggressiveBonus += Math.min(15, potentialTargets * 5);

        // 一撃で倒せる敵への攻撃を大幅優遇
        if (this.canOneShot(this.unit, action.target)) {
            aggressiveBonus += 30;
        }

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: baseEvaluation.score + aggressiveBonus,
            tacticalScore: baseEvaluation.tacticalScore + aggressiveBonus * 0.7,
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + aggressiveBonus,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * 移動行動の評価
     * @param action 移動行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateMoveAction(action: AIAction, context: AIContext): Promise<ActionEvaluation> {
        if (!action.position) {
            return this.createDefaultEvaluation(action);
        }

        const baseEvaluation = this.actionEvaluator.evaluateMove(
            this.unit.position,
            action.position,
            context
        );

        // 攻撃的AIの移動評価要素
        let aggressiveBonus = 0;

        // 敵に近づく移動を優遇
        const currentDistanceToNearestEnemy = this.getDistanceToNearestEnemy(
            this.unit.position,
            context
        );
        const newDistanceToNearestEnemy = this.getDistanceToNearestEnemy(
            action.position,
            context
        );

        if (newDistanceToNearestEnemy < currentDistanceToNearestEnemy) {
            aggressiveBonus += 15; // 敵に近づく移動を優遇
        }

        // 攻撃範囲に敵が入る位置への移動を大幅優遇
        const enemiesInRangeAfterMove = this.countEnemiesInAttackRange(
            action.position,
            context
        );
        aggressiveBonus += enemiesInRangeAfterMove * 10;

        // 複数の敵を攻撃できる位置への移動を優遇
        if (enemiesInRangeAfterMove >= 2) {
            aggressiveBonus += 20;
        }

        // 前線への移動を優遇
        const frontlineBonus = this.evaluateFrontlinePosition(action.position, context);
        aggressiveBonus += frontlineBonus;

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: baseEvaluation.score + aggressiveBonus,
            tacticalScore: baseEvaluation.tacticalScore + aggressiveBonus * 0.8,
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + aggressiveBonus,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * スキル行動の評価
     * @param action スキル行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateSkillAction(action: AIAction, context: AIContext): Promise<ActionEvaluation> {
        if (!action.skillId) {
            return this.createDefaultEvaluation(action);
        }

        const baseEvaluation = this.actionEvaluator.evaluateSkillUse(
            action.skillId,
            action.target,
            context
        );

        // 攻撃的AIのスキル評価要素
        let aggressiveBonus = 0;

        // 攻撃系スキルを優遇
        if (this.isOffensiveSkill(action.skillId)) {
            aggressiveBonus += 15;
        }

        // 複数の敵に影響するスキルを優遇
        const affectedEnemies = this.countAffectedEnemies(action.skillId, action.target, context);
        aggressiveBonus += Math.min(25, affectedEnemies * 8);

        // 高ダメージスキルを優遇
        if (this.isHighDamageSkill(action.skillId)) {
            aggressiveBonus += 20;
        }

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: baseEvaluation.score + aggressiveBonus,
            tacticalScore: baseEvaluation.tacticalScore + aggressiveBonus * 0.9,
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + aggressiveBonus,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * 待機行動の評価
     * @param action 待機行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateWaitAction(action: AIAction, context: AIContext): Promise<ActionEvaluation> {
        const baseEvaluation = this.actionEvaluator.evaluateWait(context);

        // 攻撃的AIは待機を嫌う
        const aggressivePenalty = -20;

        // ただし、戦術的に有利な場合は例外
        let tacticalBonus = 0;

        // 敵が射程に入ってくるのを待つ場合
        if (this.shouldWaitForEnemyApproach(context)) {
            tacticalBonus += 10;
        }

        // 味方の支援を待つ場合
        if (this.shouldWaitForAllySupport(context)) {
            tacticalBonus += 5;
        }

        const totalModifier = aggressivePenalty + tacticalBonus;

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: Math.max(0, baseEvaluation.score + totalModifier),
            tacticalScore: Math.max(0, baseEvaluation.tacticalScore + totalModifier),
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + totalModifier,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * 攻撃的修正を適用
     * @param evaluation 基本評価
     * @param context ゲームコンテキスト
     * @returns 修正済み評価
     */
    private applyAggressiveModifiers(
        evaluation: ActionEvaluation,
        context: AIContext
    ): ActionEvaluation {
        const personalityModifier = this.personality.getActionModifier(evaluation.action.type);

        // リスクを恐れない修正
        const riskReduction = evaluation.riskLevel * 0.3; // リスクの影響を30%軽減

        // 難易度による修正
        const difficultyModifier = this.difficultySettings.randomnessFactor;

        // ランダム要素を適用（攻撃的AIは予測しやすくしない）
        const randomFactor = this.applyRandomFactor(evaluation.score);

        return {
            ...evaluation,
            score: (evaluation.score * personalityModifier - riskReduction + randomFactor) * difficultyModifier,
            tacticalScore: evaluation.tacticalScore * personalityModifier,
            riskLevel: evaluation.riskLevel * (1 - this.personality.riskTolerance * 0.3),
            breakdown: {
                ...evaluation.breakdown,
                personalityModifier: evaluation.breakdown.personalityModifier * personalityModifier,
                randomFactor: randomFactor,
            },
        };
    }

    /**
     * 最適な行動を選択
     * @param evaluations 評価済み行動リスト
     * @param context ゲームコンテキスト
     * @returns 選択された行動
     */
    private selectBestAction(evaluations: ActionEvaluation[], context: AIContext): AIAction {
        if (evaluations.length === 0) {
            return this.createWaitAction('No actions to evaluate');
        }

        // スコア順にソート
        evaluations.sort((a, b) => b.score - a.score);

        // 攻撃的AIは時々2番目に良い選択肢を選ぶ（予測困難性のため）
        if (evaluations.length > 1 && this.shouldMakeMistake()) {
            const secondBest = evaluations[1];
            if (secondBest.score >= evaluations[0].score * 0.8) {
                return secondBest.action;
            }
        }

        return evaluations[0].action;
    }

    // ========================================
    // ヘルパーメソッド
    // ========================================

    /**
     * 位置の評価
     */
    public evaluatePosition(position: Position, context: AIContext): number {
        return this.actionEvaluator.evaluatePositionalAdvantage(position, context);
    }

    /**
     * 優先度の取得
     */
    public getPriority(context: AIContext): number {
        // 攻撃的AIは高い優先度を持つ
        let priority = 70;

        // HPが低い場合は優先度を上げる（攻撃的に行動）
        const healthRatio = this.unit.currentHP / this.unit.stats.maxHP;
        if (healthRatio < 0.5) {
            priority += 20;
        }

        // 敵が近くにいる場合は優先度を上げる
        const nearestEnemyDistance = this.getDistanceToNearestEnemy(this.unit.position, context);
        if (nearestEnemyDistance <= 3) {
            priority += 15;
        }

        return priority;
    }

    /**
     * 最も近い敵を見つける
     */
    private findNearestEnemy(context: AIContext): Unit | null {
        if (context.visibleEnemies.length === 0) return null;

        return context.visibleEnemies.reduce((nearest, enemy) => {
            const nearestDistance = this.calculateDistance(this.unit.position, nearest.position);
            const enemyDistance = this.calculateDistance(this.unit.position, enemy.position);
            return enemyDistance < nearestDistance ? enemy : nearest;
        });
    }

    /**
     * 最も近い敵までの距離を取得
     */
    private getDistanceToNearestEnemy(position: Position, context: AIContext): number {
        if (context.visibleEnemies.length === 0) return Infinity;

        return Math.min(
            ...context.visibleEnemies.map(enemy =>
                this.calculateDistance(position, enemy.position)
            )
        );
    }

    /**
     * 指定位置から攻撃可能な敵の数をカウント
     */
    private countEnemiesInAttackRange(position: Position, context: AIContext): number {
        const attackRange = 1; // 基本攻撃範囲（実際のゲームに合わせて調整）

        return context.visibleEnemies.filter(enemy => {
            const distance = this.calculateDistance(position, enemy.position);
            return distance <= attackRange;
        }).length;
    }

    /**
     * 指定位置から攻撃可能な潜在的ターゲット数をカウント
     */
    private countPotentialTargetsFromPosition(position: Position, context: AIContext): number {
        const attackRange = 2; // 移動後攻撃可能範囲

        return context.visibleEnemies.filter(enemy => {
            const distance = this.calculateDistance(position, enemy.position);
            return distance <= attackRange;
        }).length;
    }

    /**
     * 一撃で倒せるかチェック
     */
    private canOneShot(attacker: Unit, target: Unit): boolean {
        if (!this.integration.battleSystem) return false;

        const estimatedDamage = this.integration.battleSystem.calculateDamage(attacker, target);
        return estimatedDamage >= target.currentHP;
    }

    /**
     * 前線位置の評価
     */
    private evaluateFrontlinePosition(position: Position, context: AIContext): number {
        // 敵陣に近い位置ほど高評価
        if (context.visibleEnemies.length === 0) return 0;

        const avgEnemyPosition = this.calculateAverageEnemyPosition(context);
        const distanceToEnemyCenter = this.calculateDistance(position, avgEnemyPosition);

        return Math.max(0, 15 - distanceToEnemyCenter);
    }

    /**
     * 敵の平均位置を計算
     */
    private calculateAverageEnemyPosition(context: AIContext): Position {
        if (context.visibleEnemies.length === 0) {
            return { x: 0, y: 0 };
        }

        const totalX = context.visibleEnemies.reduce((sum, enemy) => sum + enemy.position.x, 0);
        const totalY = context.visibleEnemies.reduce((sum, enemy) => sum + enemy.position.y, 0);

        return {
            x: Math.round(totalX / context.visibleEnemies.length),
            y: Math.round(totalY / context.visibleEnemies.length),
        };
    }

    /**
     * 攻撃系スキルかチェック
     */
    private isOffensiveSkill(skillId: string): boolean {
        // 実際のスキルシステムに合わせて実装
        return skillId.includes('attack') || skillId.includes('damage') || skillId.includes('strike');
    }

    /**
     * 高ダメージスキルかチェック
     */
    private isHighDamageSkill(skillId: string): boolean {
        // 実際のスキルシステムに合わせて実装
        return skillId.includes('heavy') || skillId.includes('critical') || skillId.includes('ultimate');
    }

    /**
     * スキルの影響を受ける敵の数をカウント
     */
    private countAffectedEnemies(skillId: string, target: Unit | undefined, context: AIContext): number {
        // 簡略化された実装（実際のスキルシステムに合わせて調整）
        if (!target) return 0;

        // AOEスキルの場合は周囲の敵もカウント
        if (skillId.includes('aoe') || skillId.includes('area')) {
            const aoeRange = 1;
            return context.visibleEnemies.filter(enemy => {
                const distance = this.calculateDistance(target.position, enemy.position);
                return distance <= aoeRange;
            }).length;
        }

        return 1; // 単体スキル
    }

    /**
     * 敵の接近を待つべきかチェック
     */
    private shouldWaitForEnemyApproach(context: AIContext): boolean {
        // 敵が射程に入ってくる可能性がある場合
        const nearestEnemy = this.findNearestEnemy(context);
        if (!nearestEnemy) return false;

        const distance = this.calculateDistance(this.unit.position, nearestEnemy.position);
        return distance === 2; // 次ターンで射程に入る距離
    }

    /**
     * 味方の支援を待つべきかチェック
     */
    private shouldWaitForAllySupport(context: AIContext): boolean {
        // 味方が近くにいて、連携攻撃が可能な場合
        const nearbyAllies = context.visibleAllies.filter(ally => {
            const distance = this.calculateDistance(this.unit.position, ally.position);
            return distance <= 2;
        });

        return nearbyAllies.length >= 1;
    }

    /**
     * デフォルト評価を作成
     */
    private createDefaultEvaluation(action: AIAction): ActionEvaluation {
        return {
            action,
            score: 10,
            tacticalScore: 10,
            strategicScore: 0,
            riskLevel: 0,
            confidence: 0.5,
            breakdown: {
                baseScore: 10,
                positionScore: 0,
                threatScore: 0,
                opportunityScore: 0,
                terrainScore: 0,
                personalityModifier: 0,
                difficultyModifier: 0,
                randomFactor: 0,
            },
        };
    }

    /**
     * 待機行動を作成
     */
    private createWaitAction(reasoning: string): AIAction {
        return {
            type: AIActionType.WAIT,
            priority: 0,
            reasoning,
        };
    }
}