/**
 * 職業管理システム
 * 
 * このクラスは職業の登録・取得、キャラクター職業データの管理、
 * 職業変更処理、職業能力値計算、職業スキル管理を行います。
 * 要件1.1, 1.4, 6.1-6.5に対応した機能を提供します。
 */

import {
    JobData,
    CharacterJobData,
    JobChangeResult,
    StatModifiers,
    JobSystemError,
    JobHistoryEntry
} from '../../types/job';
import { Job } from './Job';
import { Unit } from '../../types/gameplay';

/**
 * 職業管理システムのメインクラス
 */
export class JobManager {
    private jobs: Map<string, Job> = new Map();
    private characterJobs: Map<string, CharacterJobData> = new Map();

    constructor() {
        // 初期化処理
    }

    /**
     * 職業を登録する
     * 要件1.1: キャラクターが固有の職業を持つ
     * 
     * @param job 登録する職業インスタンス
     */
    registerJob(job: Job): void {
        if (!job || !job.id) {
            throw new Error('無効な職業データです');
        }

        this.jobs.set(job.id, job);
        console.log(`職業「${job.name}」を登録しました`);
    }

    /**
     * 職業を取得する
     * 要件1.1: 職業データの取得
     * 
     * @param jobId 職業ID
     * @returns 職業インスタンス、存在しない場合はnull
     */
    getJob(jobId: string): Job | null {
        return this.jobs.get(jobId) || null;
    }

    /**
     * 登録されている全職業を取得する
     * 
     * @returns 職業IDと職業インスタンスのマップ
     */
    getAllJobs(): Map<string, Job> {
        return new Map(this.jobs);
    }

    /**
     * キャラクターの職業を取得する
     * 要件1.1: キャラクターの職業データ管理
     * 
     * @param characterId キャラクターID
     * @returns キャラクターの職業インスタンス、存在しない場合はnull
     */
    getCharacterJob(characterId: string): Job | null {
        const characterJobData = this.characterJobs.get(characterId);
        if (!characterJobData) {
            return null;
        }

        const job = this.jobs.get(characterJobData.currentJobId);
        if (job) {
            // 現在のランクを設定
            job.setRank(characterJobData.currentRank);
        }

        return job;
    }

    /**
     * キャラクターの職業データを取得する
     * 
     * @param characterId キャラクターID
     * @returns キャラクターの職業データ、存在しない場合はnull
     */
    getCharacterJobData(characterId: string): CharacterJobData | null {
        return this.characterJobs.get(characterId) || null;
    }

    /**
     * キャラクターの職業を設定する
     * 要件1.1: キャラクターの初期職業設定
     * 要件6.1: 職業変更時の職業データ保存
     * 
     * @param characterId キャラクターID
     * @param jobId 職業ID
     * @param rank 職業ランク（デフォルト: 1）
     */
    setCharacterJob(characterId: string, jobId: string, rank: number = 1): void {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`職業「${jobId}」が見つかりません`);
        }

        if (rank < 1 || rank > job.maxRank) {
            throw new Error(`無効なランクです: ${rank} (有効範囲: 1-${job.maxRank})`);
        }

        const existingData = this.characterJobs.get(characterId);

        if (existingData) {
            // 既存データの更新
            const historyEntry: JobHistoryEntry = {
                jobId: existingData.currentJobId,
                rank: existingData.currentRank,
                changedAt: new Date(),
                roseEssenceUsed: 0 // ランクアップ時に設定される
            };

            existingData.jobHistory.push(historyEntry);
            existingData.currentJobId = jobId;
            existingData.currentRank = rank;
        } else {
            // 新規データの作成
            const characterJobData: CharacterJobData = {
                characterId,
                currentJobId: jobId,
                currentRank: rank,
                jobHistory: [],
                jobExperience: new Map(),
                learnedJobSkills: new Map()
            };

            this.characterJobs.set(characterId, characterJobData);
        }

        console.log(`キャラクター「${characterId}」の職業を「${job.name}」ランク${rank}に設定しました`);
    }

    /**
     * キャラクターの職業を変更する
     * 要件6.1-6.5: 職業変更システム
     * 
     * @param characterId キャラクターID
     * @param newJobId 新しい職業ID
     * @returns 職業変更結果
     */
    changeCharacterJob(characterId: string, newJobId: string): JobChangeResult {
        const characterJobData = this.characterJobs.get(characterId);
        if (!characterJobData) {
            return {
                success: false,
                characterId,
                oldJobId: '',
                newJobId,
                oldRank: 0,
                newRank: 0,
                statChanges: this.createEmptyStatModifiers(),
                skillChanges: { lost: [], gained: [] },
                error: 'キャラクターの職業データが見つかりません'
            };
        }

        const oldJob = this.jobs.get(characterJobData.currentJobId);
        const newJob = this.jobs.get(newJobId);

        if (!oldJob || !newJob) {
            return {
                success: false,
                characterId,
                oldJobId: characterJobData.currentJobId,
                newJobId,
                oldRank: characterJobData.currentRank,
                newRank: 0,
                statChanges: this.createEmptyStatModifiers(),
                skillChanges: { lost: [], gained: [] },
                error: '職業データが見つかりません'
            };
        }

        // 職業変更の実行
        const oldRank = characterJobData.currentRank;
        const newRank = 1; // 職業変更時は基本的にランク1から開始

        // 能力値変更の計算
        oldJob.setRank(oldRank);
        newJob.setRank(newRank);

        const oldStats = oldJob.getStatModifiers();
        const newStats = newJob.getStatModifiers();
        const statChanges = this.calculateStatDifference(oldStats, newStats);

        // スキル変更の計算
        const oldSkills = oldJob.getAvailableSkills();
        const newSkills = newJob.getAvailableSkills();
        const skillChanges = {
            lost: oldSkills.filter(skill => !newSkills.includes(skill)),
            gained: newSkills.filter(skill => !oldSkills.includes(skill))
        };

        // 職業データの更新
        this.setCharacterJob(characterId, newJobId, newRank);

        return {
            success: true,
            characterId,
            oldJobId: characterJobData.currentJobId,
            newJobId,
            oldRank,
            newRank,
            statChanges,
            skillChanges
        };
    }

    /**
     * キャラクターの職業能力値修正を計算する
     * 要件1.1: 職業に応じた基本能力値修正の適用
     * 要件6.2: 新しい職業の能力値とスキルの適用
     * 
     * @param characterId キャラクターID
     * @returns 能力値修正値、キャラクターが見つからない場合は空の修正値
     */
    calculateJobStats(characterId: string): StatModifiers {
        const job = this.getCharacterJob(characterId);
        if (!job) {
            console.warn(`キャラクター「${characterId}」の職業が見つかりません`);
            return this.createEmptyStatModifiers();
        }

        return job.getStatModifiers();
    }

    /**
     * キャラクターの職業スキルを取得する
     * 要件1.1: 職業ごとの使用可能スキルリストの設定
     * 要件6.2: 新しい職業の能力値とスキルの適用
     * 
     * @param characterId キャラクターID
     * @returns 使用可能スキルの配列
     */
    getJobSkills(characterId: string): string[] {
        const job = this.getCharacterJob(characterId);
        if (!job) {
            console.warn(`キャラクター「${characterId}」の職業が見つかりません`);
            return [];
        }

        return job.getAvailableSkills();
    }

    /**
     * キャラクターの職業成長率修正を取得する
     * 
     * @param characterId キャラクターID
     * @returns 成長率修正値
     */
    getJobGrowthRateModifiers(characterId: string): StatModifiers {
        const job = this.getCharacterJob(characterId);
        if (!job) {
            console.warn(`キャラクター「${characterId}」の職業が見つかりません`);
            return this.createEmptyStatModifiers();
        }

        return job.getGrowthRateModifiers();
    }

    /**
     * キャラクターの職業ランクを更新する
     * 
     * @param characterId キャラクターID
     * @param newRank 新しいランク
     * @param roseEssenceUsed 使用した薔薇の力
     */
    updateCharacterJobRank(characterId: string, newRank: number, roseEssenceUsed: number = 0): void {
        const characterJobData = this.characterJobs.get(characterId);
        if (!characterJobData) {
            throw new Error(`キャラクター「${characterId}」の職業データが見つかりません`);
        }

        const job = this.jobs.get(characterJobData.currentJobId);
        if (!job) {
            throw new Error(`職業「${characterJobData.currentJobId}」が見つかりません`);
        }

        if (newRank < 1 || newRank > job.maxRank) {
            throw new Error(`無効なランクです: ${newRank} (有効範囲: 1-${job.maxRank})`);
        }

        // 履歴エントリを作成
        const historyEntry: JobHistoryEntry = {
            jobId: characterJobData.currentJobId,
            rank: characterJobData.currentRank,
            changedAt: new Date(),
            roseEssenceUsed
        };

        characterJobData.jobHistory.push(historyEntry);
        characterJobData.currentRank = newRank;

        console.log(`キャラクター「${characterId}」の職業ランクを${newRank}に更新しました`);
    }

    /**
     * キャラクターの職業履歴を取得する
     * 要件6.5: 職業変更履歴の記録
     * 
     * @param characterId キャラクターID
     * @returns 職業履歴の配列
     */
    getCharacterJobHistory(characterId: string): JobHistoryEntry[] {
        const characterJobData = this.characterJobs.get(characterId);
        if (!characterJobData) {
            return [];
        }

        return [...characterJobData.jobHistory];
    }

    /**
     * 全キャラクターの職業データをエクスポートする（セーブ用）
     * 
     * @returns キャラクター職業データのマップ
     */
    exportAllCharacterJobData(): Map<string, CharacterJobData> {
        return new Map(this.characterJobs);
    }

    /**
     * キャラクター職業データをインポートする（ロード用）
     * 
     * @param characterJobDataMap インポートするデータ
     */
    importCharacterJobData(characterJobDataMap: Map<string, CharacterJobData>): void {
        this.characterJobs = new Map(characterJobDataMap);
        console.log(`${characterJobDataMap.size}件のキャラクター職業データをインポートしました`);
    }

    /**
     * 全キャラクターの職業データを取得する
     * 
     * @returns キャラクターIDと職業データのマップ
     */
    getAllCharacterJobs(): Map<string, CharacterJobData> {
        return new Map(this.characterJobs);
    }

    /**
     * 職業システムをリセットする（デバッグ用）
     */
    reset(): void {
        this.jobs.clear();
        this.characterJobs.clear();
        console.log('職業システムをリセットしました');
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * 空の能力値修正値を作成する
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

    /**
     * 能力値の差分を計算する
     */
    private calculateStatDifference(oldStats: StatModifiers, newStats: StatModifiers): StatModifiers {
        return {
            hp: newStats.hp - oldStats.hp,
            mp: newStats.mp - oldStats.mp,
            attack: newStats.attack - oldStats.attack,
            defense: newStats.defense - oldStats.defense,
            speed: newStats.speed - oldStats.speed,
            skill: newStats.skill - oldStats.skill,
            luck: newStats.luck - oldStats.luck
        };
    }
}