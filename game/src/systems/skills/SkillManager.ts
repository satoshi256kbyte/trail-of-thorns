/**
 * スキル管理システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillManager: スキルの登録・取得・管理を行うメインクラス
 * - スキルデータの整合性チェック機能
 * - キャラクター別スキル管理機能
 */

import {
    SkillData,
    CharacterSkillData,
    SkillLearnRecord,
    SkillFilter,
    SkillStatistics,
    SkillType,
    TargetType,
    SkillUsabilityError
} from '../../types/skill';

import {
    Skill,
    AttackSkill,
    HealSkill,
    BuffSkill,
    DebuffSkill,
    StatusSkill
} from './Skill';

/**
 * スキル管理エラー種別
 */
export enum SkillManagerError {
    /** スキルが既に登録済み */
    SKILL_ALREADY_REGISTERED = 'skill_already_registered',
    /** スキルが見つからない */
    SKILL_NOT_FOUND = 'skill_not_found',
    /** 無効なスキルデータ */
    INVALID_SKILL_DATA = 'invalid_skill_data',
    /** キャラクターが見つからない */
    CHARACTER_NOT_FOUND = 'character_not_found',
    /** スキル習得条件を満たしていない */
    LEARN_CONDITION_NOT_MET = 'learn_condition_not_met',
    /** スキルが既に習得済み */
    SKILL_ALREADY_LEARNED = 'skill_already_learned',
    /** データ整合性エラー */
    DATA_INTEGRITY_ERROR = 'data_integrity_error'
}

/**
 * スキル管理結果
 */
export interface SkillManagerResult {
    /** 成功フラグ */
    success: boolean;
    /** エラー種別 */
    error?: SkillManagerError;
    /** エラーメッセージ */
    message?: string;
    /** 追加データ */
    data?: any;
}

/**
 * スキル習得結果
 */
export interface SkillLearnResult extends SkillManagerResult {
    /** 習得したスキル */
    learnedSkill?: Skill;
    /** 習得記録 */
    learnRecord?: SkillLearnRecord;
}

/**
 * スキル管理システム
 * スキルの登録、取得、キャラクター別管理を行う
 */
export class SkillManager {
    /** 登録済みスキル（スキルID -> スキルインスタンス） */
    private skills: Map<string, Skill> = new Map();

    /** スキルデータ（スキルID -> スキルデータ） */
    private skillData: Map<string, SkillData> = new Map();

    /** キャラクタースキルデータ（キャラクターID -> スキルデータ） */
    private characterSkills: Map<string, CharacterSkillData> = new Map();

    /** スキル統計情報（スキルID -> 統計） */
    private skillStatistics: Map<string, SkillStatistics> = new Map();

    /**
     * スキルを登録する
     * @param skillData スキルデータ
     * @returns 登録結果
     */
    registerSkill(skillData: SkillData): SkillManagerResult {
        try {
            // データ整合性チェック
            const validationResult = this.validateSkillData(skillData);
            if (!validationResult.success) {
                return validationResult;
            }

            // 既に登録済みかチェック
            if (this.skills.has(skillData.id)) {
                return {
                    success: false,
                    error: SkillManagerError.SKILL_ALREADY_REGISTERED,
                    message: `スキル「${skillData.name}」は既に登録されています`
                };
            }

            // スキルインスタンスを作成
            const skill = this.createSkillInstance(skillData);
            if (!skill) {
                return {
                    success: false,
                    error: SkillManagerError.INVALID_SKILL_DATA,
                    message: `スキル「${skillData.name}」のインスタンス作成に失敗しました`
                };
            }

            // 登録
            this.skills.set(skillData.id, skill);
            this.skillData.set(skillData.id, skillData);

            // 統計情報を初期化
            this.skillStatistics.set(skillData.id, {
                totalUsageCount: 0,
                successCount: 0,
                failureCount: 0
            });

            return {
                success: true,
                message: `スキル「${skillData.name}」を登録しました`,
                data: { skill }
            };

        } catch (error) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: `スキル登録中にエラーが発生しました: ${error}`
            };
        }
    }

    /**
     * スキルを取得する
     * @param skillId スキルID
     * @returns スキルインスタンス（見つからない場合はnull）
     */
    getSkill(skillId: string): Skill | null {
        return this.skills.get(skillId) || null;
    }

    /**
     * スキルデータを取得する
     * @param skillId スキルID
     * @returns スキルデータ（見つからない場合はnull）
     */
    getSkillData(skillId: string): SkillData | null {
        return this.skillData.get(skillId) || null;
    }

    /**
     * 全スキルを取得する
     * @param filter フィルター条件（オプション）
     * @returns スキル配列
     */
    getAllSkills(filter?: SkillFilter): Skill[] {
        let skills = Array.from(this.skills.values());

        if (filter) {
            skills = skills.filter(skill => this.matchesFilter(skill, filter));
        }

        return skills;
    }

    /**
     * キャラクターのスキルを取得する
     * @param characterId キャラクターID
     * @returns キャラクターが習得しているスキル配列
     */
    getCharacterSkills(characterId: string): Skill[] {
        const characterSkillData = this.characterSkills.get(characterId);
        if (!characterSkillData) {
            return [];
        }

        const skills: Skill[] = [];
        for (const skillId of characterSkillData.learnedSkills) {
            const skill = this.getSkill(skillId);
            if (skill) {
                skills.push(skill);
            }
        }

        return skills;
    }

    /**
     * キャラクターのスキルデータを取得する
     * @param characterId キャラクターID
     * @returns キャラクタースキルデータ
     */
    getCharacterSkillData(characterId: string): CharacterSkillData | null {
        return this.characterSkills.get(characterId) || null;
    }

    /**
     * キャラクターがスキルを習得できるかチェックする
     * @param characterId キャラクターID
     * @param skillId スキルID
     * @param characterData キャラクターデータ（レベル、職業等）
     * @returns 習得可能性結果
     */
    canLearnSkill(characterId: string, skillId: string, characterData: any): SkillManagerResult {
        // スキルの存在チェック
        const skillData = this.getSkillData(skillId);
        if (!skillData) {
            return {
                success: false,
                error: SkillManagerError.SKILL_NOT_FOUND,
                message: `スキルID「${skillId}」が見つかりません`
            };
        }

        // キャラクターデータの存在チェック
        if (!characterData) {
            return {
                success: false,
                error: SkillManagerError.CHARACTER_NOT_FOUND,
                message: `キャラクターデータが見つかりません`
            };
        }

        // 既に習得済みかチェック
        const characterSkillData = this.getCharacterSkillData(characterId);
        if (characterSkillData && characterSkillData.learnedSkills.includes(skillId)) {
            return {
                success: false,
                error: SkillManagerError.SKILL_ALREADY_LEARNED,
                message: `スキル「${skillData.name}」は既に習得済みです`
            };
        }

        // 習得条件チェック
        const learnCondition = skillData.learnCondition;

        // レベル要件チェック
        if (learnCondition.level && characterData.level < learnCondition.level) {
            return {
                success: false,
                error: SkillManagerError.LEARN_CONDITION_NOT_MET,
                message: `レベル${learnCondition.level}以上が必要です（現在レベル${characterData.level}）`
            };
        }

        // 職業要件チェック
        if (learnCondition.jobRequirement && characterData.job !== learnCondition.jobRequirement) {
            return {
                success: false,
                error: SkillManagerError.LEARN_CONDITION_NOT_MET,
                message: `職業「${learnCondition.jobRequirement}」が必要です`
            };
        }

        // 前提スキルチェック
        if (learnCondition.prerequisiteSkills && learnCondition.prerequisiteSkills.length > 0) {
            const learnedSkills = characterSkillData?.learnedSkills || [];
            for (const prerequisiteSkillId of learnCondition.prerequisiteSkills) {
                if (!learnedSkills.includes(prerequisiteSkillId)) {
                    const prerequisiteSkillData = this.getSkillData(prerequisiteSkillId);
                    const skillName = prerequisiteSkillData?.name || prerequisiteSkillId;
                    return {
                        success: false,
                        error: SkillManagerError.LEARN_CONDITION_NOT_MET,
                        message: `前提スキル「${skillName}」の習得が必要です`
                    };
                }
            }
        }

        // 必要アイテムチェック
        if (learnCondition.requiredItems && learnCondition.requiredItems.length > 0) {
            const inventory = characterData.inventory || [];
            for (const requiredItem of learnCondition.requiredItems) {
                if (!inventory.includes(requiredItem)) {
                    return {
                        success: false,
                        error: SkillManagerError.LEARN_CONDITION_NOT_MET,
                        message: `アイテム「${requiredItem}」が必要です`
                    };
                }
            }
        }

        return {
            success: true,
            message: `スキル「${skillData.name}」を習得できます`
        };
    }

    /**
     * キャラクターにスキルを習得させる
     * @param characterId キャラクターID
     * @param skillId スキルID
     * @param characterData キャラクターデータ
     * @param learnMethod 習得方法
     * @returns 習得結果
     */
    learnSkill(
        characterId: string,
        skillId: string,
        characterData: any,
        learnMethod: 'level_up' | 'item' | 'event' | 'job_change' = 'level_up'
    ): SkillLearnResult {
        // 習得可能性チェック
        const canLearnResult = this.canLearnSkill(characterId, skillId, characterData);
        if (!canLearnResult.success) {
            return canLearnResult as SkillLearnResult;
        }

        const skillData = this.getSkillData(skillId)!;
        const skill = this.getSkill(skillId)!;

        // キャラクタースキルデータを取得または作成
        let characterSkillData = this.getCharacterSkillData(characterId);
        if (!characterSkillData) {
            characterSkillData = this.createCharacterSkillData(characterId);
            this.characterSkills.set(characterId, characterSkillData);
        }

        // スキルを習得済みリストに追加
        characterSkillData.learnedSkills.push(skillId);

        // 習得記録を作成
        const learnRecord: SkillLearnRecord = {
            skillId,
            learnedAtLevel: characterData.level,
            learnedAt: new Date(),
            learnMethod
        };

        characterSkillData.skillLearnHistory.push(learnRecord);

        return {
            success: true,
            message: `スキル「${skillData.name}」を習得しました`,
            learnedSkill: skill,
            learnRecord
        };
    }

    /**
     * スキルデータの整合性をチェックする
     * @param skillData スキルデータ
     * @returns チェック結果
     */
    private validateSkillData(skillData: SkillData): SkillManagerResult {
        // 必須フィールドチェック
        if (!skillData.id || !skillData.name) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: 'スキルIDまたは名前が設定されていません'
            };
        }

        // スキル種別チェック
        if (!Object.values(SkillType).includes(skillData.skillType)) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: `無効なスキル種別: ${skillData.skillType}`
            };
        }

        // 対象種別チェック
        if (!Object.values(TargetType).includes(skillData.targetType)) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: `無効な対象種別: ${skillData.targetType}`
            };
        }

        // 射程チェック
        if (skillData.range < 0) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: '射程は0以上である必要があります'
            };
        }

        // 効果範囲チェック
        if (!skillData.areaOfEffect || skillData.areaOfEffect.size < 0) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: '効果範囲の設定が無効です'
            };
        }

        // 効果チェック
        if (!skillData.effects || skillData.effects.length === 0) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: 'スキル効果が設定されていません'
            };
        }

        // 使用条件チェック
        if (!skillData.usageCondition) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: '使用条件が設定されていません'
            };
        }

        if (skillData.usageCondition.mpCost < 0) {
            return {
                success: false,
                error: SkillManagerError.INVALID_SKILL_DATA,
                message: 'MP消費量は0以上である必要があります'
            };
        }

        // 前提スキルの循環参照チェック
        if (skillData.learnCondition.prerequisiteSkills) {
            const visited = new Set<string>();
            const recursionStack = new Set<string>();

            if (this.hasCircularDependency(skillData.id, skillData.learnCondition.prerequisiteSkills, visited, recursionStack)) {
                return {
                    success: false,
                    error: SkillManagerError.DATA_INTEGRITY_ERROR,
                    message: '前提スキルに循環参照があります'
                };
            }
        }

        return { success: true };
    }

    /**
     * スキルインスタンスを作成する
     * @param skillData スキルデータ
     * @returns スキルインスタンス
     */
    private createSkillInstance(skillData: SkillData): Skill | null {
        try {
            switch (skillData.skillType) {
                case SkillType.ATTACK:
                    return new AttackSkill(skillData);
                case SkillType.HEAL:
                    return new HealSkill(skillData);
                case SkillType.BUFF:
                    return new BuffSkill(skillData);
                case SkillType.DEBUFF:
                    return new DebuffSkill(skillData);
                case SkillType.STATUS:
                    return new StatusSkill(skillData);
                case SkillType.SPECIAL:
                    // 特殊スキルは基底クラスを使用（将来的に専用クラスを作成予定）
                    return new AttackSkill(skillData);
                default:
                    return null;
            }
        } catch (error) {
            console.error(`スキルインスタンス作成エラー: ${error}`);
            return null;
        }
    }

    /**
     * キャラクタースキルデータを作成する
     * @param characterId キャラクターID
     * @returns キャラクタースキルデータ
     */
    private createCharacterSkillData(characterId: string): CharacterSkillData {
        return {
            characterId,
            learnedSkills: [],
            skillCooldowns: new Map(),
            skillUsageCounts: new Map(),
            skillLearnHistory: [],
            activeEffects: []
        };
    }

    /**
     * スキルがフィルター条件に一致するかチェックする
     * @param skill スキル
     * @param filter フィルター条件
     * @returns 一致するかどうか
     */
    private matchesFilter(skill: Skill, filter: SkillFilter): boolean {
        if (filter.skillType && skill.skillType !== filter.skillType) {
            return false;
        }

        if (filter.targetType && skill.targetType !== filter.targetType) {
            return false;
        }

        if (filter.minLevel && skill.usageCondition.levelRequirement < filter.minLevel) {
            return false;
        }

        if (filter.maxLevel && skill.usageCondition.levelRequirement > filter.maxLevel) {
            return false;
        }

        if (filter.jobRequirement && skill.usageCondition.jobRequirement !== filter.jobRequirement) {
            return false;
        }

        return true;
    }

    /**
     * 前提スキルの循環参照をチェックする
     * @param skillId チェック対象のスキルID
     * @param prerequisites 前提スキルリスト
     * @param visited 訪問済みスキル
     * @param recursionStack 再帰スタック
     * @returns 循環参照があるかどうか
     */
    private hasCircularDependency(
        skillId: string,
        prerequisites: string[],
        visited: Set<string>,
        recursionStack: Set<string>
    ): boolean {
        visited.add(skillId);
        recursionStack.add(skillId);

        for (const prerequisiteId of prerequisites) {
            if (!visited.has(prerequisiteId)) {
                const prerequisiteData = this.getSkillData(prerequisiteId);
                if (prerequisiteData && prerequisiteData.learnCondition.prerequisiteSkills) {
                    if (this.hasCircularDependency(
                        prerequisiteId,
                        prerequisiteData.learnCondition.prerequisiteSkills,
                        visited,
                        recursionStack
                    )) {
                        return true;
                    }
                }
            } else if (recursionStack.has(prerequisiteId)) {
                return true;
            }
        }

        recursionStack.delete(skillId);
        return false;
    }

    /**
     * スキル統計情報を取得する
     * @param skillId スキルID
     * @returns 統計情報
     */
    getSkillStatistics(skillId: string): SkillStatistics | null {
        return this.skillStatistics.get(skillId) || null;
    }

    /**
     * スキル統計情報を更新する
     * @param skillId スキルID
     * @param success 成功フラグ
     * @param damage ダメージ（オプション）
     * @param isCritical クリティカルフラグ（オプション）
     */
    updateSkillStatistics(skillId: string, success: boolean, damage?: number, isCritical?: boolean): void {
        let stats = this.skillStatistics.get(skillId);
        if (!stats) {
            stats = {
                totalUsageCount: 0,
                successCount: 0,
                failureCount: 0
            };
            this.skillStatistics.set(skillId, stats);
        }

        stats.totalUsageCount++;
        if (success) {
            stats.successCount++;
        } else {
            stats.failureCount++;
        }

        if (damage !== undefined) {
            if (stats.averageDamage === undefined) {
                stats.averageDamage = damage;
                stats.maxDamage = damage;
            } else {
                stats.averageDamage = (stats.averageDamage * (stats.successCount - 1) + damage) / stats.successCount;
                stats.maxDamage = Math.max(stats.maxDamage || 0, damage);
            }
        }

        if (isCritical) {
            stats.criticalCount = (stats.criticalCount || 0) + 1;
        }

        stats.lastUsedAt = new Date();
    }

    /**
     * 登録済みスキル数を取得する
     * @returns スキル数
     */
    getSkillCount(): number {
        return this.skills.size;
    }

    /**
     * キャラクター数を取得する
     * @returns キャラクター数
     */
    getCharacterCount(): number {
        return this.characterSkills.size;
    }

    /**
     * 全データをクリアする（テスト用）
     */
    clear(): void {
        this.skills.clear();
        this.skillData.clear();
        this.characterSkills.clear();
        this.skillStatistics.clear();
    }
}