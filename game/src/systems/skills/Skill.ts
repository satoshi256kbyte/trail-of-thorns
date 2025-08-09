/**
 * スキル基底クラスと基本スキル種別クラス
 * 
 * このファイルには以下のクラスが含まれます：
 * - Skill抽象基底クラス
 * - AttackSkill（攻撃スキル）
 * - HealSkill（回復スキル）
 * - BuffSkill（バフスキル）
 * - DebuffSkill（デバフスキル）
 * - StatusSkill（状態異常スキル）
 */

import {
    SkillData,
    SkillResult,
    SkillUsabilityResult,
    SkillExecutionContext,
    Position,
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    StatusEffectType,
    SkillUsabilityError,
    SkillEffectResult,
    Skill as BaseSkill
} from '../../types/skill';

// =============================================================================
// 抽象基底クラス
// =============================================================================

/**
 * スキル基底クラス
 * 全てのスキルはこのクラスを継承する
 */
export abstract class Skill extends BaseSkill {
    constructor(data: SkillData) {
        super(data);
    }

    /**
     * スキルデータを更新する（オブジェクトプール用）
     * @param skillData 新しいスキルデータ
     */
    updateData(skillData: SkillData): void {
        Object.assign(this, skillData);
    }

    /**
     * スキルオブジェクトをリセットする（オブジェクトプール用）
     */
    reset(): void {
        // 必要に応じて各サブクラスでオーバーライド
    }

    /**
     * スキルオブジェクトを破棄する（オブジェクトプール用）
     */
    destroy(): void {
        // 必要に応じて各サブクラスでオーバーライド
    }

    /**
     * 基本的な使用可能性チェック
     * 各スキル種別で共通する条件をチェック
     */
    protected checkBasicUsability(
        casterId: string,
        targetPosition: Position,
        battlefieldState: any
    ): SkillUsabilityResult {
        // TODO: 実際の戦場状態インターフェースが実装されたら置き換え
        const caster = battlefieldState.getCharacter?.(casterId);

        if (!caster) {
            return {
                canUse: false,
                error: SkillUsabilityError.SKILL_NOT_FOUND,
                message: 'キャラクターが見つかりません'
            };
        }

        // MP不足チェック
        if (caster.currentMP < this.usageCondition.mpCost) {
            return {
                canUse: false,
                error: SkillUsabilityError.INSUFFICIENT_MP,
                message: 'MPが不足しています',
                missingMP: this.usageCondition.mpCost - caster.currentMP
            };
        }

        // レベル要件チェック
        if (caster.level < this.usageCondition.levelRequirement) {
            return {
                canUse: false,
                error: SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET,
                message: `レベル${this.usageCondition.levelRequirement}以上が必要です`
            };
        }

        // 行動済みチェック
        if (caster.hasActed) {
            return {
                canUse: false,
                error: SkillUsabilityError.CHARACTER_ALREADY_ACTED,
                message: 'このキャラクターは既に行動済みです'
            };
        }

        // 射程チェック
        const distance = this.calculateDistance(caster.position, targetPosition);
        if (distance > this.range) {
            return {
                canUse: false,
                error: SkillUsabilityError.OUT_OF_RANGE,
                message: '射程外です'
            };
        }

        return { canUse: true };
    }

    /**
     * 距離計算（マンハッタン距離）
     */
    protected calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    /**
     * 基本的な実行処理
     * 各スキル種別で共通する処理を実行
     */
    protected async executeBase(context: SkillExecutionContext): Promise<Partial<SkillResult>> {
        const { caster, battlefieldState } = context;
        const casterCharacter = battlefieldState.getCharacter?.(caster);

        if (!casterCharacter) {
            return {
                success: false,
                error: SkillUsabilityError.SKILL_NOT_FOUND,
                errorMessage: 'キャラクターが見つかりません',
                targets: [],
                effects: [],
                mpCost: 0
            };
        }

        // MP消費
        casterCharacter.currentMP -= this.usageCondition.mpCost;

        // 対象位置の取得
        const affectedPositions = this.getAffectedPositions(context.targetPosition);
        const targets: string[] = [];

        // 対象キャラクターの特定
        for (const position of affectedPositions) {
            const character = battlefieldState.getCharacterAt?.(position);
            if (character && this.isValidTarget(character, casterCharacter)) {
                targets.push(character.id);
            }
        }

        return {
            success: true,
            targets,
            effects: [],
            mpCost: this.usageCondition.mpCost
        };
    }

    /**
     * 対象が有効かどうかをチェック
     */
    protected isValidTarget(target: any, caster: any): boolean {
        if (!target || !caster) return false;

        switch (this.targetType) {
            case TargetType.SELF:
                return target.id === caster.id;
            case TargetType.SINGLE_ALLY:
            case TargetType.AREA_ALLY:
            case TargetType.ALL_ALLIES:
                return target.faction === caster.faction && target.id !== caster.id;
            case TargetType.SINGLE_ENEMY:
            case TargetType.AREA_ENEMY:
            case TargetType.ALL_ENEMIES:
                return target.faction !== caster.faction;
            case TargetType.SINGLE_ANY:
            case TargetType.AREA_ANY:
            case TargetType.ALL_ANY:
                return true;
            default:
                return false;
        }
    }
}

// =============================================================================
// 攻撃スキル
// =============================================================================

/**
 * 攻撃スキルクラス
 * ダメージを与えるスキルの基底クラス
 */
export class AttackSkill extends Skill {
    /** ダメージ倍率 */
    public readonly damageMultiplier: number;
    /** ダメージ種別 */
    public readonly damageType: DamageType;
    /** 攻撃回数 */
    public readonly hitCount: number;
    /** クリティカル率 */
    public readonly criticalRate: number;

    constructor(data: SkillData) {
        super(data);

        // 攻撃スキル固有のパラメータを効果から抽出
        const damageEffect = this.effects.find(effect => effect.type === 'damage');
        this.damageMultiplier = damageEffect?.value || 1.0;
        this.damageType = damageEffect?.damageType || DamageType.PHYSICAL;
        this.hitCount = (data as any).additionalInfo?.hitCount || 1;
        this.criticalRate = (data as any).additionalInfo?.criticalRate || 0.05;
    }

    async execute(context: SkillExecutionContext): Promise<SkillResult> {
        const baseResult = await this.executeBase(context);
        if (!baseResult.success) {
            return baseResult as SkillResult;
        }

        const effects: SkillEffectResult[] = [];
        const { battlefieldState, caster } = context;
        const casterCharacter = battlefieldState.getCharacter?.(caster);

        for (const targetId of baseResult.targets!) {
            const target = battlefieldState.getCharacter?.(targetId);
            if (!target) continue;

            // ダメージ計算
            const baseDamage = this.calculateDamage(casterCharacter, target);
            let totalDamage = 0;
            let isCritical = false;

            // 複数回攻撃の処理
            for (let i = 0; i < this.hitCount; i++) {
                let damage = baseDamage * this.damageMultiplier;

                // クリティカル判定
                if (Math.random() < this.criticalRate) {
                    damage *= 2;
                    isCritical = true;
                }

                totalDamage += damage;
            }

            // ダメージ適用
            target.currentHP = Math.max(0, target.currentHP - totalDamage);

            effects.push({
                targetId,
                effectType: 'damage',
                actualValue: totalDamage,
                isCritical,
                success: true
            });
        }

        return {
            ...baseResult,
            effects
        } as SkillResult;
    }

    canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult {
        return this.checkBasicUsability(casterId, targetPosition, battlefieldState);
    }

    getValidTargets(casterPosition: Position, battlefieldState: any): Position[] {
        const validTargets: Position[] = [];
        const currentPlayerId = battlefieldState.getCurrentPlayer?.();
        const caster = battlefieldState.getCharacter?.(currentPlayerId);

        // 射程内の全ての位置をチェック
        for (let x = casterPosition.x - this.range; x <= casterPosition.x + this.range; x++) {
            for (let y = casterPosition.y - this.range; y <= casterPosition.y + this.range; y++) {
                const distance = this.calculateDistance(casterPosition, { x, y });
                if (distance <= this.range) {
                    const character = battlefieldState.getCharacterAt?.({ x, y });
                    if (character && caster && this.isValidTarget(character, caster)) {
                        validTargets.push({ x, y });
                    }
                }
            }
        }

        return validTargets;
    }

    /**
     * ダメージ計算
     */
    private calculateDamage(attacker: any, defender: any): number {
        let baseDamage = 0;

        switch (this.damageType) {
            case DamageType.PHYSICAL:
                baseDamage = Math.max(1, attacker.stats.attack - defender.stats.defense);
                break;
            case DamageType.MAGICAL:
                baseDamage = Math.max(1, attacker.stats.magicAttack - defender.stats.magicDefense);
                break;
            case DamageType.TRUE:
                baseDamage = attacker.stats.attack;
                break;
        }

        return Math.floor(baseDamage);
    }
}

// =============================================================================
// 回復スキル
// =============================================================================

/**
 * 回復スキルクラス
 * HPやMPを回復するスキルの基底クラス
 */
export class HealSkill extends Skill {
    /** 回復量 */
    public readonly healAmount: number;
    /** 回復種別 */
    public readonly healType: HealType;
    /** MP回復フラグ */
    public readonly healsMp: boolean;

    constructor(data: SkillData) {
        super(data);

        // 回復スキル固有のパラメータを効果から抽出
        const healEffect = this.effects.find(effect => effect.type === 'heal');
        this.healAmount = healEffect?.value || 0;
        this.healType = healEffect?.healType || HealType.FIXED;
        this.healsMp = (data as any).additionalInfo?.healsMp || false;
    }

    async execute(context: SkillExecutionContext): Promise<SkillResult> {
        const baseResult = await this.executeBase(context);
        if (!baseResult.success) {
            return baseResult as SkillResult;
        }

        const effects: SkillEffectResult[] = [];
        const { battlefieldState, caster } = context;
        const casterCharacter = battlefieldState.getCharacter?.(caster);

        for (const targetId of baseResult.targets!) {
            const target = battlefieldState.getCharacter?.(targetId);
            if (!target) continue;

            // 回復量計算
            const healValue = this.calculateHealAmount(casterCharacter, target);

            // HP回復
            const oldHP = target.currentHP;
            target.currentHP = Math.min(target.stats.maxHP, target.currentHP + healValue);
            const actualHeal = target.currentHP - oldHP;

            // MP回復（オプション）
            if (this.healsMp) {
                const mpHeal = Math.floor(healValue * 0.5);
                target.currentMP = Math.min(target.stats.maxMP, target.currentMP + mpHeal);
            }

            effects.push({
                targetId,
                effectType: 'heal',
                actualValue: actualHeal,
                success: true
            });
        }

        return {
            ...baseResult,
            effects
        } as SkillResult;
    }

    canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult {
        const basicCheck = this.checkBasicUsability(casterId, targetPosition, battlefieldState);
        if (!basicCheck.canUse) {
            return basicCheck;
        }

        // 回復対象がいるかチェック
        const affectedPositions = this.getAffectedPositions(targetPosition);
        let hasValidTarget = false;

        for (const position of affectedPositions) {
            const character = battlefieldState.getCharacterAt?.(position);
            const caster = battlefieldState.getCharacter?.(casterId);
            if (character && caster && this.isValidTarget(character, caster) && character.currentHP < character.stats.maxHP) {
                hasValidTarget = true;
                break;
            }
        }

        if (!hasValidTarget) {
            return {
                canUse: false,
                error: SkillUsabilityError.INVALID_TARGET,
                message: '回復が必要な対象がいません'
            };
        }

        return { canUse: true };
    }

    getValidTargets(casterPosition: Position, battlefieldState: any): Position[] {
        const validTargets: Position[] = [];
        const currentPlayerId = battlefieldState.getCurrentPlayer?.();
        const caster = battlefieldState.getCharacter?.(currentPlayerId);

        // 射程内の全ての位置をチェック
        for (let x = casterPosition.x - this.range; x <= casterPosition.x + this.range; x++) {
            for (let y = casterPosition.y - this.range; y <= casterPosition.y + this.range; y++) {
                const distance = this.calculateDistance(casterPosition, { x, y });
                if (distance <= this.range) {
                    const character = battlefieldState.getCharacterAt?.({ x, y });
                    if (character && caster && this.isValidTarget(character, caster)
                        && character.currentHP < character.stats.maxHP) {
                        validTargets.push({ x, y });
                    }
                }
            }
        }

        return validTargets;
    }

    /**
     * 回復量計算
     */
    private calculateHealAmount(caster: any, target: any): number {
        switch (this.healType) {
            case HealType.FIXED:
                return this.healAmount;
            case HealType.PERCENTAGE:
                return Math.floor(target.stats.maxHP * (this.healAmount / 100));
            case HealType.STAT_BASED:
                return Math.floor(caster.stats.magicAttack * (this.healAmount / 100));
            default:
                return this.healAmount;
        }
    }
}

// =============================================================================
// バフスキル
// =============================================================================

/**
 * バフスキルクラス
 * 能力値を向上させるスキルの基底クラス
 */
export class BuffSkill extends Skill {
    /** バフ種別 */
    public readonly buffType: BuffType;
    /** バフ値 */
    public readonly buffValue: number;
    /** 持続時間 */
    public readonly duration: number;

    constructor(data: SkillData) {
        super(data);

        // バフスキル固有のパラメータを効果から抽出
        const buffEffect = this.effects.find(effect => effect.type === 'buff');
        this.buffType = buffEffect?.buffType || BuffType.ATTACK_UP;
        this.buffValue = buffEffect?.value || 0;
        this.duration = buffEffect?.duration || 3;
    }

    async execute(context: SkillExecutionContext): Promise<SkillResult> {
        const baseResult = await this.executeBase(context);
        if (!baseResult.success) {
            return baseResult as SkillResult;
        }

        const effects: SkillEffectResult[] = [];
        const { battlefieldState } = context;

        for (const targetId of baseResult.targets!) {
            const target = battlefieldState.getCharacter?.(targetId);
            if (!target) continue;

            // バフ効果を適用
            this.applyBuff(target, this.buffType, this.buffValue, this.duration);

            effects.push({
                targetId,
                effectType: 'buff',
                actualValue: this.buffValue,
                success: true
            });
        }

        return {
            ...baseResult,
            effects
        } as SkillResult;
    }

    canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult {
        return this.checkBasicUsability(casterId, targetPosition, battlefieldState);
    }

    getValidTargets(casterPosition: Position, battlefieldState: any): Position[] {
        const validTargets: Position[] = [];
        const currentPlayerId = battlefieldState.getCurrentPlayer?.();
        const caster = battlefieldState.getCharacter?.(currentPlayerId);

        // 射程内の全ての位置をチェック
        for (let x = casterPosition.x - this.range; x <= casterPosition.x + this.range; x++) {
            for (let y = casterPosition.y - this.range; y <= casterPosition.y + this.range; y++) {
                const distance = this.calculateDistance(casterPosition, { x, y });
                if (distance <= this.range) {
                    const character = battlefieldState.getCharacterAt?.({ x, y });
                    if (character && caster && this.isValidTarget(character, caster)) {
                        validTargets.push({ x, y });
                    }
                }
            }
        }

        return validTargets;
    }

    /**
     * バフ効果を適用
     */
    private applyBuff(target: any, buffType: BuffType, value: number, duration: number): void {
        // TODO: 実際のバフシステムが実装されたら置き換え
        if (!target.activeBuffs) {
            target.activeBuffs = [];
        }

        target.activeBuffs.push({
            type: buffType,
            value: value,
            remainingDuration: duration,
            appliedAt: new Date()
        });
    }
}

// =============================================================================
// デバフスキル
// =============================================================================

/**
 * デバフスキルクラス
 * 能力値を低下させるスキルの基底クラス
 */
export class DebuffSkill extends Skill {
    /** デバフ種別 */
    public readonly debuffType: BuffType;
    /** デバフ値 */
    public readonly debuffValue: number;
    /** 持続時間 */
    public readonly duration: number;
    /** 成功確率 */
    public readonly successRate: number;

    constructor(data: SkillData) {
        super(data);

        // デバフスキル固有のパラメータを効果から抽出
        const debuffEffect = this.effects.find(effect => effect.type === 'debuff');
        this.debuffType = debuffEffect?.buffType || BuffType.ATTACK_DOWN;
        this.debuffValue = debuffEffect?.value || 0;
        this.duration = debuffEffect?.duration || 3;
        this.successRate = debuffEffect?.successRate || 80;
    }

    async execute(context: SkillExecutionContext): Promise<SkillResult> {
        const baseResult = await this.executeBase(context);
        if (!baseResult.success) {
            return baseResult as SkillResult;
        }

        const effects: SkillEffectResult[] = [];
        const { battlefieldState } = context;

        for (const targetId of baseResult.targets!) {
            const target = battlefieldState.getCharacter?.(targetId);
            if (!target) continue;

            // 成功判定
            const success = Math.random() * 100 < this.successRate;

            if (success) {
                // デバフ効果を適用
                this.applyDebuff(target, this.debuffType, this.debuffValue, this.duration);
            }

            effects.push({
                targetId,
                effectType: 'debuff',
                actualValue: success ? this.debuffValue : 0,
                success,
                resisted: !success
            });
        }

        return {
            ...baseResult,
            effects
        } as SkillResult;
    }

    canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult {
        return this.checkBasicUsability(casterId, targetPosition, battlefieldState);
    }

    getValidTargets(casterPosition: Position, battlefieldState: any): Position[] {
        const validTargets: Position[] = [];
        const currentPlayerId = battlefieldState.getCurrentPlayer?.();
        const caster = battlefieldState.getCharacter?.(currentPlayerId);

        // 射程内の全ての位置をチェック
        for (let x = casterPosition.x - this.range; x <= casterPosition.x + this.range; x++) {
            for (let y = casterPosition.y - this.range; y <= casterPosition.y + this.range; y++) {
                const distance = this.calculateDistance(casterPosition, { x, y });
                if (distance <= this.range) {
                    const character = battlefieldState.getCharacterAt?.({ x, y });
                    if (character && caster && this.isValidTarget(character, caster)) {
                        validTargets.push({ x, y });
                    }
                }
            }
        }

        return validTargets;
    }

    /**
     * デバフ効果を適用
     */
    private applyDebuff(target: any, debuffType: BuffType, value: number, duration: number): void {
        // TODO: 実際のデバフシステムが実装されたら置き換え
        if (!target.activeDebuffs) {
            target.activeDebuffs = [];
        }

        target.activeDebuffs.push({
            type: debuffType,
            value: value,
            remainingDuration: duration,
            appliedAt: new Date()
        });
    }
}

// =============================================================================
// 状態異常スキル
// =============================================================================

/**
 * 状態異常スキルクラス
 * 状態異常を付与するスキルの基底クラス
 */
export class StatusSkill extends Skill {
    /** 状態異常種別 */
    public readonly statusType: StatusEffectType;
    /** 持続時間 */
    public readonly duration: number;
    /** 成功確率 */
    public readonly successRate: number;
    /** 効果値（毒ダメージ等） */
    public readonly effectValue: number;

    constructor(data: SkillData) {
        super(data);

        // 状態異常スキル固有のパラメータを効果から抽出
        const statusEffect = this.effects.find(effect => effect.type === 'status');
        this.statusType = statusEffect?.statusType || StatusEffectType.POISON;
        this.duration = statusEffect?.duration || 3;
        this.successRate = statusEffect?.successRate || 70;
        this.effectValue = statusEffect?.value || 0;
    }

    async execute(context: SkillExecutionContext): Promise<SkillResult> {
        const baseResult = await this.executeBase(context);
        if (!baseResult.success) {
            return baseResult as SkillResult;
        }

        const effects: SkillEffectResult[] = [];
        const { battlefieldState } = context;

        for (const targetId of baseResult.targets!) {
            const target = battlefieldState.getCharacter?.(targetId);
            if (!target) continue;

            // 成功判定
            const success = Math.random() * 100 < this.successRate;

            if (success) {
                // 状態異常効果を適用
                this.applyStatusEffect(target, this.statusType, this.effectValue, this.duration);
            }

            effects.push({
                targetId,
                effectType: 'status',
                actualValue: success ? this.effectValue : 0,
                success,
                resisted: !success
            });
        }

        return {
            ...baseResult,
            effects
        } as SkillResult;
    }

    canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult {
        return this.checkBasicUsability(casterId, targetPosition, battlefieldState);
    }

    getValidTargets(casterPosition: Position, battlefieldState: any): Position[] {
        const validTargets: Position[] = [];
        const currentPlayerId = battlefieldState.getCurrentPlayer?.();
        const caster = battlefieldState.getCharacter?.(currentPlayerId);

        // 射程内の全ての位置をチェック
        for (let x = casterPosition.x - this.range; x <= casterPosition.x + this.range; x++) {
            for (let y = casterPosition.y - this.range; y <= casterPosition.y + this.range; y++) {
                const distance = this.calculateDistance(casterPosition, { x, y });
                if (distance <= this.range) {
                    const character = battlefieldState.getCharacterAt?.({ x, y });
                    if (character && caster && this.isValidTarget(character, caster)) {
                        validTargets.push({ x, y });
                    }
                }
            }
        }

        return validTargets;
    }

    /**
     * 状態異常効果を適用
     */
    private applyStatusEffect(target: any, statusType: StatusEffectType, value: number, duration: number): void {
        // TODO: 実際の状態異常システムが実装されたら置き換え
        if (!target.statusEffects) {
            target.statusEffects = [];
        }

        target.statusEffects.push({
            type: statusType,
            value: value,
            remainingDuration: duration,
            appliedAt: new Date()
        });
    }
}