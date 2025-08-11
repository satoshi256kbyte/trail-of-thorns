/**
 * DefensiveAI - 防御的AI行動パターン
 *
 * このモジュールは以下を提供します：
 * - HP低下時の回避行動
 * - 安全な位置への移動
 * - 保守的な戦術選択
 * - 生存を最優先とした行動決定
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
 * 防御的AI性格の実装
 */
export class DefensivePersonality implements AIPersonality {
    public readonly type = AIPersonalityType.DEFENSIVE;
    public readonly aggressiveness = 0.3;
    public readonly defensiveness = 0.9;
    public readonly supportiveness = 0.7;
    public readonly tacticalness = 0.8;
    public readonly riskTolerance = 0.2;

    public getActionModifier(actionType: AIActionType): number {
        switch (actionType) {
            case AIActionType.ATTACK:
                return 0.7; // 攻撃行動を控えめに
            case AIActionType.MOVE:
                return 1.4; // 安全な移動を優遇
            case AIActionType.SKILL:
                return 1.1; // 防御・回復スキルを優遇
            case AIActionType.WAIT:
                return 1.3; // 慎重な待機を優遇
            default:
                return 1.0;
        }
    }

    public shouldTakeRisk(riskLevel: number): boolean {
        // 低リスクのみ受け入れる
        return riskLevel <= this.riskTolerance;
    }

    public getPriorityModifier(target: Unit): number {
        let modifier = 1.0;

        // 高HPの敵は避ける傾向
        const healthRatio = target.currentHP / target.stats.maxHP;
        if (healthRatio > 0.7) {
            modifier -= 0.3;
        }

        // 攻撃力の高い敵は避ける傾向
        const attackRatio = target.stats.attack / 100; // 正規化
        modifier -= attackRatio * 0.4;

        return Math.max(0.1, modifier);
    }
}

/**
 * 防御的AIコントローラー
 */
export class DefensiveAI extends AIController {
    private actionEvaluator: ActionEvaluator;
    private readonly DANGER_HP_THRESHOLD = 0.4; // HP40%以下で危険状態
    private readonly CRITICAL_HP_THRESHOLD = 0.2; // HP20%以下で緊急状態

    constructor(
        unit: Unit,
        difficultySettings: DifficultySettings,
        config: AIControllerConfig,
        integration: AISystemIntegration = {}
    ) {
        const personality = new DefensivePersonality();
        super(unit, personality, difficultySettings, config, integration);
        this.actionEvaluator = new ActionEvaluator(integration, difficultySettings);
    }

    /**
     * 防御的AIの行動決定
     * @param context 現在のゲームコンテキスト
     * @returns 選択された行動
     */
    protected async makeDecision(context: AIContext): Promise<AIAction> {
        const validActions = this.getValidActions(context);

        if (validActions.length === 0) {
            return this.createWaitAction('No valid actions available');
        }

        // HP状態に基づく行動優先度の決定
        const healthRatio = this.unit.currentHP / this.unit.stats.maxHP;

        if (healthRatio <= this.CRITICAL_HP_THRESHOLD) {
            // 緊急状態：生存最優先
            return await this.makeEmergencyDecision(validActions, context);
        } else if (healthRatio <= this.DANGER_HP_THRESHOLD) {
            // 危険状態：防御的行動
            return await this.makeDangerousDecision(validActions, context);
        } else {
            // 通常状態：慎重な行動
            return await this.makeCautiousDecision(validActions, context);
        }
    }

    /**
     * 緊急状態での行動決定
     * @param actions 有効な行動リスト
     * @param context ゲームコンテキスト
     * @returns 選択された行動
     */
    private async makeEmergencyDecision(
        actions: AIAction[],
        context: AIContext
    ): Promise<AIAction> {
        // 1. 回復スキルがあれば最優先
        const healingAction = this.findBestHealingAction(actions, context);
        if (healingAction) {
            return healingAction;
        }

        // 2. 最も安全な位置への移動
        const safeRetreatAction = this.findSafestRetreatAction(actions, context);
        if (safeRetreatAction) {
            return safeRetreatAction;
        }

        // 3. 防御行動
        const defendAction = actions.find(action => action.type === AIActionType.DEFEND);
        if (defendAction) {
            return defendAction;
        }

        // 4. 待機（最後の手段）
        return this.createWaitAction('Emergency: No safe options available');
    }

    /**
     * 危険状態での行動決定
     * @param actions 有効な行動リスト
     * @param context ゲームコンテキスト
     * @returns 選択された行動
     */
    private async makeDangerousDecision(
        actions: AIAction[],
        context: AIContext
    ): Promise<AIAction> {
        const evaluatedActions = await this.evaluateActionsDefensively(actions, context);

        // 安全性を最優先に評価
        const safeActions = evaluatedActions.filter(eval => eval.riskLevel < 30);

        if (safeActions.length > 0) {
            // 安全な行動の中から最良を選択
            safeActions.sort((a, b) => b.score - a.score);
            return safeActions[0].action;
        }

        // 安全な行動がない場合は最もリスクの低い行動を選択
        evaluatedActions.sort((a, b) => a.riskLevel - b.riskLevel);
        return evaluatedActions[0].action;
    }

    /**
     * 慎重な状態での行動決定
     * @param actions 有効な行動リスト
     * @param context ゲームコンテキスト
     * @returns 選択された行動
     */
    private async makeCautiousDecision(
        actions: AIAction[],
        context: AIContext
    ): Promise<AIAction> {
        const evaluatedActions = await this.evaluateActionsDefensively(actions, context);

        // リスクと報酬のバランスを考慮
        const balancedActions = evaluatedActions.filter(eval =>
            eval.riskLevel < 50 && eval.score > 20
        );

        if (balancedActions.length > 0) {
            balancedActions.sort((a, b) => (b.score - b.riskLevel) - (a.score - a.riskLevel));
            return balancedActions[0].action;
        }

        // バランスの取れた行動がない場合は最も安全な行動を選択
        evaluatedActions.sort((a, b) => a.riskLevel - b.riskLevel);
        return evaluatedActions[0].action;
    }

    /**
     * 防御的な観点から行動を評価
     * @param actions 評価対象の行動リスト
     * @param context 現在のゲームコンテキスト
     * @returns 評価済み行動リスト
     */
    private async evaluateActionsDefensively(
        actions: AIAction[],
        context: AIContext
    ): Promise<ActionEvaluation[]> {
        const evaluations: ActionEvaluation[] = [];

        for (const action of actions) {
            let evaluation: ActionEvaluation;

            switch (action.type) {
                case AIActionType.ATTACK:
                    evaluation = await this.evaluateAttackActionDefensively(action, context);
                    break;
                case AIActionType.MOVE:
                    evaluation = await this.evaluateMoveActionDefensively(action, context);
                    break;
                case AIActionType.SKILL:
                    evaluation = await this.evaluateSkillActionDefensively(action, context);
                    break;
                case AIActionType.WAIT:
                    evaluation = await this.evaluateWaitActionDefensively(action, context);
                    break;
                default:
                    evaluation = this.createDefaultEvaluation(action);
            }

            // 防御的性格による修正を適用
            evaluation = this.applyDefensiveModifiers(evaluation, context);
            evaluations.push(evaluation);
        }

        return evaluations;
    }

    /**
     * 攻撃行動の防御的評価
     * @param action 攻撃行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateAttackActionDefensively(
        action: AIAction,
        context: AIContext
    ): Promise<ActionEvaluation> {
        if (!action.target) {
            return this.createDefaultEvaluation(action);
        }

        const baseEvaluation = this.actionEvaluator.evaluateAttack(
            this.unit,
            action.target,
            context
        );

        // 防御的AIの攻撃評価要素
        let defensiveModifier = 0;

        // 反撃リスクを重視
        const counterAttackRisk = this.evaluateCounterAttackRisk(action.target, context);
        defensiveModifier -= counterAttackRisk;

        // 確実に倒せる敵への攻撃は評価を上げる
        if (this.canSafelyDefeat(this.unit, action.target)) {
            defensiveModifier += 25;
        }

        // 弱い敵への攻撃を優遇（リスクが低い）
        const targetStrength = this.evaluateTargetStrength(action.target);
        defensiveModifier += Math.max(0, 20 - targetStrength);

        // 味方から離れた位置での攻撃は減点
        const allySupport = this.evaluateAllySupport(this.unit.position, context);
        if (allySupport < 10) {
            defensiveModifier -= 15;
        }

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: Math.max(0, baseEvaluation.score + defensiveModifier),
            riskLevel: baseEvaluation.riskLevel + counterAttackRisk,
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + defensiveModifier,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * 移動行動の防御的評価
     * @param action 移動行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateMoveActionDefensively(
        action: AIAction,
        context: AIContext
    ): Promise<ActionEvaluation> {
        if (!action.position) {
            return this.createDefaultEvaluation(action);
        }

        const baseEvaluation = this.actionEvaluator.evaluateMove(
            this.unit.position,
            action.position,
            context
        );

        // 防御的AIの移動評価要素
        let defensiveBonus = 0;

        // 安全性の評価
        const currentSafety = this.evaluatePositionSafety(this.unit.position, context);
        const newSafety = this.evaluatePositionSafety(action.position, context);

        if (newSafety > currentSafety) {
            defensiveBonus += (newSafety - currentSafety) * 2;
        }

        // 敵から遠ざかる移動を優遇
        const currentThreatDistance = this.getDistanceToNearestThreat(this.unit.position, context);
        const newThreatDistance = this.getDistanceToNearestThreat(action.position, context);

        if (newThreatDistance > currentThreatDistance) {
            defensiveBonus += 15;
        }

        // 味方に近づく移動を優遇
        const allyProximityBonus = this.evaluateAllyProximity(action.position, context);
        defensiveBonus += allyProximityBonus;

        // 地形による防御ボーナス
        const terrainDefenseBonus = this.evaluateTerrainDefense(action.position, context);
        defensiveBonus += terrainDefenseBonus;

        // 逃げ道の確保
        const escapeRouteBonus = this.evaluateEscapeRoutes(action.position, context);
        defensiveBonus += escapeRouteBonus;

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: baseEvaluation.score + defensiveBonus,
            tacticalScore: baseEvaluation.tacticalScore + defensiveBonus * 0.9,
            riskLevel: Math.max(0, baseEvaluation.riskLevel - defensiveBonus * 0.3),
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + defensiveBonus,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * スキル行動の防御的評価
     * @param action スキル行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateSkillActionDefensively(
        action: AIAction,
        context: AIContext
    ): Promise<ActionEvaluation> {
        if (!action.skillId) {
            return this.createDefaultEvaluation(action);
        }

        const baseEvaluation = this.actionEvaluator.evaluateSkillUse(
            action.skillId,
            action.target,
            context
        );

        // 防御的AIのスキル評価要素
        let defensiveBonus = 0;

        // 回復・防御系スキルを大幅優遇
        if (this.isHealingSkill(action.skillId)) {
            defensiveBonus += 30;
        }

        if (this.isDefensiveSkill(action.skillId)) {
            defensiveBonus += 25;
        }

        // バフ・デバフスキルを優遇
        if (this.isSupportSkill(action.skillId)) {
            defensiveBonus += 20;
        }

        // 攻撃系スキルは控えめに評価
        if (this.isOffensiveSkill(action.skillId)) {
            defensiveBonus -= 10;
        }

        // 味方への支援スキルを優遇
        if (action.target && action.target.faction === this.unit.faction) {
            defensiveBonus += 15;
        }

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: baseEvaluation.score + defensiveBonus,
            tacticalScore: baseEvaluation.tacticalScore + defensiveBonus * 0.8,
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + defensiveBonus,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * 待機行動の防御的評価
     * @param action 待機行動
     * @param context ゲームコンテキスト
     * @returns 評価結果
     */
    private async evaluateWaitActionDefensively(
        action: AIAction,
        context: AIContext
    ): Promise<ActionEvaluation> {
        const baseEvaluation = this.actionEvaluator.evaluateWait(context);

        // 防御的AIは適切な待機を評価する
        let defensiveBonus = 0;

        // 安全な位置での待機は高評価
        const positionSafety = this.evaluatePositionSafety(this.unit.position, context);
        defensiveBonus += positionSafety * 0.5;

        // 敵の射程外での待機は高評価
        if (!this.isInEnemyRange(this.unit.position, context)) {
            defensiveBonus += 20;
        }

        // 味方の近くでの待機は高評価
        const allySupport = this.evaluateAllySupport(this.unit.position, context);
        defensiveBonus += allySupport * 0.3;

        // HP低下時の待機は状況による
        const healthRatio = this.unit.currentHP / this.unit.stats.maxHP;
        if (healthRatio < 0.5) {
            if (positionSafety > 50) {
                defensiveBonus += 15; // 安全な場所での待機は良い
            } else {
                defensiveBonus -= 10; // 危険な場所での待機は悪い
            }
        }

        // 評価結果を更新
        const modifiedEvaluation = {
            ...baseEvaluation,
            score: baseEvaluation.score + defensiveBonus,
            tacticalScore: baseEvaluation.tacticalScore + defensiveBonus,
            breakdown: {
                ...baseEvaluation.breakdown,
                personalityModifier: baseEvaluation.breakdown.personalityModifier + defensiveBonus,
            },
        };

        return modifiedEvaluation;
    }

    /**
     * 防御的修正を適用
     * @param evaluation 基本評価
     * @param context ゲームコンテキスト
     * @returns 修正済み評価
     */
    private applyDefensiveModifiers(
        evaluation: ActionEvaluation,
        context: AIContext
    ): ActionEvaluation {
        const personalityModifier = this.personality.getActionModifier(evaluation.action.type);

        // リスクを重視する修正
        const riskPenalty = evaluation.riskLevel * 0.8; // リスクの影響を80%増加

        // HP状態による修正
        const healthRatio = this.unit.currentHP / this.unit.stats.maxHP;
        const healthModifier = healthRatio < 0.5 ? 0.7 : 1.0; // HP低下時はより慎重に

        // 難易度による修正
        const difficultyModifier = 1.0 + (this.difficultySettings.randomnessFactor * 0.5);

        // ランダム要素を適用（防御的AIは予測しやすい）
        const randomFactor = this.applyRandomFactor(evaluation.score) * 0.5;

        return {
            ...evaluation,
            score: Math.max(0, (evaluation.score * personalityModifier - riskPenalty + randomFactor) * healthModifier * difficultyModifier),
            tacticalScore: evaluation.tacticalScore * personalityModifier * healthModifier,
            riskLevel: evaluation.riskLevel * (1 + (1 - this.personality.riskTolerance) * 0.5),
            breakdown: {
                ...evaluation.breakdown,
                personalityModifier: evaluation.breakdown.personalityModifier * personalityModifier,
                randomFactor: randomFactor,
            },
        };
    }

    // ========================================
    // ヘルパーメソッド
    // ========================================

    /**
     * 位置の評価
     */
    public evaluatePosition(position: Position, context: AIContext): number {
        // 安全性を重視した位置評価
        const safetyScore = this.evaluatePositionSafety(position, context);
        const tacticalScore = this.actionEvaluator.evaluatePositionalAdvantage(position, context);

        return safetyScore * 0.7 + tacticalScore * 0.3;
    }

    /**
     * 優先度の取得
     */
    public getPriority(context: AIContext): number {
        // 防御的AIは中程度の優先度
        let priority = 50;

        // HPが低い場合は優先度を上げる（早く安全を確保）
        const healthRatio = this.unit.currentHP / this.unit.stats.maxHP;
        if (healthRatio < 0.3) {
            priority += 30;
        } else if (healthRatio < 0.6) {
            priority += 15;
        }

        // 危険な位置にいる場合は優先度を上げる
        const positionSafety = this.evaluatePositionSafety(this.unit.position, context);
        if (positionSafety < 30) {
            priority += 20;
        }

        return priority;
    }

    /**
     * 最良の回復行動を見つける
     */
    private findBestHealingAction(actions: AIAction[], context: AIContext): AIAction | null {
        const healingActions = actions.filter(action =>
            action.type === AIActionType.SKILL &&
            action.skillId &&
            this.isHealingSkill(action.skillId)
        );

        if (healingActions.length === 0) return null;

        // 最も効果的な回復行動を選択
        return healingActions.reduce((best, current) => {
            const bestEffectiveness = this.evaluateHealingEffectiveness(best, context);
            const currentEffectiveness = this.evaluateHealingEffectiveness(current, context);
            return currentEffectiveness > bestEffectiveness ? current : best;
        });
    }

    /**
     * 最も安全な退却行動を見つける
     */
    private findSafestRetreatAction(actions: AIAction[], context: AIContext): AIAction | null {
        const moveActions = actions.filter(action => action.type === AIActionType.MOVE);

        if (moveActions.length === 0) return null;

        return moveActions.reduce((safest, current) => {
            if (!current.position || !safest.position) return safest;

            const currentSafety = this.evaluatePositionSafety(current.position, context);
            const safestSafety = this.evaluatePositionSafety(safest.position, context);

            return currentSafety > safestSafety ? current : safest;
        });
    }

    /**
     * 位置の安全性を評価
     */
    private evaluatePositionSafety(position: Position, context: AIContext): number {
        let safety = 100; // 基本安全度

        // 敵からの脅威を評価
        for (const enemy of context.visibleEnemies) {
            const distance = this.calculateDistance(position, enemy.position);
            const threatLevel = this.calculateThreatLevel(enemy, distance);
            safety -= threatLevel;
        }

        // 味方からの支援を評価
        const allySupport = this.evaluateAllySupport(position, context);
        safety += allySupport;

        // 地形による防御ボーナス
        const terrainBonus = this.evaluateTerrainDefense(position, context);
        safety += terrainBonus;

        return Math.max(0, Math.min(100, safety));
    }

    /**
     * 反撃リスクを評価
     */
    private evaluateCounterAttackRisk(target: Unit, context: AIContext): number {
        if (!this.integration.battleSystem) return 20;

        // 反撃可能かチェック
        if (!this.integration.battleSystem.canAttack(target, this.unit)) {
            return 0;
        }

        // 反撃ダメージを計算
        const counterDamage = this.integration.battleSystem.calculateDamage(target, this.unit);
        const damageRatio = counterDamage / this.unit.currentHP;

        return Math.min(50, damageRatio * 60);
    }

    /**
     * 安全に倒せるかチェック
     */
    private canSafelyDefeat(attacker: Unit, target: Unit): boolean {
        if (!this.integration.battleSystem) return false;

        const damage = this.integration.battleSystem.calculateDamage(attacker, target);
        const canDefeat = damage >= target.currentHP;

        if (!canDefeat) return false;

        // 反撃リスクをチェック
        const counterRisk = this.evaluateCounterAttackRisk(target, {} as AIContext);
        return counterRisk < 20;
    }

    /**
     * ターゲットの強さを評価
     */
    private evaluateTargetStrength(target: Unit): number {
        const healthRatio = target.currentHP / target.stats.maxHP;
        const attackPower = target.stats.attack / 100; // 正規化

        return (healthRatio + attackPower) * 50;
    }

    /**
     * 味方からの支援を評価
     */
    private evaluateAllySupport(position: Position, context: AIContext): number {
        let support = 0;

        for (const ally of context.visibleAllies) {
            const distance = this.calculateDistance(position, ally.position);
            if (distance <= 2) {
                support += 15; // 近くの味方からの支援
            } else if (distance <= 4) {
                support += 5; // 遠くの味方からの支援
            }
        }

        return Math.min(30, support);
    }

    /**
     * 最も近い脅威までの距離を取得
     */
    private getDistanceToNearestThreat(position: Position, context: AIContext): number {
        if (context.visibleEnemies.length === 0) return Infinity;

        return Math.min(
            ...context.visibleEnemies.map(enemy =>
                this.calculateDistance(position, enemy.position)
            )
        );
    }

    /**
     * 味方との近接性を評価
     */
    private evaluateAllyProximity(position: Position, context: AIContext): number {
        if (context.visibleAllies.length === 0) return 0;

        const distances = context.visibleAllies.map(ally =>
            this.calculateDistance(position, ally.position)
        );

        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        return Math.max(0, 20 - avgDistance * 3);
    }

    /**
     * 地形による防御ボーナスを評価
     */
    private evaluateTerrainDefense(position: Position, context: AIContext): number {
        // 簡略化された実装（実際の地形システムに合わせて調整）
        return this.actionEvaluator.evaluateTerrainBonus(position, context) * 0.5;
    }

    /**
     * 逃げ道を評価
     */
    private evaluateEscapeRoutes(position: Position, context: AIContext): number {
        // 周囲8方向の逃げ道をチェック
        const directions = [
            { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
        ];

        let escapeRoutes = 0;
        for (const dir of directions) {
            const escapePos = { x: position.x + dir.x, y: position.y + dir.y };

            // マップ境界チェック
            if (context.mapData &&
                escapePos.x >= 0 && escapePos.x < context.mapData.width &&
                escapePos.y >= 0 && escapePos.y < context.mapData.height) {

                // 敵の脅威が少ない方向かチェック
                const threatLevel = this.actionEvaluator.evaluateThreatLevel(escapePos, context);
                if (threatLevel < 30) {
                    escapeRoutes++;
                }
            }
        }

        return escapeRoutes * 2;
    }

    /**
     * 敵の射程内にいるかチェック
     */
    private isInEnemyRange(position: Position, context: AIContext): boolean {
        const attackRange = 1; // 基本攻撃範囲

        return context.visibleEnemies.some(enemy => {
            const distance = this.calculateDistance(position, enemy.position);
            return distance <= attackRange;
        });
    }

    /**
     * 脅威レベルを計算
     */
    private calculateThreatLevel(enemy: Unit, distance: number): number {
        const attackPower = enemy.stats.attack / 100; // 正規化
        const healthRatio = enemy.currentHP / enemy.stats.maxHP;

        let threat = (attackPower + healthRatio) * 25;

        // 距離による減衰
        threat = threat / Math.max(1, distance * 0.5);

        return Math.min(50, threat);
    }

    /**
     * 回復効果を評価
     */
    private evaluateHealingEffectiveness(action: AIAction, context: AIContext): number {
        // 簡略化された実装
        const healthRatio = this.unit.currentHP / this.unit.stats.maxHP;
        return (1 - healthRatio) * 100; // HP不足分に比例
    }

    /**
     * スキルタイプの判定メソッド
     */
    private isHealingSkill(skillId: string): boolean {
        return skillId.includes('heal') || skillId.includes('cure') || skillId.includes('restore');
    }

    private isDefensiveSkill(skillId: string): boolean {
        return skillId.includes('defend') || skillId.includes('guard') || skillId.includes('shield');
    }

    private isSupportSkill(skillId: string): boolean {
        return skillId.includes('buff') || skillId.includes('support') || skillId.includes('boost');
    }

    private isOffensiveSkill(skillId: string): boolean {
        return skillId.includes('attack') || skillId.includes('damage') || skillId.includes('strike');
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