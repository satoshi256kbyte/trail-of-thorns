/**
 * ランクアップ処理システム
 * 
 * このクラスはランクアップ可能性判定、ランクアップ実行処理、
 * ランクアップ効果適用、ランクアップ可能キャラクター取得、
 * ランクアップ条件チェックを行います。
 * 要件5.1-5.5に対応した機能を提供します。
 */

import {
    RankUpAvailability,
    RankUpResult,
    CharacterRankUpInfo,
    RankUpRequirements,
    StatModifiers,
    JobTrait,
    JobSystemError
} from '../../types/job';
import { JobManager } from './JobManager';
import { RoseEssenceManager } from './RoseEssenceManager';
import { JobAnimator } from './JobAnimator';
import { Unit } from '../../types/gameplay';

/**
 * ランクアップ管理システムのメインクラス
 */
export class RankUpManager {
    private jobManager: JobManager;
    private roseEssenceManager: RoseEssenceManager;
    private jobAnimator?: JobAnimator;
    private characterManager?: any; // CharacterManagerの参照（将来的に型定義）

    constructor(jobManager: JobManager, roseEssenceManager: RoseEssenceManager) {
        this.jobManager = jobManager;
        this.roseEssenceManager = roseEssenceManager;
    }

    /**
     * CharacterManagerの参照を設定
     * 
     * @param characterManager CharacterManagerのインスタンス
     */
    setCharacterManager(characterManager: any): void {
        this.characterManager = characterManager;
    }

    /**
     * JobAnimatorの参照を設定
     * 
     * @param jobAnimator JobAnimatorのインスタンス
     */
    setJobAnimator(jobAnimator: JobAnimator): void {
        this.jobAnimator = jobAnimator;
    }

    /**
     * ランクアップ可能性を判定する
     * 要件5.5: ランクアップ可能な状態になるとプレイヤーに通知
     * 
     * @param characterId キャラクターID
     * @param targetRank 目標ランク（省略時は次のランク）
     * @returns ランクアップ可能性の詳細情報
     */
    canRankUp(characterId: string, targetRank?: number): RankUpAvailability {
        const job = this.jobManager.getCharacterJob(characterId);
        const characterJobData = this.jobManager.getCharacterJobData(characterId);

        if (!job || !characterJobData) {
            return {
                canRankUp: false,
                currentRank: 0,
                targetRank: targetRank || 1,
                requirements: this.createEmptyRequirements(),
                missingRequirements: {
                    roseEssence: 0,
                    level: 0,
                    skills: [],
                    stages: [],
                    bosses: []
                }
            };
        }

        const currentRank = characterJobData.currentRank;
        const actualTargetRank = targetRank || (currentRank + 1);

        // 最大ランクチェック
        if (actualTargetRank > job.maxRank) {
            return {
                canRankUp: false,
                currentRank,
                targetRank: actualTargetRank,
                requirements: this.createEmptyRequirements(),
                missingRequirements: {}
            };
        }

        // ランクアップ要件を取得
        const requirements = job.getRankUpRequirements(actualTargetRank);
        const missingRequirements: any = {};

        // 薔薇の力チェック
        const currentRoseEssence = this.roseEssenceManager.getCurrentRoseEssence();
        if (currentRoseEssence < requirements.roseEssenceCost) {
            missingRequirements.roseEssence = requirements.roseEssenceCost - currentRoseEssence;
        }

        // レベル要件チェック（CharacterManagerが設定されている場合）
        if (this.characterManager && typeof this.characterManager.getCharacterLevel === 'function') {
            const characterLevel = this.characterManager.getCharacterLevel(characterId);
            if (characterLevel < requirements.levelRequirement) {
                missingRequirements.level = requirements.levelRequirement - characterLevel;
            }
        }

        // 前提スキルチェック（SkillManagerが利用可能な場合）
        if (requirements.prerequisiteSkills.length > 0) {
            // TODO: SkillManagerとの連携実装
            // 現在は前提スキルは満たされているものとして扱う
        }

        // ステージクリア要件チェック
        if (requirements.completedStages && requirements.completedStages.length > 0) {
            // TODO: ステージ進行管理システムとの連携実装
            // 現在はステージ要件は満たされているものとして扱う
        }

        // ボス撃破要件チェック
        if (requirements.defeatedBosses && requirements.defeatedBosses.length > 0) {
            // TODO: ボス撃破記録システムとの連携実装
            // 現在はボス要件は満たされているものとして扱う
        }

        const canRankUp = Object.keys(missingRequirements).length === 0;

        return {
            canRankUp,
            currentRank,
            targetRank: actualTargetRank,
            requirements,
            missingRequirements
        };
    }

    /**
     * ランクアップを実行する
     * 要件5.1: ランクアップ実行時の薔薇の力消費
     * 要件5.2: ランクアップ完了時のキャラクター能力値向上
     * 要件5.3: ランクアップ完了時の新しいスキル習得
     * 要件5.4: ランクアップ完了時のランクアップ演出表示
     * 
     * @param characterId キャラクターID
     * @param targetRank 目標ランク（省略時は次のランク）
     * @returns ランクアップ実行結果
     */
    async executeRankUp(characterId: string, targetRank?: number): Promise<RankUpResult> {
        // ランクアップ可能性をチェック
        const availability = this.canRankUp(characterId, targetRank);

        if (!availability.canRankUp) {
            return {
                success: false,
                characterId,
                jobId: '',
                oldRank: availability.currentRank,
                newRank: availability.targetRank,
                roseEssenceUsed: 0,
                newStatModifiers: this.createEmptyStatModifiers(),
                newSkills: [],
                newTraits: [],
                error: 'ランクアップ条件を満たしていません'
            };
        }

        const job = this.jobManager.getCharacterJob(characterId);
        const characterJobData = this.jobManager.getCharacterJobData(characterId);

        if (!job || !characterJobData) {
            return {
                success: false,
                characterId,
                jobId: '',
                oldRank: 0,
                newRank: availability.targetRank,
                roseEssenceUsed: 0,
                newStatModifiers: this.createEmptyStatModifiers(),
                newSkills: [],
                newTraits: [],
                error: 'キャラクターまたは職業データが見つかりません'
            };
        }

        const oldRank = characterJobData.currentRank;
        const newRank = availability.targetRank;
        const requirements = availability.requirements;

        try {
            // 薔薇の力を消費
            const consumeSuccess = this.roseEssenceManager.consumeRoseEssence(
                requirements.roseEssenceCost,
                'rank_up',
                characterId
            );

            if (!consumeSuccess) {
                return {
                    success: false,
                    characterId,
                    jobId: job.id,
                    oldRank,
                    newRank,
                    roseEssenceUsed: 0,
                    newStatModifiers: this.createEmptyStatModifiers(),
                    newSkills: [],
                    newTraits: [],
                    error: '薔薇の力の消費に失敗しました'
                };
            }

            // ランクアップ効果を適用
            this.applyRankUpEffects(characterId, oldRank, newRank);

            // 新しい能力値修正を取得
            job.setRank(newRank);
            const newStatModifiers = job.getStatModifiers();
            const newSkills = job.getAvailableSkills();
            const newTraits = job.getJobTraits();

            // ランクアップ演出を再生
            await this.playRankUpAnimation(characterId, job);

            console.log(`キャラクター「${characterId}」の職業「${job.name}」がランク${oldRank}から${newRank}にランクアップしました`);

            return {
                success: true,
                characterId,
                jobId: job.id,
                oldRank,
                newRank,
                roseEssenceUsed: requirements.roseEssenceCost,
                newStatModifiers,
                newSkills,
                newTraits
            };

        } catch (error) {
            console.error('ランクアップ実行中にエラーが発生しました:', error);
            return {
                success: false,
                characterId,
                jobId: job.id,
                oldRank,
                newRank,
                roseEssenceUsed: 0,
                newStatModifiers: this.createEmptyStatModifiers(),
                newSkills: [],
                newTraits: [],
                error: error instanceof Error ? error.message : '不明なエラーが発生しました'
            };
        }
    }

    /**
     * ランクアップ効果を適用する
     * 要件5.2: ランクアップ完了時のキャラクター能力値向上
     * 
     * @param characterId キャラクターID
     * @param oldRank 旧ランク
     * @param newRank 新ランク
     */
    applyRankUpEffects(characterId: string, oldRank: number, newRank: number): void {
        // JobManagerでランクを更新
        const requirements = this.jobManager.getCharacterJob(characterId)?.getRankUpRequirements(newRank);
        const roseEssenceUsed = requirements?.roseEssenceCost || 0;

        this.jobManager.updateCharacterJobRank(characterId, newRank, roseEssenceUsed);

        // CharacterManagerが設定されている場合、キャラクターの能力値を更新
        if (this.characterManager && typeof this.characterManager.updateCharacterStats === 'function') {
            const newStatModifiers = this.jobManager.calculateJobStats(characterId);
            this.characterManager.updateCharacterStats(characterId, newStatModifiers);
        }

        console.log(`キャラクター「${characterId}」にランクアップ効果を適用しました (${oldRank} → ${newRank})`);
    }

    /**
     * ランクアップ演出を再生する
     * 要件5.4: ランクアップ完了時のランクアップ演出表示
     * 
     * @param characterId キャラクターID
     * @param job 職業インスタンス
     */
    async playRankUpAnimation(characterId: string, job: any): Promise<void> {
        if (this.jobAnimator && this.characterManager) {
            try {
                // CharacterManagerからキャラクター情報を取得
                const character = this.characterManager.getCharacter?.(characterId);

                if (character && character.sprite) {
                    // JobAnimatorでランクアップアニメーションを再生
                    await this.jobAnimator.playRankUpAnimation(character, job.getCurrentRank());
                    console.log(`ランクアップ演出が完了しました: キャラクター「${characterId}」職業「${job.name}」`);
                    return;
                }
            } catch (error) {
                console.error('ランクアップアニメーション実行中にエラーが発生しました:', error);
            }
        }

        // フォールバック: JobAnimatorが利用できない場合
        console.log(`ランクアップ演出を再生中: キャラクター「${characterId}」職業「${job.name}」`);

        // 演出時間をシミュレート
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('ランクアップ演出が完了しました');
    }

    /**
     * ランクアップ可能なキャラクターを取得する
     * 要件5.5: ランクアップ可能な状態になるとプレイヤーに通知
     * 
     * @returns ランクアップ可能キャラクターの情報配列
     */
    getRankUpCandidates(): CharacterRankUpInfo[] {
        const candidates: CharacterRankUpInfo[] = [];
        const allCharacterJobData = this.jobManager.exportAllCharacterJobData();

        for (const [characterId, jobData] of allCharacterJobData) {
            const job = this.jobManager.getCharacterJob(characterId);
            if (!job) continue;

            const availability = this.canRankUp(characterId);

            // キャラクター名を取得（CharacterManagerが利用可能な場合）
            let characterName = characterId;
            if (this.characterManager && typeof this.characterManager.getCharacterName === 'function') {
                characterName = this.characterManager.getCharacterName(characterId) || characterId;
            }

            const candidateInfo: CharacterRankUpInfo = {
                characterId,
                characterName,
                currentJob: job.name,
                currentRank: jobData.currentRank,
                maxRank: job.maxRank,
                canRankUp: availability.canRankUp,
                nextRankRequirements: availability.requirements,
                roseEssenceCost: availability.requirements.roseEssenceCost
            };

            candidates.push(candidateInfo);
        }

        // ランクアップ可能なキャラクターを優先してソート
        return candidates.sort((a, b) => {
            if (a.canRankUp && !b.canRankUp) return -1;
            if (!a.canRankUp && b.canRankUp) return 1;
            return a.characterName.localeCompare(b.characterName);
        });
    }

    /**
     * 特定キャラクターのランクアップ条件をチェックする
     * 要件5.5: ランクアップ条件チェック
     * 
     * @param characterId キャラクターID
     * @param targetRank 目標ランク（省略時は次のランク）
     * @returns ランクアップ条件の詳細チェック結果
     */
    checkRankUpConditions(characterId: string, targetRank?: number): {
        canRankUp: boolean;
        conditions: {
            roseEssence: { required: number; current: number; satisfied: boolean };
            level: { required: number; current: number; satisfied: boolean };
            skills: { required: string[]; missing: string[]; satisfied: boolean };
            stages: { required: string[]; missing: string[]; satisfied: boolean };
            bosses: { required: string[]; missing: string[]; satisfied: boolean };
        };
    } {
        const availability = this.canRankUp(characterId, targetRank);
        const requirements = availability.requirements;
        const missing = availability.missingRequirements;

        // 現在の薔薇の力
        const currentRoseEssence = this.roseEssenceManager.getCurrentRoseEssence();

        // 現在のレベル
        let currentLevel = 1;
        if (this.characterManager && typeof this.characterManager.getCharacterLevel === 'function') {
            currentLevel = this.characterManager.getCharacterLevel(characterId) || 1;
        }

        return {
            canRankUp: availability.canRankUp,
            conditions: {
                roseEssence: {
                    required: requirements.roseEssenceCost,
                    current: currentRoseEssence,
                    satisfied: !missing.roseEssence
                },
                level: {
                    required: requirements.levelRequirement,
                    current: currentLevel,
                    satisfied: !missing.level
                },
                skills: {
                    required: requirements.prerequisiteSkills,
                    missing: missing.skills || [],
                    satisfied: !missing.skills || missing.skills.length === 0
                },
                stages: {
                    required: requirements.completedStages || [],
                    missing: missing.stages || [],
                    satisfied: !missing.stages || missing.stages.length === 0
                },
                bosses: {
                    required: requirements.defeatedBosses || [],
                    missing: missing.bosses || [],
                    satisfied: !missing.bosses || missing.bosses.length === 0
                }
            }
        };
    }

    /**
     * 複数キャラクターの一括ランクアップ可能性チェック
     * 
     * @param characterIds キャラクターIDの配列
     * @returns 各キャラクターのランクアップ可能性
     */
    checkMultipleRankUp(characterIds: string[]): Map<string, RankUpAvailability> {
        const results = new Map<string, RankUpAvailability>();

        for (const characterId of characterIds) {
            results.set(characterId, this.canRankUp(characterId));
        }

        return results;
    }

    /**
     * ランクアップ統計情報を取得
     * 
     * @returns ランクアップ統計
     */
    getRankUpStatistics(): {
        totalCharacters: number;
        rankUpCandidates: number;
        averageRank: number;
        maxRankCharacters: number;
        totalRoseEssenceNeeded: number;
    } {
        const candidates = this.getRankUpCandidates();
        const rankUpCandidates = candidates.filter(c => c.canRankUp);

        const totalCharacters = candidates.length;
        const averageRank = totalCharacters > 0 ?
            candidates.reduce((sum, c) => sum + c.currentRank, 0) / totalCharacters : 0;
        const maxRankCharacters = candidates.filter(c => c.currentRank >= c.maxRank).length;
        const totalRoseEssenceNeeded = rankUpCandidates.reduce((sum, c) => sum + c.roseEssenceCost, 0);

        return {
            totalCharacters,
            rankUpCandidates: rankUpCandidates.length,
            averageRank: Math.round(averageRank * 100) / 100,
            maxRankCharacters,
            totalRoseEssenceNeeded
        };
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * 空のランクアップ要件を作成
     */
    private createEmptyRequirements(): RankUpRequirements {
        return {
            roseEssenceCost: 0,
            levelRequirement: 1,
            prerequisiteSkills: [],
            completedStages: [],
            defeatedBosses: []
        };
    }

    /**
     * 空の能力値修正を作成
     */
    private createEmptyStatModifiers(): StatModifiers {
        return {
            hp: 0,
            mp: 0,
            attack: 0,
            defense: 0,
            speed: 0,
            skill: 0,
            luck: 0
        };
    }
}