/**
 * 経験値管理システム
 * キャラクターの経験値付与、レベルアップ判定、経験値情報管理を担当
 */

import { ExperienceInfo, ExperienceSource, ExperienceError } from '../../types/experience';
import { ExperienceDataLoader } from './ExperienceDataLoader';
import { Unit } from '../../types/gameplay';

/**
 * キャラクター経験値データ
 */
interface CharacterExperienceData {
    characterId: string;
    currentExperience: number;
    currentLevel: number;
    totalExperience: number;
}

/**
 * 経験値管理クラス
 */
export class ExperienceManager {
    private experienceDataLoader: ExperienceDataLoader;
    private characterExperience: Map<string, CharacterExperienceData> = new Map();
    private eventEmitter?: Phaser.Events.EventEmitter;

    constructor(
        experienceDataLoader: ExperienceDataLoader,
        eventEmitter?: Phaser.Events.EventEmitter
    ) {
        this.experienceDataLoader = experienceDataLoader;
        this.eventEmitter = eventEmitter;
    }

    /**
     * キャラクターの経験値データを初期化
     * @param characterId キャラクターID
     * @param initialLevel 初期レベル（デフォルト: 1）
     * @param initialExperience 初期経験値（デフォルト: レベルに応じた値）
     */
    public initializeCharacterExperience(
        characterId: string,
        initialLevel: number = 1,
        initialExperience?: number
    ): void {
        if (!characterId) {
            throw new Error('Character ID cannot be empty');
        }

        if (initialLevel < 1) {
            throw new Error('Initial level must be at least 1');
        }

        if (initialLevel > this.experienceDataLoader.getMaxLevel()) {
            throw new Error(`Initial level cannot exceed max level (${this.experienceDataLoader.getMaxLevel()})`);
        }

        // 初期経験値が指定されていない場合、レベルに応じた経験値を設定
        let experience: number;
        if (initialExperience !== undefined) {
            if (initialExperience < 0) {
                throw new Error('Initial experience cannot be negative');
            }
            experience = initialExperience;
        } else {
            experience = this.experienceDataLoader.getRequiredExperience(initialLevel);
        }

        // 経験値からレベルを再計算（整合性確保）
        const calculatedLevel = this.experienceDataLoader.calculateLevelFromExperience(experience);
        const finalLevel = Math.max(initialLevel, calculatedLevel);

        this.characterExperience.set(characterId, {
            characterId,
            currentExperience: experience,
            currentLevel: finalLevel,
            totalExperience: experience
        });

        this.eventEmitter?.emit('character-experience-initialized', {
            characterId,
            level: finalLevel,
            experience
        });
    }

    /**
     * 経験値を付与
     * @param characterId キャラクターID
     * @param amount 付与する経験値
     * @param source 経験値獲得源
     * @returns 付与された経験値（最大レベル到達時は0）
     */
    public addExperience(characterId: string, amount: number, source: ExperienceSource): number {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (amount < 0) {
            throw new Error(ExperienceError.INVALID_EXPERIENCE_AMOUNT);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        // 最大レベル到達チェック
        const maxLevel = this.experienceDataLoader.getMaxLevel();
        if (characterData.currentLevel >= maxLevel) {
            console.warn(`Character ${characterId} has reached max level (${maxLevel}), experience gain ignored`);
            this.eventEmitter?.emit('experience-gain-ignored', {
                characterId,
                amount,
                source,
                reason: ExperienceError.MAX_LEVEL_REACHED
            });
            return 0;
        }

        // 経験値付与前の状態を記録
        const oldLevel = characterData.currentLevel;
        const oldExperience = characterData.currentExperience;

        // 経験値を付与
        characterData.currentExperience += amount;
        characterData.totalExperience += amount;

        // レベルは自動更新しない（LevelUpProcessorで処理）
        // 最大レベル到達時のみ経験値を上限に調整
        const calculatedLevel = this.experienceDataLoader.calculateLevelFromExperience(characterData.currentExperience);
        if (calculatedLevel >= maxLevel) {
            const maxLevelExperience = this.experienceDataLoader.getRequiredExperience(maxLevel);
            characterData.currentExperience = maxLevelExperience;
        }

        // イベント発行
        this.eventEmitter?.emit('experience-gained', {
            characterId,
            amount,
            source,
            oldExperience,
            newExperience: characterData.currentExperience,
            oldLevel,
            newLevel: characterData.currentLevel,
            levelUp: false // レベルアップ判定は別途行う
        });

        return amount;
    }

    /**
     * 現在の経験値を取得
     * @param characterId キャラクターID
     * @returns 現在の経験値
     */
    public getCurrentExperience(characterId: string): number {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        return characterData.currentExperience;
    }

    /**
     * 現在のレベルを取得
     * @param characterId キャラクターID
     * @returns 現在のレベル
     */
    public getCurrentLevel(characterId: string): number {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        return characterData.currentLevel;
    }

    /**
     * 次のレベルまでに必要な経験値を取得
     * @param characterId キャラクターID
     * @returns 次のレベルまでに必要な経験値（最大レベル到達時は0）
     */
    public getExperienceToNextLevel(characterId: string): number {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        // 最大レベル到達チェック
        const maxLevel = this.experienceDataLoader.getMaxLevel();
        if (characterData.currentLevel >= maxLevel) {
            return 0;
        }

        // 現在のレベルに基づいて次のレベルまでの必要経験値を計算
        const nextLevelRequirement = this.experienceDataLoader.getRequiredExperience(characterData.currentLevel + 1);
        return Math.max(0, nextLevelRequirement - characterData.currentExperience);
    }

    /**
     * レベルアップ可能かどうかを判定
     * @param characterId キャラクターID
     * @returns レベルアップ可能かどうか
     */
    public canLevelUp(characterId: string): boolean {
        if (!characterId) {
            return false;
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            return false;
        }

        // 最大レベル到達チェック
        const maxLevel = this.experienceDataLoader.getMaxLevel();
        if (characterData.currentLevel >= maxLevel) {
            return false;
        }

        // 次のレベルに必要な経験値をチェック
        const nextLevelRequirement = this.experienceDataLoader.getRequiredExperience(characterData.currentLevel + 1);



        return characterData.currentExperience >= nextLevelRequirement;
    }

    /**
     * 経験値情報を取得
     * @param characterId キャラクターID
     * @returns 経験値情報
     */
    public getExperienceInfo(characterId: string): ExperienceInfo {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        return {
            characterId,
            currentExperience: characterData.currentExperience,
            currentLevel: characterData.currentLevel,
            experienceToNextLevel: this.getExperienceToNextLevel(characterId),
            totalExperience: characterData.totalExperience
        };
    }

    /**
     * キャラクターが登録されているかチェック
     * @param characterId キャラクターID
     * @returns 登録されているかどうか
     */
    public hasCharacter(characterId: string): boolean {
        return this.characterExperience.has(characterId);
    }

    /**
     * 登録されている全キャラクターのIDを取得
     * @returns キャラクターIDの配列
     */
    public getAllCharacterIds(): string[] {
        return Array.from(this.characterExperience.keys());
    }

    /**
     * キャラクターの経験値データを削除
     * @param characterId キャラクターID
     * @returns 削除に成功したかどうか
     */
    public removeCharacter(characterId: string): boolean {
        const result = this.characterExperience.delete(characterId);

        if (result) {
            this.eventEmitter?.emit('character-experience-removed', { characterId });
        }

        return result;
    }

    /**
     * 全キャラクターの経験値データをクリア
     */
    public clearAllCharacters(): void {
        const characterIds = this.getAllCharacterIds();
        this.characterExperience.clear();

        this.eventEmitter?.emit('all-character-experience-cleared', { characterIds });
    }

    /**
     * キャラクターの経験値を直接設定（デバッグ・テスト用）
     * @param characterId キャラクターID
     * @param experience 設定する経験値
     * @param updateLevel レベルも更新するかどうか（デフォルト: true）
     */
    public setExperience(characterId: string, experience: number, updateLevel: boolean = true): void {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (experience < 0) {
            throw new Error(ExperienceError.INVALID_EXPERIENCE_AMOUNT);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const oldLevel = characterData.currentLevel;
        const oldExperience = characterData.currentExperience;

        characterData.currentExperience = experience;
        characterData.totalExperience = Math.max(characterData.totalExperience, experience);

        if (updateLevel) {
            const maxLevel = this.experienceDataLoader.getMaxLevel();
            characterData.currentLevel = Math.min(
                this.experienceDataLoader.calculateLevelFromExperience(experience),
                maxLevel
            );
        }

        this.eventEmitter?.emit('experience-set', {
            characterId,
            oldExperience,
            newExperience: experience,
            oldLevel,
            newLevel: characterData.currentLevel,
            levelChanged: characterData.currentLevel !== oldLevel
        });
    }

    /**
     * キャラクターのレベルを直接設定（デバッグ・テスト用）
     * @param characterId キャラクターID
     * @param level 設定するレベル
     * @param updateExperience 経験値も更新するかどうか（デフォルト: true）
     */
    public setLevel(characterId: string, level: number, updateExperience: boolean = true): void {
        if (!characterId) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        if (level < 1) {
            throw new Error('Level must be at least 1');
        }

        const maxLevel = this.experienceDataLoader.getMaxLevel();
        if (level > maxLevel) {
            throw new Error(`Level cannot exceed max level (${maxLevel})`);
        }

        const characterData = this.characterExperience.get(characterId);
        if (!characterData) {
            throw new Error(ExperienceError.INVALID_CHARACTER);
        }

        const oldLevel = characterData.currentLevel;
        const oldExperience = characterData.currentExperience;

        characterData.currentLevel = level;

        if (updateExperience) {
            const requiredExperience = this.experienceDataLoader.getRequiredExperience(level);
            characterData.currentExperience = requiredExperience;
            characterData.totalExperience = Math.max(characterData.totalExperience, requiredExperience);
        }

        this.eventEmitter?.emit('level-set', {
            characterId,
            oldLevel,
            newLevel: level,
            oldExperience,
            newExperience: characterData.currentExperience,
            experienceChanged: characterData.currentExperience !== oldExperience
        });
    }

    /**
     * 経験値データローダーが利用可能かチェック
     * @returns データローダーが利用可能かどうか
     */
    public isDataLoaderReady(): boolean {
        return this.experienceDataLoader.isDataLoaded();
    }

    /**
     * デバッグ情報を取得
     * @returns デバッグ情報
     */
    public getDebugInfo(): any {
        return {
            characterCount: this.characterExperience.size,
            characters: Array.from(this.characterExperience.entries()).map(([id, data]) => ({
                id,
                level: data.currentLevel,
                experience: data.currentExperience,
                totalExperience: data.totalExperience,
                experienceToNext: this.getExperienceToNextLevel(id),
                canLevelUp: this.canLevelUp(id)
            })),
            dataLoaderReady: this.isDataLoaderReady(),
            maxLevel: this.experienceDataLoader.getMaxLevel()
        };
    }

    /**
     * リソースの解放
     */
    public destroy(): void {
        this.characterExperience.clear();
        this.eventEmitter?.emit('experience-manager-destroyed');
    }
}