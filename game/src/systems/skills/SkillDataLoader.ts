/**
 * スキルデータローダーとJSONスキーマ検証システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillDataLoader: スキルデータの読み込みと検証を行うメインクラス
 * - JSONスキーマ定義とバリデーション機能
 * - スキルデータの参照整合性チェック機能
 * - データ読み込みエラーのハンドリング
 */

import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    StatusEffectType,
    SkillEffect,
    SkillUsageCondition,
    SkillLearnCondition,
    SkillAnimation,
    AreaOfEffect
} from '../../types/skill';

/**
 * スキルデータローダーエラー種別
 */
export enum SkillDataLoaderError {
    /** ファイル読み込みエラー */
    FILE_LOAD_ERROR = 'file_load_error',
    /** JSON解析エラー */
    JSON_PARSE_ERROR = 'json_parse_error',
    /** スキーマ検証エラー */
    SCHEMA_VALIDATION_ERROR = 'schema_validation_error',
    /** 参照整合性エラー */
    REFERENCE_INTEGRITY_ERROR = 'reference_integrity_error',
    /** 重複スキルIDエラー */
    DUPLICATE_SKILL_ID_ERROR = 'duplicate_skill_id_error',
    /** 循環参照エラー */
    CIRCULAR_REFERENCE_ERROR = 'circular_reference_error',
    /** 無効なデータ形式エラー */
    INVALID_DATA_FORMAT_ERROR = 'invalid_data_format_error',
    /** ネットワークエラー */
    NETWORK_ERROR = 'network_error'
}

/**
 * データ読み込み結果
 */
export interface SkillDataLoadResult {
    /** 成功フラグ */
    success: boolean;
    /** 読み込まれたスキルデータ */
    skills?: SkillData[];
    /** エラー種別 */
    error?: SkillDataLoaderError;
    /** エラーメッセージ */
    message?: string;
    /** 詳細エラー情報 */
    details?: any;
    /** 警告メッセージ */
    warnings?: string[];
}

/**
 * スキーマ検証結果
 */
export interface SchemaValidationResult {
    /** 検証成功フラグ */
    valid: boolean;
    /** エラーメッセージ */
    errors: string[];
    /** 警告メッセージ */
    warnings: string[];
    /** 検証されたデータ */
    validatedData?: any;
}

/**
 * 参照整合性チェック結果
 */
export interface ReferenceIntegrityResult {
    /** チェック成功フラグ */
    valid: boolean;
    /** エラーメッセージ */
    errors: string[];
    /** 警告メッセージ */
    warnings: string[];
    /** 孤立した参照 */
    orphanedReferences: string[];
    /** 循環参照 */
    circularReferences: string[][];
}

/**
 * スキルデータローダー設定
 */
export interface SkillDataLoaderConfig {
    /** データファイルのパス */
    dataFilePath: string;
    /** 厳密な検証を行うか */
    strictValidation: boolean;
    /** 警告を無視するか */
    ignoreWarnings: boolean;
    /** キャッシュを使用するか */
    useCache: boolean;
    /** タイムアウト時間（ミリ秒） */
    timeout: number;
    /** リトライ回数 */
    retryCount: number;
}

/**
 * スキルデータローダー
 * JSONファイルからスキルデータを読み込み、検証を行う
 */
export class SkillDataLoader {
    /** 設定 */
    private config: SkillDataLoaderConfig;

    /** キャッシュされたスキルデータ */
    private cachedSkills: SkillData[] | null = null;

    /** 最後の読み込み時刻 */
    private lastLoadTime: Date | null = null;

    /** JSONスキーマ定義 */
    private readonly skillSchema = {
        type: 'object',
        required: ['id', 'name', 'description', 'skillType', 'targetType', 'range', 'areaOfEffect', 'effects', 'usageCondition', 'learnCondition', 'animation'],
        properties: {
            id: {
                type: 'string',
                pattern: '^[a-zA-Z0-9_-]+$',
                minLength: 1,
                maxLength: 50
            },
            name: {
                type: 'string',
                minLength: 1,
                maxLength: 100
            },
            description: {
                type: 'string',
                minLength: 1,
                maxLength: 500
            },
            skillType: {
                type: 'string',
                enum: Object.values(SkillType)
            },
            targetType: {
                type: 'string',
                enum: Object.values(TargetType)
            },
            range: {
                type: 'number',
                minimum: 0,
                maximum: 20
            },
            areaOfEffect: {
                type: 'object',
                required: ['shape', 'size'],
                properties: {
                    shape: {
                        type: 'string',
                        enum: ['single', 'line', 'cross', 'square', 'circle', 'diamond']
                    },
                    size: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10
                    },
                    minRange: {
                        type: 'number',
                        minimum: 0
                    }
                }
            },
            effects: {
                type: 'array',
                minItems: 1,
                maxItems: 10,
                items: {
                    type: 'object',
                    required: ['type', 'value'],
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['damage', 'heal', 'buff', 'debuff', 'status']
                        },
                        value: {
                            type: 'number'
                        },
                        duration: {
                            type: 'number',
                            minimum: 0,
                            maximum: 99
                        },
                        damageType: {
                            type: 'string',
                            enum: Object.values(DamageType)
                        },
                        healType: {
                            type: 'string',
                            enum: Object.values(HealType)
                        },
                        buffType: {
                            type: 'string',
                            enum: Object.values(BuffType)
                        },
                        statusType: {
                            type: 'string',
                            enum: Object.values(StatusEffectType)
                        },
                        successRate: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100
                        }
                    }
                }
            },
            usageCondition: {
                type: 'object',
                required: ['mpCost', 'cooldown', 'usageLimit', 'levelRequirement'],
                properties: {
                    mpCost: {
                        type: 'number',
                        minimum: 0,
                        maximum: 999
                    },
                    cooldown: {
                        type: 'number',
                        minimum: 0,
                        maximum: 99
                    },
                    usageLimit: {
                        type: 'number',
                        minimum: 0,
                        maximum: 99
                    },
                    levelRequirement: {
                        type: 'number',
                        minimum: 1,
                        maximum: 99
                    },
                    weaponRequirement: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    jobRequirement: {
                        type: 'string'
                    },
                    allowedStatuses: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: Object.values(StatusEffectType)
                        }
                    }
                }
            },
            learnCondition: {
                type: 'object',
                properties: {
                    level: {
                        type: 'number',
                        minimum: 1,
                        maximum: 99
                    },
                    prerequisiteSkills: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    jobRequirement: {
                        type: 'string'
                    },
                    requiredItems: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                }
            },
            animation: {
                type: 'object',
                required: ['castAnimation', 'effectAnimation', 'duration'],
                properties: {
                    castAnimation: {
                        type: 'string'
                    },
                    effectAnimation: {
                        type: 'string'
                    },
                    hitAnimation: {
                        type: 'string'
                    },
                    duration: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                    },
                    soundEffect: {
                        type: 'string'
                    }
                }
            },
            icon: {
                type: 'string'
            },
            aiPriority: {
                type: 'number',
                minimum: 0,
                maximum: 100
            }
        }
    };

    constructor(config: Partial<SkillDataLoaderConfig> = {}) {
        this.config = {
            dataFilePath: 'data/skills.json',
            strictValidation: true,
            ignoreWarnings: false,
            useCache: true,
            timeout: 5000,
            retryCount: 3,
            ...config
        };
    }

    /**
     * スキルデータを読み込む
     * @param forceReload キャッシュを無視して強制的に再読み込みするか
     * @returns 読み込み結果
     */
    async loadSkillData(forceReload: boolean = false): Promise<SkillDataLoadResult> {
        try {
            // キャッシュチェック
            if (!forceReload && this.config.useCache && this.cachedSkills) {
                return {
                    success: true,
                    skills: this.cachedSkills,
                    warnings: ['キャッシュからデータを読み込みました']
                };
            }

            // ファイル読み込み
            const rawData = await this.loadJsonFile(this.config.dataFilePath);
            if (!rawData.success) {
                return {
                    success: false,
                    error: rawData.error,
                    message: rawData.message,
                    details: rawData.details
                };
            }

            // スキーマ検証
            const validationResult = this.validateSkillDataSchema(rawData.data);
            if (!validationResult.valid) {
                return {
                    success: false,
                    error: SkillDataLoaderError.SCHEMA_VALIDATION_ERROR,
                    message: 'スキルデータのスキーマ検証に失敗しました',
                    details: validationResult.errors
                };
            }

            const skillsData: SkillData[] = rawData.data.skills || rawData.data;

            // 参照整合性チェック
            const integrityResult = this.checkReferenceIntegrity(skillsData);
            if (!integrityResult.valid && this.config.strictValidation) {
                return {
                    success: false,
                    error: SkillDataLoaderError.REFERENCE_INTEGRITY_ERROR,
                    message: '参照整合性チェックに失敗しました',
                    details: integrityResult.errors
                };
            }

            // 重複IDチェック
            const duplicateCheck = this.checkDuplicateIds(skillsData);
            if (!duplicateCheck.valid) {
                return {
                    success: false,
                    error: SkillDataLoaderError.DUPLICATE_SKILL_ID_ERROR,
                    message: '重複するスキルIDが見つかりました',
                    details: duplicateCheck.duplicates
                };
            }

            // データ正規化
            const normalizedSkills = this.normalizeSkillData(skillsData);

            // キャッシュに保存
            if (this.config.useCache) {
                this.cachedSkills = normalizedSkills;
                this.lastLoadTime = new Date();
            }

            // 警告メッセージを収集
            const warnings: string[] = [];
            warnings.push(...validationResult.warnings);
            warnings.push(...integrityResult.warnings);

            return {
                success: true,
                skills: normalizedSkills,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            return {
                success: false,
                error: SkillDataLoaderError.FILE_LOAD_ERROR,
                message: `スキルデータの読み込み中にエラーが発生しました: ${error}`,
                details: error
            };
        }
    }

    /**
     * JSONファイルを読み込む
     * @param filePath ファイルパス
     * @returns 読み込み結果
     */
    private async loadJsonFile(filePath: string): Promise<{
        success: boolean;
        data?: any;
        error?: SkillDataLoaderError;
        message?: string;
        details?: any;
    }> {
        let retryCount = 0;

        while (retryCount <= this.config.retryCount) {
            try {
                const response = await fetch(filePath, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(this.config.timeout)
                });

                if (!response || !response.ok) {
                    const status = response?.status || 'unknown';
                    const statusText = response?.statusText || 'unknown error';
                    throw new Error(`HTTP ${status}: ${statusText}`);
                }

                const text = await response.text();
                if (!text.trim()) {
                    return {
                        success: false,
                        error: SkillDataLoaderError.FILE_LOAD_ERROR,
                        message: 'ファイルが空です'
                    };
                }

                const data = JSON.parse(text);
                return {
                    success: true,
                    data
                };

            } catch (error) {
                retryCount++;

                if (error instanceof SyntaxError) {
                    return {
                        success: false,
                        error: SkillDataLoaderError.JSON_PARSE_ERROR,
                        message: `JSONの解析に失敗しました: ${error.message}`,
                        details: error
                    };
                }

                if (retryCount > this.config.retryCount) {
                    if (error && (error as any).name === 'AbortError') {
                        return {
                            success: false,
                            error: SkillDataLoaderError.NETWORK_ERROR,
                            message: `ファイル読み込みがタイムアウトしました (${this.config.timeout}ms)`,
                            details: error
                        };
                    }

                    return {
                        success: false,
                        error: SkillDataLoaderError.FILE_LOAD_ERROR,
                        message: `ファイルの読み込みに失敗しました: ${error}`,
                        details: error
                    };
                }

                // リトライ前に少し待機
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        return {
            success: false,
            error: SkillDataLoaderError.FILE_LOAD_ERROR,
            message: 'ファイルの読み込みに失敗しました'
        };
    }

    /**
     * スキルデータのスキーマを検証する
     * @param data 検証対象データ
     * @returns 検証結果
     */
    private validateSkillDataSchema(data: any): SchemaValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // ルートレベルの検証
            if (!data) {
                errors.push('データが空です');
                return { valid: false, errors, warnings };
            }

            // スキル配列の取得
            let skillsArray: any[];
            if (Array.isArray(data)) {
                skillsArray = data;
            } else if (data.skills && Array.isArray(data.skills)) {
                skillsArray = data.skills;
            } else {
                errors.push('スキルデータの配列が見つかりません');
                return { valid: false, errors, warnings };
            }

            if (skillsArray.length === 0) {
                warnings.push('スキルデータが空です');
            }

            // 各スキルの検証
            for (let i = 0; i < skillsArray.length; i++) {
                const skill = skillsArray[i];
                const skillErrors = this.validateSingleSkill(skill, i);
                errors.push(...skillErrors);
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings,
                validatedData: data
            };

        } catch (error) {
            errors.push(`スキーマ検証中にエラーが発生しました: ${error}`);
            return { valid: false, errors, warnings };
        }
    }

    /**
     * 単一スキルの検証
     * @param skill スキルデータ
     * @param index インデックス
     * @returns エラーメッセージ配列
     */
    private validateSingleSkill(skill: any, index: number): string[] {
        const errors: string[] = [];
        const prefix = `スキル[${index}]`;

        // 必須フィールドチェック
        const requiredFields = ['id', 'name', 'description', 'skillType', 'targetType', 'range', 'areaOfEffect', 'effects', 'usageCondition', 'learnCondition', 'animation'];
        for (const field of requiredFields) {
            if (!(field in skill) || skill[field] === undefined || skill[field] === null) {
                errors.push(`${prefix}: 必須フィールド「${field}」が不足しています`);
            }
        }

        // 必須フィールドが不足している場合は、それ以上の検証をスキップ
        if (errors.length > 0) {
            return errors;
        }

        // ID検証
        if (skill.id) {
            if (typeof skill.id !== 'string') {
                errors.push(`${prefix}: IDは文字列である必要があります`);
            } else if (!/^[a-zA-Z0-9_-]+$/.test(skill.id)) {
                errors.push(`${prefix}: IDは英数字、アンダースコア、ハイフンのみ使用可能です`);
            } else if (skill.id.length > 50) {
                errors.push(`${prefix}: IDは50文字以下である必要があります`);
            }
        }

        // 名前検証
        if (skill.name && (typeof skill.name !== 'string' || skill.name.length === 0)) {
            errors.push(`${prefix}: 名前は空でない文字列である必要があります`);
        }

        // スキル種別検証
        if (skill.skillType && !Object.values(SkillType).includes(skill.skillType)) {
            errors.push(`${prefix}: 無効なスキル種別「${skill.skillType}」`);
        }

        // 対象種別検証
        if (skill.targetType && !Object.values(TargetType).includes(skill.targetType)) {
            errors.push(`${prefix}: 無効な対象種別「${skill.targetType}」`);
        }

        // 射程検証
        if (skill.range !== undefined) {
            if (typeof skill.range !== 'number' || skill.range < 0 || skill.range > 20) {
                errors.push(`${prefix}: 射程は0-20の数値である必要があります`);
            }
        }

        // 効果範囲検証
        if (skill.areaOfEffect) {
            const aoe = skill.areaOfEffect;
            if (!aoe.shape || !['single', 'line', 'cross', 'square', 'circle', 'diamond'].includes(aoe.shape)) {
                errors.push(`${prefix}: 無効な効果範囲形状「${aoe.shape}」`);
            }
            if (typeof aoe.size !== 'number' || aoe.size < 0 || aoe.size > 10) {
                errors.push(`${prefix}: 効果範囲サイズは0-10の数値である必要があります`);
            }
        }

        // 効果検証
        if (skill.effects) {
            if (!Array.isArray(skill.effects) || skill.effects.length === 0) {
                errors.push(`${prefix}: 効果は空でない配列である必要があります`);
            } else {
                skill.effects.forEach((effect: any, effectIndex: number) => {
                    const effectPrefix = `${prefix}.effects[${effectIndex}]`;
                    if (!effect.type || !['damage', 'heal', 'buff', 'debuff', 'status'].includes(effect.type)) {
                        errors.push(`${effectPrefix}: 無効な効果種別「${effect.type}」`);
                    }
                    if (typeof effect.value !== 'number') {
                        errors.push(`${effectPrefix}: 効果値は数値である必要があります`);
                    }
                });
            }
        }

        // 使用条件検証
        if (skill.usageCondition) {
            const uc = skill.usageCondition;
            if (typeof uc.mpCost !== 'number' || uc.mpCost < 0) {
                errors.push(`${prefix}: MP消費量は0以上の数値である必要があります`);
            }
            if (typeof uc.cooldown !== 'number' || uc.cooldown < 0) {
                errors.push(`${prefix}: クールダウンは0以上の数値である必要があります`);
            }
            if (typeof uc.levelRequirement !== 'number' || uc.levelRequirement < 1) {
                errors.push(`${prefix}: レベル要件は1以上の数値である必要があります`);
            }
        }

        // アニメーション検証
        if (skill.animation) {
            const anim = skill.animation;
            if (!anim.castAnimation || typeof anim.castAnimation !== 'string') {
                errors.push(`${prefix}: 詠唱アニメーションは文字列である必要があります`);
            }
            if (!anim.effectAnimation || typeof anim.effectAnimation !== 'string') {
                errors.push(`${prefix}: 効果アニメーションは文字列である必要があります`);
            }
            if (typeof anim.duration !== 'number' || anim.duration < 0) {
                errors.push(`${prefix}: アニメーション時間は0以上の数値である必要があります`);
            }
        }

        return errors;
    }

    /**
     * 参照整合性をチェックする
     * @param skills スキルデータ配列
     * @returns チェック結果
     */
    private checkReferenceIntegrity(skills: SkillData[]): ReferenceIntegrityResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const orphanedReferences: string[] = [];
        const circularReferences: string[][] = [];

        // スキルIDのセットを作成
        const skillIds = new Set(skills.map(skill => skill.id));

        // 前提スキルの参照チェック
        for (const skill of skills) {
            if (skill.learnCondition.prerequisiteSkills) {
                for (const prerequisiteId of skill.learnCondition.prerequisiteSkills) {
                    if (!skillIds.has(prerequisiteId)) {
                        orphanedReferences.push(prerequisiteId);
                        errors.push(`スキル「${skill.id}」の前提スキル「${prerequisiteId}」が見つかりません`);
                    }
                }
            }
        }

        // 循環参照チェック
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        for (const skill of skills) {
            if (!visited.has(skill.id)) {
                const cycle = this.findCircularReference(skill.id, skills, visited, recursionStack, []);
                if (cycle.length > 0) {
                    circularReferences.push(cycle);
                    errors.push(`循環参照が検出されました: ${cycle.join(' -> ')}`);
                }
            }
        }

        // 孤立したスキル（他のスキルから参照されていない）の検出
        const referencedSkills = new Set<string>();
        for (const skill of skills) {
            if (skill.learnCondition.prerequisiteSkills) {
                skill.learnCondition.prerequisiteSkills.forEach(id => referencedSkills.add(id));
            }
        }

        const orphanedSkills = skills.filter(skill => !referencedSkills.has(skill.id) && skill.learnCondition.prerequisiteSkills?.length === 0);
        if (orphanedSkills.length > 0) {
            warnings.push(`${orphanedSkills.length}個の孤立したスキルが見つかりました`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            orphanedReferences,
            circularReferences
        };
    }

    /**
     * 循環参照を検出する
     * @param skillId 現在のスキルID
     * @param skills 全スキルデータ
     * @param visited 訪問済みスキル
     * @param recursionStack 再帰スタック
     * @param path 現在のパス
     * @returns 循環参照のパス（見つからない場合は空配列）
     */
    private findCircularReference(
        skillId: string,
        skills: SkillData[],
        visited: Set<string>,
        recursionStack: Set<string>,
        path: string[]
    ): string[] {
        visited.add(skillId);
        recursionStack.add(skillId);
        path.push(skillId);

        const skill = skills.find(s => s.id === skillId);
        if (skill && skill.learnCondition.prerequisiteSkills) {
            for (const prerequisiteId of skill.learnCondition.prerequisiteSkills) {
                if (!visited.has(prerequisiteId)) {
                    const cycle = this.findCircularReference(prerequisiteId, skills, visited, recursionStack, [...path]);
                    if (cycle.length > 0) {
                        return cycle;
                    }
                } else if (recursionStack.has(prerequisiteId)) {
                    // 循環参照を発見
                    const cycleStart = path.indexOf(prerequisiteId);
                    return path.slice(cycleStart).concat([prerequisiteId]);
                }
            }
        }

        recursionStack.delete(skillId);
        return [];
    }

    /**
     * 重複IDをチェックする
     * @param skills スキルデータ配列
     * @returns チェック結果
     */
    private checkDuplicateIds(skills: SkillData[]): { valid: boolean; duplicates: string[] } {
        const idCounts = new Map<string, number>();
        const duplicates: string[] = [];

        for (const skill of skills) {
            const count = idCounts.get(skill.id) || 0;
            idCounts.set(skill.id, count + 1);

            if (count === 1) {
                duplicates.push(skill.id);
            }
        }

        return {
            valid: duplicates.length === 0,
            duplicates
        };
    }

    /**
     * スキルデータを正規化する
     * @param skills スキルデータ配列
     * @returns 正規化されたスキルデータ配列
     */
    private normalizeSkillData(skills: SkillData[]): SkillData[] {
        return skills.map(skill => ({
            ...skill,
            // デフォルト値の設定
            icon: skill.icon || 'default_skill_icon',
            aiPriority: skill.aiPriority ?? 50,
            areaOfEffect: {
                ...skill.areaOfEffect,
                minRange: skill.areaOfEffect.minRange ?? 0
            },
            effects: skill.effects.map(effect => ({
                ...effect,
                duration: effect.duration ?? 0,
                successRate: effect.successRate ?? 100
            })),
            usageCondition: {
                ...skill.usageCondition,
                weaponRequirement: skill.usageCondition.weaponRequirement ?? [],
                allowedStatuses: skill.usageCondition.allowedStatuses ?? []
            },
            learnCondition: {
                ...skill.learnCondition,
                prerequisiteSkills: skill.learnCondition.prerequisiteSkills ?? [],
                requiredItems: skill.learnCondition.requiredItems ?? []
            },
            animation: {
                ...skill.animation,
                hitAnimation: skill.animation.hitAnimation ?? skill.animation.effectAnimation,
                soundEffect: skill.animation.soundEffect ?? 'default_skill_sound'
            }
        }));
    }

    /**
     * キャッシュをクリアする
     */
    clearCache(): void {
        this.cachedSkills = null;
        this.lastLoadTime = null;
    }

    /**
     * 最後の読み込み時刻を取得する
     * @returns 最後の読み込み時刻
     */
    getLastLoadTime(): Date | null {
        return this.lastLoadTime;
    }

    /**
     * キャッシュされたスキル数を取得する
     * @returns キャッシュされたスキル数
     */
    getCachedSkillCount(): number {
        return this.cachedSkills?.length ?? 0;
    }

    /**
     * 設定を更新する
     * @param newConfig 新しい設定
     */
    updateConfig(newConfig: Partial<SkillDataLoaderConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 現在の設定を取得する
     * @returns 現在の設定
     */
    getConfig(): SkillDataLoaderConfig {
        return { ...this.config };
    }
}