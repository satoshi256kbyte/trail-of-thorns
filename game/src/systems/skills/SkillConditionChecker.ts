/**
 * スキル使用条件判定システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillConditionChecker: スキル使用条件の判定を行うメインクラス
 * - MP、レベル、装備等の条件チェック機能
 * - 有効な対象位置計算機能
 * - クールダウンと使用回数制限の管理機能
 */

import {
    SkillData,
    SkillUsabilityResult,
    SkillUsabilityError,
    Position,
    TargetType,
    StatusEffectType,
    CharacterSkillData
} from '../../types/skill';

import { Skill } from './Skill';

/**
 * 戦場状態インターフェース（仮定義）
 * 実際の戦場システムが実装されたら置き換える
 */
interface BattlefieldState {
    /** キャラクターを取得 */
    getCharacter?(characterId: string): any;
    /** 指定位置のキャラクターを取得 */
    getCharacterAt?(position: Position): any;
    /** 現在のプレイヤーを取得 */
    getCurrentPlayer?(): string;
    /** 現在のターン数を取得 */
    getCurrentTurn?(): number;
    /** マップの境界をチェック */
    isValidPosition?(position: Position): boolean;
    /** 位置が障害物かチェック */
    isObstacle?(position: Position): boolean;
}

/**
 * キャラクターデータインターフェース（仮定義）
 */
interface CharacterData {
    id: string;
    level: number;
    currentMP: number;
    currentHP: number;
    position: Position;
    faction: 'player' | 'enemy';
    hasActed: boolean;
    job?: string;
    equipment?: {
        weapon?: string;
        armor?: string;
        accessory?: string;
    };
    statusEffects?: Array<{
        type: StatusEffectType;
        remainingDuration: number;
    }>;
    stats: {
        maxHP: number;
        maxMP: number;
        attack: number;
        defense: number;
        magicAttack: number;
        magicDefense: number;
        speed: number;
    };
}

/**
 * 条件チェック結果の詳細情報
 */
export interface ConditionCheckDetail {
    /** チェック項目名 */
    condition: string;
    /** チェック結果 */
    passed: boolean;
    /** 現在値 */
    currentValue?: number;
    /** 必要値 */
    requiredValue?: number;
    /** 詳細メッセージ */
    message?: string;
}

/**
 * 拡張されたスキル使用可能性結果
 */
export interface ExtendedSkillUsabilityResult extends SkillUsabilityResult {
    /** 詳細な条件チェック結果 */
    conditionDetails?: ConditionCheckDetail[];
    /** 有効な対象位置 */
    validTargets?: Position[];
    /** 推奨対象位置 */
    recommendedTargets?: Position[];
}

/**
 * スキル使用条件判定システム
 * スキルの使用可能性を総合的に判定する
 */
export class SkillConditionChecker {
    /** キャラクタースキルデータのキャッシュ */
    private characterSkillDataCache: Map<string, CharacterSkillData> = new Map();

    /**
     * スキルが使用可能かどうかを総合的にチェックする
     * @param skill スキル
     * @param casterId 使用者ID
     * @param targetPosition 対象位置
     * @param battlefieldState 戦場状態
     * @param characterSkillData キャラクタースキルデータ（オプション）
     * @returns 使用可能性結果
     */
    canUseSkill(
        skill: Skill,
        casterId: string,
        targetPosition: Position,
        battlefieldState: BattlefieldState,
        characterSkillData?: CharacterSkillData
    ): ExtendedSkillUsabilityResult {
        const conditionDetails: ConditionCheckDetail[] = [];

        // キャラクターデータを取得
        const caster = battlefieldState.getCharacter?.(casterId) as CharacterData;
        if (!caster) {
            return {
                canUse: false,
                error: SkillUsabilityError.SKILL_NOT_FOUND,
                message: 'キャラクターが見つかりません',
                conditionDetails: [{
                    condition: 'character_exists',
                    passed: false,
                    message: 'キャラクターが見つかりません'
                }]
            };
        }

        // キャラクタースキルデータを取得または作成
        if (!characterSkillData) {
            characterSkillData = this.getOrCreateCharacterSkillData(casterId);
        }

        // 各条件をチェック
        const mpCheck = this.checkMPRequirement(skill, caster);
        conditionDetails.push(mpCheck);

        const levelCheck = this.checkLevelRequirement(skill, caster);
        conditionDetails.push(levelCheck);

        const equipmentCheck = this.checkEquipmentRequirement(skill, caster);
        conditionDetails.push(equipmentCheck);

        const jobCheck = this.checkJobRequirement(skill, caster);
        conditionDetails.push(jobCheck);

        const cooldownCheck = this.checkCooldown(skill, characterSkillData, battlefieldState);
        conditionDetails.push(cooldownCheck);

        const usageLimitCheck = this.checkUsageLimit(skill, characterSkillData);
        conditionDetails.push(usageLimitCheck);

        const actionCheck = this.checkActionStatus(caster);
        conditionDetails.push(actionCheck);

        const statusCheck = this.checkStatusEffects(skill, caster);
        conditionDetails.push(statusCheck);

        const rangeCheck = this.checkRange(skill, caster, targetPosition);
        conditionDetails.push(rangeCheck);

        const targetCheck = this.checkTargetValidity(skill, caster, targetPosition, battlefieldState);
        conditionDetails.push(targetCheck);

        // 失敗した条件を特定
        const failedCondition = conditionDetails.find(detail => !detail.passed);

        if (failedCondition) {
            return {
                canUse: false,
                error: this.getErrorFromCondition(failedCondition.condition),
                message: failedCondition.message || '使用条件を満たしていません',
                conditionDetails,
                missingMP: failedCondition.condition === 'mp_requirement' ? failedCondition.requiredValue! - failedCondition.currentValue! : undefined,
                remainingCooldown: failedCondition.condition === 'cooldown' ? failedCondition.currentValue : undefined,
                remainingUses: failedCondition.condition === 'usage_limit' ? failedCondition.currentValue : undefined
            };
        }

        // 有効な対象位置を計算
        const validTargets = this.getValidTargets(skill, caster.position, battlefieldState);
        const recommendedTargets = this.getRecommendedTargets(skill, caster, validTargets, battlefieldState);

        return {
            canUse: true,
            message: 'スキルを使用できます',
            conditionDetails,
            validTargets,
            recommendedTargets,
            remainingUses: this.getRemainingUses(skill, characterSkillData)
        };
    }

    /**
     * 有効な対象位置を取得する
     * @param skill スキル
     * @param casterPosition 使用者位置
     * @param battlefieldState 戦場状態
     * @returns 有効な対象位置の配列
     */
    getValidTargets(
        skill: Skill,
        casterPosition: Position,
        battlefieldState: BattlefieldState
    ): Position[] {
        const validTargets: Position[] = [];
        const range = skill.range;

        // 射程内の全ての位置をチェック
        for (let x = casterPosition.x - range; x <= casterPosition.x + range; x++) {
            for (let y = casterPosition.y - range; y <= casterPosition.y + range; y++) {
                const targetPosition = { x, y };

                // マンハッタン距離で射程チェック
                const distance = Math.abs(casterPosition.x - x) + Math.abs(casterPosition.y - y);
                if (distance > range) {
                    continue;
                }

                // マップ境界チェック
                if (battlefieldState.isValidPosition && !battlefieldState.isValidPosition(targetPosition)) {
                    continue;
                }

                // 対象の有効性をチェック
                if (this.isValidTargetPosition(skill, casterPosition, targetPosition, battlefieldState)) {
                    validTargets.push(targetPosition);
                }
            }
        }

        return validTargets;
    }

    /**
     * 対象が有効かどうかを判定する
     * @param skill スキル
     * @param caster 使用者
     * @param target 対象
     * @returns 有効かどうか
     */
    isValidTarget(skill: Skill, caster: CharacterData, target: CharacterData): boolean {
        if (!target || !caster) {
            return false;
        }

        // 生存状態チェック
        if (target.currentHP <= 0) {
            // 回復スキルの場合は死亡キャラクターも対象にできる場合がある
            if (skill.skillType !== 'heal') {
                return false;
            }
        }

        // 対象種別による判定
        switch (skill.targetType) {
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

    /**
     * MP要件をチェックする
     */
    private checkMPRequirement(skill: Skill, caster: CharacterData): ConditionCheckDetail {
        const required = skill.usageCondition.mpCost;
        const current = caster.currentMP;

        return {
            condition: 'mp_requirement',
            passed: current >= required,
            currentValue: current,
            requiredValue: required,
            message: current >= required ? 'MP要件を満たしています' : `MP不足です（必要: ${required}, 現在: ${current}）`
        };
    }

    /**
     * レベル要件をチェックする
     */
    private checkLevelRequirement(skill: Skill, caster: CharacterData): ConditionCheckDetail {
        const required = skill.usageCondition.levelRequirement;
        const current = caster.level;

        return {
            condition: 'level_requirement',
            passed: current >= required,
            currentValue: current,
            requiredValue: required,
            message: current >= required ? 'レベル要件を満たしています' : `レベル不足です（必要: ${required}, 現在: ${current}）`
        };
    }

    /**
     * 装備要件をチェックする
     */
    private checkEquipmentRequirement(skill: Skill, caster: CharacterData): ConditionCheckDetail {
        const weaponRequirement = skill.usageCondition.weaponRequirement;

        if (!weaponRequirement || weaponRequirement.length === 0) {
            return {
                condition: 'equipment_requirement',
                passed: true,
                message: '装備要件はありません'
            };
        }

        const currentWeapon = caster.equipment?.weapon;
        const hasRequiredWeapon = currentWeapon && weaponRequirement.includes(currentWeapon);

        return {
            condition: 'equipment_requirement',
            passed: hasRequiredWeapon,
            message: hasRequiredWeapon
                ? '装備要件を満たしています'
                : `必要な武器を装備していません（必要: ${weaponRequirement.join(', ')}）`
        };
    }

    /**
     * 職業要件をチェックする
     */
    private checkJobRequirement(skill: Skill, caster: CharacterData): ConditionCheckDetail {
        const jobRequirement = skill.usageCondition.jobRequirement;

        if (!jobRequirement) {
            return {
                condition: 'job_requirement',
                passed: true,
                message: '職業要件はありません'
            };
        }

        const currentJob = caster.job;
        const hasRequiredJob = currentJob === jobRequirement;

        return {
            condition: 'job_requirement',
            passed: hasRequiredJob,
            message: hasRequiredJob
                ? '職業要件を満たしています'
                : `必要な職業ではありません（必要: ${jobRequirement}, 現在: ${currentJob || 'なし'}）`
        };
    }

    /**
     * クールダウンをチェックする
     */
    private checkCooldown(
        skill: Skill,
        characterSkillData: CharacterSkillData,
        battlefieldState: BattlefieldState
    ): ConditionCheckDetail {
        const currentTurn = battlefieldState.getCurrentTurn?.() || 0;
        const lastUsedTurn = characterSkillData.skillCooldowns.get(skill.id) || 0;
        const cooldownPeriod = skill.usageCondition.cooldown;

        if (cooldownPeriod === 0) {
            return {
                condition: 'cooldown',
                passed: true,
                message: 'クールダウンはありません'
            };
        }

        const turnsSinceLastUse = currentTurn - lastUsedTurn;
        const remainingCooldown = Math.max(0, cooldownPeriod - turnsSinceLastUse);

        return {
            condition: 'cooldown',
            passed: remainingCooldown === 0,
            currentValue: remainingCooldown,
            requiredValue: 0,
            message: remainingCooldown === 0
                ? 'クールダウンが完了しています'
                : `クールダウン中です（残り${remainingCooldown}ターン）`
        };
    }

    /**
     * 使用回数制限をチェックする
     */
    private checkUsageLimit(skill: Skill, characterSkillData: CharacterSkillData): ConditionCheckDetail {
        const usageLimit = skill.usageCondition.usageLimit;

        if (usageLimit === 0) {
            return {
                condition: 'usage_limit',
                passed: true,
                message: '使用回数制限はありません'
            };
        }

        const currentUsageCount = characterSkillData.skillUsageCounts.get(skill.id) || 0;
        const remainingUses = usageLimit - currentUsageCount;

        return {
            condition: 'usage_limit',
            passed: remainingUses > 0,
            currentValue: remainingUses,
            requiredValue: 1,
            message: remainingUses > 0
                ? `使用可能回数: ${remainingUses}回`
                : '使用回数制限に達しています'
        };
    }

    /**
     * 行動状態をチェックする
     */
    private checkActionStatus(caster: CharacterData): ConditionCheckDetail {
        const hasActed = caster.hasActed;

        return {
            condition: 'action_status',
            passed: !hasActed,
            message: hasActed ? 'このキャラクターは既に行動済みです' : '行動可能です'
        };
    }

    /**
     * 状態異常をチェックする
     */
    private checkStatusEffects(skill: Skill, caster: CharacterData): ConditionCheckDetail {
        const statusEffects = caster.statusEffects || [];
        const allowedStatuses = skill.usageCondition.allowedStatuses || [];

        // 使用を阻害する状態異常をチェック
        const blockingStatuses = [
            StatusEffectType.PARALYSIS,
            StatusEffectType.SLEEP,
            StatusEffectType.PETRIFICATION,
            StatusEffectType.CONFUSION
        ];

        // 沈黙は魔法系スキルのみ阻害
        if (skill.skillType === 'heal' || skill.skillType === 'buff' || skill.skillType === 'debuff') {
            blockingStatuses.push(StatusEffectType.SILENCE);
        }

        for (const statusEffect of statusEffects) {
            if (blockingStatuses.includes(statusEffect.type) && !allowedStatuses.includes(statusEffect.type)) {
                return {
                    condition: 'status_effects',
                    passed: false,
                    message: `状態異常「${statusEffect.type}」により使用できません`
                };
            }
        }

        return {
            condition: 'status_effects',
            passed: true,
            message: '状態異常による制限はありません'
        };
    }

    /**
     * 射程をチェックする
     */
    private checkRange(skill: Skill, caster: CharacterData, targetPosition: Position): ConditionCheckDetail {
        const distance = Math.abs(caster.position.x - targetPosition.x) + Math.abs(caster.position.y - targetPosition.y);
        const range = skill.range;

        return {
            condition: 'range',
            passed: distance <= range,
            currentValue: distance,
            requiredValue: range,
            message: distance <= range
                ? '射程内です'
                : `射程外です（距離: ${distance}, 射程: ${range}）`
        };
    }

    /**
     * 対象の有効性をチェックする
     */
    private checkTargetValidity(
        skill: Skill,
        caster: CharacterData,
        targetPosition: Position,
        battlefieldState: BattlefieldState
    ): ConditionCheckDetail {
        // 効果範囲内に有効な対象がいるかチェック
        const affectedPositions = skill.getAffectedPositions(targetPosition);
        let hasValidTarget = false;

        for (const position of affectedPositions) {
            const character = battlefieldState.getCharacterAt?.(position) as CharacterData;
            if (character && this.isValidTarget(skill, caster, character)) {
                hasValidTarget = true;
                break;
            }
        }

        return {
            condition: 'target_validity',
            passed: hasValidTarget,
            message: hasValidTarget ? '有効な対象がいます' : '有効な対象がいません'
        };
    }

    /**
     * 対象位置が有効かどうかをチェックする
     */
    private isValidTargetPosition(
        skill: Skill,
        casterPosition: Position,
        targetPosition: Position,
        battlefieldState: BattlefieldState
    ): boolean {
        // 効果範囲内に何らかの対象がいるかチェック
        const affectedPositions = skill.getAffectedPositions(targetPosition);

        for (const position of affectedPositions) {
            const character = battlefieldState.getCharacterAt?.(position);
            if (character) {
                return true;
            }
        }

        // 対象がいない場合でも、地形効果などがある場合は有効とする場合がある
        // 現在は対象がいる場合のみ有効とする
        return false;
    }

    /**
     * 推奨対象位置を取得する
     */
    private getRecommendedTargets(
        skill: Skill,
        caster: CharacterData,
        validTargets: Position[],
        battlefieldState: BattlefieldState
    ): Position[] {
        // 簡単な優先度付けを行う
        const scoredTargets = validTargets.map(position => {
            let score = 0;
            const affectedPositions = skill.getAffectedPositions(position);

            for (const affectedPos of affectedPositions) {
                const character = battlefieldState.getCharacterAt?.(affectedPos) as CharacterData;
                if (character && this.isValidTarget(skill, caster, character)) {
                    // スキル種別に応じてスコアを調整
                    switch (skill.skillType) {
                        case 'attack':
                            // 敵の場合、HPが低いほど高スコア
                            if (character.faction !== caster.faction) {
                                score += (1 - character.currentHP / character.stats.maxHP) * 10;
                            }
                            break;
                        case 'heal':
                            // 味方の場合、HPが低いほど高スコア
                            if (character.faction === caster.faction) {
                                score += (1 - character.currentHP / character.stats.maxHP) * 10;
                            }
                            break;
                        case 'buff':
                            // 味方の場合、攻撃力が高いほど高スコア
                            if (character.faction === caster.faction) {
                                score += character.stats.attack / 10;
                            }
                            break;
                        case 'debuff':
                        case 'status':
                            // 敵の場合、攻撃力が高いほど高スコア
                            if (character.faction !== caster.faction) {
                                score += character.stats.attack / 10;
                            }
                            break;
                    }
                }
            }

            return { position, score };
        });

        // スコア順にソートして上位を返す
        return scoredTargets
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(3, scoredTargets.length))
            .map(item => item.position);
    }

    /**
     * キャラクタースキルデータを取得または作成する
     */
    private getOrCreateCharacterSkillData(characterId: string): CharacterSkillData {
        let data = this.characterSkillDataCache.get(characterId);
        if (!data) {
            data = {
                characterId,
                learnedSkills: [],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: []
            };
            this.characterSkillDataCache.set(characterId, data);
        }
        return data;
    }

    /**
     * 条件名からエラー種別を取得する
     */
    private getErrorFromCondition(condition: string): SkillUsabilityError {
        switch (condition) {
            case 'mp_requirement':
                return SkillUsabilityError.INSUFFICIENT_MP;
            case 'level_requirement':
                return SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET;
            case 'equipment_requirement':
                return SkillUsabilityError.WEAPON_REQUIREMENT_NOT_MET;
            case 'job_requirement':
                return SkillUsabilityError.JOB_REQUIREMENT_NOT_MET;
            case 'cooldown':
                return SkillUsabilityError.SKILL_ON_COOLDOWN;
            case 'usage_limit':
                return SkillUsabilityError.USAGE_LIMIT_EXCEEDED;
            case 'action_status':
                return SkillUsabilityError.CHARACTER_ALREADY_ACTED;
            case 'status_effects':
                return SkillUsabilityError.CHARACTER_STATUS_PREVENTS_USE;
            case 'range':
                return SkillUsabilityError.OUT_OF_RANGE;
            case 'target_validity':
                return SkillUsabilityError.INVALID_TARGET;
            default:
                return SkillUsabilityError.SKILL_NOT_FOUND;
        }
    }

    /**
     * 残り使用回数を取得する
     */
    private getRemainingUses(skill: Skill, characterSkillData: CharacterSkillData): number | undefined {
        const usageLimit = skill.usageCondition.usageLimit;
        if (usageLimit === 0) {
            return undefined; // 無制限
        }

        const currentUsageCount = characterSkillData.skillUsageCounts.get(skill.id) || 0;
        return Math.max(0, usageLimit - currentUsageCount);
    }

    /**
     * スキル使用後にクールダウンを設定する
     * @param skillId スキルID
     * @param characterId キャラクターID
     * @param currentTurn 現在のターン
     */
    setSkillCooldown(skillId: string, characterId: string, currentTurn: number): void {
        const characterSkillData = this.getOrCreateCharacterSkillData(characterId);
        characterSkillData.skillCooldowns.set(skillId, currentTurn);
    }

    /**
     * スキル使用回数を増加させる
     * @param skillId スキルID
     * @param characterId キャラクターID
     */
    incrementSkillUsage(skillId: string, characterId: string): void {
        const characterSkillData = this.getOrCreateCharacterSkillData(characterId);
        const currentCount = characterSkillData.skillUsageCounts.get(skillId) || 0;
        characterSkillData.skillUsageCounts.set(skillId, currentCount + 1);
    }

    /**
     * ターン開始時にクールダウンを更新する
     * @param characterId キャラクターID
     * @param currentTurn 現在のターン
     */
    updateCooldowns(characterId: string, currentTurn: number): void {
        const characterSkillData = this.characterSkillDataCache.get(characterId);
        if (!characterSkillData) {
            return;
        }

        // 期限切れのクールダウンを削除
        for (const [skillId, lastUsedTurn] of characterSkillData.skillCooldowns.entries()) {
            if (currentTurn > lastUsedTurn) {
                // 実際のクールダウン期間は各スキルで異なるため、
                // ここでは単純に1ターン経過したものを削除
                // 実際の実装では、スキルデータを参照してクールダウン期間をチェックする
                characterSkillData.skillCooldowns.delete(skillId);
            }
        }
    }

    /**
     * 章開始時に使用回数をリセットする
     * @param characterId キャラクターID
     */
    resetUsageCounts(characterId: string): void {
        const characterSkillData = this.characterSkillDataCache.get(characterId);
        if (characterSkillData) {
            characterSkillData.skillUsageCounts.clear();
        }
    }

    /**
     * キャラクタースキルデータを設定する
     * @param characterId キャラクターID
     * @param data キャラクタースキルデータ
     */
    setCharacterSkillData(characterId: string, data: CharacterSkillData): void {
        this.characterSkillDataCache.set(characterId, data);
    }

    /**
     * キャラクタースキルデータを取得する
     * @param characterId キャラクターID
     * @returns キャラクタースキルデータ
     */
    getCharacterSkillData(characterId: string): CharacterSkillData | undefined {
        return this.characterSkillDataCache.get(characterId);
    }

    /**
     * 全データをクリアする（テスト用）
     */
    clear(): void {
        this.characterSkillDataCache.clear();
    }
}