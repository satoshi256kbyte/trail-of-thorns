/**
 * 経験値テーブルデータの検証とエラーハンドリング
 * JSONスキーマに基づくデータ整合性チェック機能を提供
 */

import {
    ExperienceTableSchema,
    EXPERIENCE_TABLE_JSON_SCHEMA,
    ExperienceTableValidationError,
    ValidationResult,
    ValidationError,
    ValidationWarning
} from '../../schemas/experienceTableSchema';

export class ExperienceTableValidator {
    private static instance: ExperienceTableValidator;

    static getInstance(): ExperienceTableValidator {
        if (!ExperienceTableValidator.instance) {
            ExperienceTableValidator.instance = new ExperienceTableValidator();
        }
        return ExperienceTableValidator.instance;
    }

    /**
     * 経験値テーブルデータの包括的検証
     */
    validateExperienceTable(data: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        try {
            // 基本スキーマ検証
            const schemaValidation = this.validateSchema(data);
            errors.push(...schemaValidation.errors);
            warnings.push(...schemaValidation.warnings);

            if (schemaValidation.isValid) {
                // 詳細なビジネスロジック検証
                const businessValidation = this.validateBusinessLogic(data as ExperienceTableSchema);
                errors.push(...businessValidation.errors);
                warnings.push(...businessValidation.warnings);
            }

        } catch (error) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_SCHEMA,
                message: `検証中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
                value: data
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * JSONスキーマに基づく基本検証
     */
    private validateSchema(data: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 必須フィールドの存在確認
        const requiredFields = EXPERIENCE_TABLE_JSON_SCHEMA.required;
        for (const field of requiredFields) {
            if (!(field in data)) {
                errors.push({
                    type: ExperienceTableValidationError.MISSING_REQUIRED_FIELD,
                    message: `必須フィールド '${field}' が見つかりません`,
                    path: field
                });
            }
        }

        // バージョン形式の検証
        if (data.version && typeof data.version === 'string') {
            const versionPattern = /^\d+\.\d+\.\d+$/;
            if (!versionPattern.test(data.version)) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_VERSION,
                    message: 'バージョン形式が正しくありません (例: "1.0.0")',
                    path: 'version',
                    value: data.version
                });
            }
        }

        // レベル要件配列の検証
        if (data.levelRequirements) {
            const levelValidation = this.validateLevelRequirements(data.levelRequirements);
            errors.push(...levelValidation.errors);
            warnings.push(...levelValidation.warnings);
        }

        // 経験値獲得設定の検証
        if (data.experienceGains) {
            const gainsValidation = this.validateExperienceGains(data.experienceGains);
            errors.push(...gainsValidation.errors);
            warnings.push(...gainsValidation.warnings);
        }

        // 成長率データの検証
        if (data.defaultGrowthRates) {
            const defaultGrowthValidation = this.validateGrowthRates(data.defaultGrowthRates, 'defaultGrowthRates');
            errors.push(...defaultGrowthValidation.errors);
            warnings.push(...defaultGrowthValidation.warnings);
        }

        if (data.characterGrowthRates) {
            const characterGrowthValidation = this.validateCharacterGrowthRates(data.characterGrowthRates);
            errors.push(...characterGrowthValidation.errors);
            warnings.push(...characterGrowthValidation.warnings);
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * ビジネスロジックに基づく詳細検証
     */
    private validateBusinessLogic(data: ExperienceTableSchema): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // レベル要件の整合性チェック
        if (data.levelRequirements.length !== data.maxLevel + 1) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS,
                message: `レベル要件配列の長さ(${data.levelRequirements.length})が最大レベル+1(${data.maxLevel + 1})と一致しません`,
                path: 'levelRequirements'
            });
        }

        // レベル要件の昇順チェック
        for (let i = 1; i < data.levelRequirements.length; i++) {
            if (data.levelRequirements[i] <= data.levelRequirements[i - 1]) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS,
                    message: `レベル${i}の必要経験値(${data.levelRequirements[i]})がレベル${i - 1}(${data.levelRequirements[i - 1]})以下です`,
                    path: `levelRequirements[${i}]`,
                    value: data.levelRequirements[i]
                });
            }
        }

        // 経験値獲得量のバランスチェック
        const gains = data.experienceGains;
        if (gains.enemyDefeat < gains.attackHit) {
            warnings.push({
                message: '敵撃破の経験値が攻撃命中より少ないです',
                path: 'experienceGains.enemyDefeat',
                suggestion: '敵撃破の経験値を攻撃命中より多く設定することを推奨します'
            });
        }

        // 成長率の合理性チェック
        Object.entries(data.characterGrowthRates).forEach(([characterType, rates]) => {
            const totalGrowthRate = Object.values(rates).reduce((sum, rate) => sum + rate, 0);
            if (totalGrowthRate < 200) {
                warnings.push({
                    message: `${characterType}の成長率合計(${totalGrowthRate}%)が低すぎる可能性があります`,
                    path: `characterGrowthRates.${characterType}`,
                    suggestion: '成長率の合計を300-400%程度に設定することを推奨します'
                });
            } else if (totalGrowthRate > 600) {
                warnings.push({
                    message: `${characterType}の成長率合計(${totalGrowthRate}%)が高すぎる可能性があります`,
                    path: `characterGrowthRates.${characterType}`,
                    suggestion: '成長率の合計を300-400%程度に設定することを推奨します'
                });
            }
        });

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * レベル要件配列の検証
     */
    private validateLevelRequirements(levelRequirements: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (!Array.isArray(levelRequirements)) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS,
                message: 'levelRequirementsは配列である必要があります',
                path: 'levelRequirements',
                value: levelRequirements
            });
            return { isValid: false, errors, warnings };
        }

        if (levelRequirements.length < 2) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS,
                message: 'levelRequirementsは最低2つの要素が必要です',
                path: 'levelRequirements',
                value: levelRequirements
            });
        }

        if (levelRequirements[0] !== 0) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS,
                message: 'レベル0の必要経験値は0である必要があります',
                path: 'levelRequirements[0]',
                value: levelRequirements[0]
            });
        }

        levelRequirements.forEach((requirement: any, index: number) => {
            if (typeof requirement !== 'number' || requirement < 0) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS,
                    message: `レベル${index}の必要経験値は0以上の数値である必要があります`,
                    path: `levelRequirements[${index}]`,
                    value: requirement
                });
            }
        });

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * 経験値獲得設定の検証
     */
    private validateExperienceGains(experienceGains: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (typeof experienceGains !== 'object' || experienceGains === null) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_EXPERIENCE_GAINS,
                message: 'experienceGainsはオブジェクトである必要があります',
                path: 'experienceGains',
                value: experienceGains
            });
            return { isValid: false, errors, warnings };
        }

        const requiredGains = ['attackHit', 'enemyDefeat', 'allySupport', 'healing'];
        for (const gain of requiredGains) {
            if (!(gain in experienceGains)) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_EXPERIENCE_GAINS,
                    message: `必須の経験値獲得設定 '${gain}' が見つかりません`,
                    path: `experienceGains.${gain}`
                });
            } else if (typeof experienceGains[gain] !== 'number' || experienceGains[gain] < 0) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_EXPERIENCE_GAINS,
                    message: `${gain}は0以上の数値である必要があります`,
                    path: `experienceGains.${gain}`,
                    value: experienceGains[gain]
                });
            }
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * 成長率データの検証
     */
    private validateGrowthRates(growthRates: any, path: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (typeof growthRates !== 'object' || growthRates === null) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_GROWTH_RATES,
                message: '成長率データはオブジェクトである必要があります',
                path,
                value: growthRates
            });
            return { isValid: false, errors, warnings };
        }

        const requiredStats = ['hp', 'mp', 'attack', 'defense', 'speed', 'skill', 'luck'];
        for (const stat of requiredStats) {
            if (!(stat in growthRates)) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_GROWTH_RATES,
                    message: `必須の成長率 '${stat}' が見つかりません`,
                    path: `${path}.${stat}`
                });
            } else if (typeof growthRates[stat] !== 'number' || growthRates[stat] < 0 || growthRates[stat] > 100) {
                errors.push({
                    type: ExperienceTableValidationError.INVALID_GROWTH_RATES,
                    message: `${stat}の成長率は0-100の範囲である必要があります`,
                    path: `${path}.${stat}`,
                    value: growthRates[stat]
                });
            }
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * キャラクター別成長率データの検証
     */
    private validateCharacterGrowthRates(characterGrowthRates: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (typeof characterGrowthRates !== 'object' || characterGrowthRates === null) {
            errors.push({
                type: ExperienceTableValidationError.INVALID_GROWTH_RATES,
                message: 'characterGrowthRatesはオブジェクトである必要があります',
                path: 'characterGrowthRates',
                value: characterGrowthRates
            });
            return { isValid: false, errors, warnings };
        }

        Object.entries(characterGrowthRates).forEach(([characterType, rates]) => {
            const characterValidation = this.validateGrowthRates(rates, `characterGrowthRates.${characterType}`);
            errors.push(...characterValidation.errors);
            warnings.push(...characterValidation.warnings);
        });

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * データ整合性の詳細チェック
     */
    validateDataIntegrity(data: ExperienceTableSchema): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 経験値テーブルの妥当性チェック
        const maxExperience = data.levelRequirements[data.levelRequirements.length - 1];
        if (maxExperience > 1000000) {
            warnings.push({
                message: `最大レベルの必要経験値(${maxExperience})が非常に高く設定されています`,
                path: 'levelRequirements',
                suggestion: '現実的な範囲での設定を検討してください'
            });
        }

        // 成長率の職業間バランスチェック
        const characterTypes = Object.keys(data.characterGrowthRates);
        if (characterTypes.length < 3) {
            warnings.push({
                message: `職業の種類(${characterTypes.length})が少ないです`,
                path: 'characterGrowthRates',
                suggestion: '多様な職業を設定することでゲームバランスが向上します'
            });
        }

        // 経験値倍率の妥当性チェック
        const multipliers = data.experienceMultipliers;
        if (multipliers.easy <= multipliers.normal) {
            warnings.push({
                message: 'イージーモードの経験値倍率がノーマル以下です',
                path: 'experienceMultipliers.easy',
                suggestion: 'イージーモードはノーマルより高い倍率を設定することを推奨します'
            });
        }

        return { isValid: errors.length === 0, errors, warnings };
    }

    /**
     * エラーメッセージのフォーマット
     */
    formatValidationErrors(result: ValidationResult): string {
        if (result.isValid) {
            return '検証に成功しました。';
        }

        const errorMessages = result.errors.map(error =>
            `[エラー] ${error.message}${error.path ? ` (パス: ${error.path})` : ''}`
        );

        const warningMessages = result.warnings.map(warning =>
            `[警告] ${warning.message}${warning.path ? ` (パス: ${warning.path})` : ''}${warning.suggestion ? ` - ${warning.suggestion}` : ''}`
        );

        return [...errorMessages, ...warningMessages].join('\n');
    }
}