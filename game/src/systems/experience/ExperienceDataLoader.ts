/**
 * 経験値テーブル管理システム
 * JSONファイルからの経験値テーブル読み込み、データ検証、経験値計算を担当
 */

import { ExperienceTableData, ExperienceSource, ExperienceError, GrowthRates } from '../../types/experience';
import { ExperienceTableSchema } from '../../schemas/experienceTableSchema';
import { ExperienceTableValidator } from './ExperienceTableValidator';

/**
 * 経験値データローダークラス
 */
export class ExperienceDataLoader {
    private experienceTable: ExperienceTableSchema | null = null;
    private isLoaded: boolean = false;
    private validator: ExperienceTableValidator;

    /**
     * デフォルトの経験値テーブルデータ
     */
    private static readonly DEFAULT_EXPERIENCE_TABLE: ExperienceTableSchema = {
        version: "1.0.0",
        levelRequirements: [
            0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
            3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450,
            11500, 12600, 13750, 14950, 16200, 17500, 18850, 20250, 21700, 23200,
            24750, 26350, 28000, 29700, 31450, 33250, 35100, 37000, 38950, 40950,
            43000, 45100, 47250, 49450, 51700, 54000, 56350, 58750, 61200, 63700
        ],
        experienceGains: {
            attackHit: 5,
            enemyDefeat: 25,
            allySupport: 10,
            healing: 8,
            skillUse: 3,
            criticalHit: 8,
            counterAttack: 6
        },
        maxLevel: 49,
        defaultGrowthRates: {
            hp: 65,
            mp: 45,
            attack: 55,
            defense: 50,
            speed: 50,
            skill: 45,
            luck: 40
        },
        characterGrowthRates: {
            warrior: {
                hp: 80, mp: 20, attack: 70, defense: 65, speed: 45, skill: 40, luck: 35
            },
            mage: {
                hp: 45, mp: 85, attack: 35, defense: 30, speed: 55, skill: 75, luck: 50
            },
            archer: {
                hp: 60, mp: 40, attack: 65, defense: 40, speed: 70, skill: 80, luck: 60
            }
        },
        statLimits: {
            hp: 999, mp: 999, attack: 255, defense: 255, speed: 255, skill: 255, luck: 255
        },
        experienceMultipliers: {
            easy: 1.5, normal: 1.0, hard: 0.8, expert: 0.6
        }
    };

    constructor() {
        this.validator = ExperienceTableValidator.getInstance();
    }

    /**
     * JSONファイルから経験値テーブルを読み込む
     * @param filePath JSONファイルのパス
     * @returns 読み込み成功の可否
     */
    public async loadExperienceTable(filePath: string = 'data/experience-table.json'): Promise<boolean> {
        try {
            const response = await fetch(filePath);

            if (!response.ok) {
                console.warn(`Experience table file not found at ${filePath}, using default values`);
                this.experienceTable = { ...ExperienceDataLoader.DEFAULT_EXPERIENCE_TABLE };
                this.isLoaded = true;
                return true;
            }

            const data = await response.json();

            const validationResult = this.validator.validateExperienceTable(data);

            if (validationResult.isValid) {
                this.experienceTable = data as ExperienceTableSchema;
                this.isLoaded = true;
                console.log('Experience table loaded successfully');

                // 警告がある場合は表示
                if (validationResult.warnings.length > 0) {
                    console.warn('Experience table validation warnings:');
                    validationResult.warnings.forEach(warning => {
                        console.warn(`- ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
                    });
                }

                return true;
            } else {
                console.error('Invalid experience table data, using default values');
                console.error('Validation errors:');
                validationResult.errors.forEach(error => {
                    console.error(`- ${error.message}${error.path ? ` (${error.path})` : ''}`);
                });

                this.experienceTable = { ...ExperienceDataLoader.DEFAULT_EXPERIENCE_TABLE };
                this.isLoaded = true;
                return false;
            }
        } catch (error) {
            console.error('Error loading experience table:', error);
            this.experienceTable = { ...ExperienceDataLoader.DEFAULT_EXPERIENCE_TABLE };
            this.isLoaded = true;
            return false;
        }
    }

    /**
     * 経験値データの検証（バリデーターを使用）
     * @param data 検証対象のデータ
     * @returns データが有効かどうか
     */
    public validateExperienceData(data: any): data is ExperienceTableSchema {
        const validationResult = this.validator.validateExperienceTable(data);
        return validationResult.isValid;
    }

    /**
     * 指定レベルに必要な経験値を取得
     * @param level 対象レベル
     * @returns 必要経験値
     */
    public getRequiredExperience(level: number): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        if (level < 0) {
            throw new Error(`Invalid level: ${level}`);
        }

        if (level >= this.experienceTable.levelRequirements.length) {
            // 最大レベルを超えた場合は最大レベルの経験値を返す
            return this.experienceTable.levelRequirements[this.experienceTable.levelRequirements.length - 1];
        }

        return this.experienceTable.levelRequirements[level];
    }

    /**
     * 行動別の獲得経験値を取得
     * @param source 経験値獲得源
     * @param difficulty 難易度倍率（オプション）
     * @returns 獲得経験値
     */
    public getExperienceGain(source: ExperienceSource, difficulty: 'easy' | 'normal' | 'hard' | 'expert' = 'normal'): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        let baseExperience = 0;

        switch (source) {
            case ExperienceSource.ATTACK_HIT:
                baseExperience = this.experienceTable.experienceGains.attackHit;
                break;
            case ExperienceSource.ENEMY_DEFEAT:
                baseExperience = this.experienceTable.experienceGains.enemyDefeat;
                break;
            case ExperienceSource.ALLY_SUPPORT:
                baseExperience = this.experienceTable.experienceGains.allySupport;
                break;
            case ExperienceSource.HEALING:
                baseExperience = this.experienceTable.experienceGains.healing;
                break;
            case ExperienceSource.SKILL_USE:
                baseExperience = this.experienceTable.experienceGains.skillUse || 3;
                break;
            case ExperienceSource.CRITICAL_HIT:
                baseExperience = this.experienceTable.experienceGains.criticalHit || 8;
                break;
            case ExperienceSource.COUNTER_ATTACK:
                baseExperience = this.experienceTable.experienceGains.counterAttack || 6;
                break;
            default:
                console.warn(`Unknown experience source: ${source}`);
                return 0;
        }

        // 難易度倍率を適用
        const multiplier = this.experienceTable.experienceMultipliers[difficulty];
        return Math.floor(baseExperience * multiplier);
    }

    /**
     * 最大レベルを取得
     * @returns 最大レベル
     */
    public getMaxLevel(): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        return this.experienceTable.maxLevel;
    }

    /**
     * 経験値テーブルが読み込まれているかチェック
     * @returns 読み込み状態
     */
    public isDataLoaded(): boolean {
        return this.isLoaded && this.experienceTable !== null;
    }

    /**
     * キャラクター別成長率を取得
     * @param characterType キャラクタータイプ
     * @returns 成長率データ
     */
    public getGrowthRates(characterType: string): GrowthRates {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        // キャラクター固有の成長率があれば使用、なければデフォルトを使用
        const characterRates = this.experienceTable.characterGrowthRates[characterType];
        if (characterRates) {
            return { ...characterRates };
        }

        console.warn(`Growth rates not found for character type: ${characterType}, using default rates`);
        return { ...this.experienceTable.defaultGrowthRates };
    }

    /**
     * 能力値上限を取得
     * @param statName 能力値名
     * @returns 上限値
     */
    public getStatLimit(statName: keyof GrowthRates): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        return this.experienceTable.statLimits[statName];
    }

    /**
     * 全ての能力値上限を取得
     * @returns 能力値上限データ
     */
    public getAllStatLimits(): GrowthRates {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        return { ...this.experienceTable.statLimits };
    }

    /**
     * 利用可能なキャラクタータイプ一覧を取得
     * @returns キャラクタータイプの配列
     */
    public getAvailableCharacterTypes(): string[] {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        return Object.keys(this.experienceTable.characterGrowthRates);
    }

    /**
     * 経験値倍率を取得
     * @param difficulty 難易度
     * @returns 経験値倍率
     */
    public getExperienceMultiplier(difficulty: 'easy' | 'normal' | 'hard' | 'expert'): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        return this.experienceTable.experienceMultipliers[difficulty];
    }

    /**
     * 現在の経験値テーブルデータを取得（デバッグ用）
     * @returns 経験値テーブルデータのコピー
     */
    public getExperienceTableData(): ExperienceTableSchema | null {
        if (!this.experienceTable) {
            return null;
        }

        return JSON.parse(JSON.stringify(this.experienceTable));
    }

    /**
     * 指定した経験値から現在のレベルを計算
     * @param experience 現在の経験値
     * @returns 現在のレベル
     */
    public calculateLevelFromExperience(experience: number): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        if (experience < 0) {
            return 0;
        }

        // 経験値テーブルを逆順で検索して、現在の経験値以下の最大レベルを見つける
        for (let level = this.experienceTable.levelRequirements.length - 1; level >= 0; level--) {
            if (experience >= this.experienceTable.levelRequirements[level]) {
                return level;
            }
        }

        return 0;
    }

    /**
     * 次のレベルまでに必要な経験値を計算
     * @param currentExperience 現在の経験値
     * @returns 次のレベルまでに必要な経験値
     */
    public getExperienceToNextLevel(currentExperience: number): number {
        if (!this.isLoaded || !this.experienceTable) {
            throw new Error(ExperienceError.DATA_NOT_FOUND);
        }

        const currentLevel = this.calculateLevelFromExperience(currentExperience);

        // 最大レベルに達している場合
        if (currentLevel >= this.experienceTable.maxLevel) {
            return 0;
        }

        const nextLevelRequirement = this.experienceTable.levelRequirements[currentLevel + 1];
        return Math.max(0, nextLevelRequirement - currentExperience);
    }

    /**
     * データ整合性の詳細チェック
     * @returns 検証結果
     */
    public validateDataIntegrity(): boolean {
        if (!this.isLoaded || !this.experienceTable) {
            return false;
        }

        const validationResult = this.validator.validateDataIntegrity(this.experienceTable);

        if (!validationResult.isValid) {
            console.error('Data integrity validation failed:');
            validationResult.errors.forEach(error => {
                console.error(`- ${error.message}${error.path ? ` (${error.path})` : ''}`);
            });
        }

        if (validationResult.warnings.length > 0) {
            console.warn('Data integrity warnings:');
            validationResult.warnings.forEach(warning => {
                console.warn(`- ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
            });
        }

        return validationResult.isValid;
    }

    /**
     * テスト用：経験値テーブルデータを直接設定
     * @param data 経験値テーブルデータ
     */
    public setExperienceTableForTesting(data: ExperienceTableSchema): void {
        this.experienceTable = data;
        this.isLoaded = true;
    }
}