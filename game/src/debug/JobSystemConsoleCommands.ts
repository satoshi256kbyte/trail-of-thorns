/**
 * JobSystemConsoleCommands - 職業システムコンソールコマンド
 * 
 * このクラスは職業システムのデバッグ用コンソールコマンドを提供します。
 */

import { JobSystem } from '../systems/jobs/JobSystem';

/**
 * 職業システムコンソールコマンド
 */
export class JobSystemConsoleCommands {
    private jobSystem: JobSystem;

    constructor(jobSystem: JobSystem) {
        this.jobSystem = jobSystem;
    }

    /**
     * 利用可能な職業一覧を表示
     */
    public listJobs(): void {
        try {
            const jobs = this.jobSystem.getAllJobs();
            const jobList: any[] = [];

            for (const [id, job] of jobs) {
                jobList.push({
                    id: job.id,
                    name: job.name,
                    category: job.category,
                    maxRank: job.maxRank,
                    currentRank: job.rank,
                });
            }

            console.table(jobList);
            console.log(`Total jobs: ${jobs.size}`);
        } catch (error) {
            console.error('Failed to list jobs:', error);
        }
    }

    /**
     * キャラクターの職業を設定
     */
    public setCharacterJob(characterId: string, jobId: string, rank: number = 1): void {
        try {
            this.jobSystem.setCharacterJob(characterId, jobId, rank);
            console.log(`✓ Set ${characterId} job to ${jobId} (rank ${rank})`);

            // 設定後の状態を表示
            this.showCharacterJobInfo(characterId);
        } catch (error) {
            console.error(`Failed to set job for ${characterId}:`, error);
        }
    }

    /**
     * キャラクターの職業を変更
     */
    public async changeCharacterJob(characterId: string, jobId: string): Promise<void> {
        try {
            const result = await this.jobSystem.changeJob(characterId, jobId);

            if (result.success) {
                console.log(`✓ Changed ${characterId} job from ${result.oldJobId} to ${result.newJobId}`);
                console.log('Job change details:', result);
            } else {
                console.warn(`Failed to change job for ${characterId}:`, result.error);
            }

            // 変更後の状態を表示
            this.showCharacterJobInfo(characterId);
        } catch (error) {
            console.error(`Failed to change job for ${characterId}:`, error);
        }
    }

    /**
     * キャラクターの職業をランクアップ
     */
    public async rankUpCharacter(characterId: string, targetRank?: number): Promise<void> {
        try {
            // ランクアップ前の状態を表示
            console.log('Before rank up:');
            this.showCharacterJobInfo(characterId);

            const result = await this.jobSystem.rankUpJob(characterId, targetRank);

            if (result.success) {
                console.log(`✓ Ranked up ${characterId} from rank ${result.oldRank} to ${result.newRank}`);
                console.log('Rank up details:', result);
            } else {
                console.warn(`Failed to rank up ${characterId}:`, result.error);
            }

            // ランクアップ後の状態を表示
            console.log('After rank up:');
            this.showCharacterJobInfo(characterId);
        } catch (error) {
            console.error(`Failed to rank up ${characterId}:`, error);
        }
    }

    /**
     * キャラクターの職業情報を表示
     */
    public showCharacterJobInfo(characterId: string): void {
        try {
            const job = this.jobSystem.getCharacterJob(characterId);

            if (!job) {
                console.log(`Character ${characterId} has no job assigned.`);
                return;
            }

            const stats = this.jobSystem.getCharacterJobStats(characterId);
            const skills = this.jobSystem.getCharacterJobSkills(characterId);
            const rankUpAvailability = this.jobSystem.canRankUp(characterId);

            const info = {
                characterId,
                jobId: job.id,
                jobName: job.name,
                currentRank: job.rank,
                maxRank: job.maxRank,
                category: job.category,
                stats,
                skills,
                canRankUp: rankUpAvailability.canRankUp,
                nextRankCost: rankUpAvailability.requirements?.roseEssenceCost || 'N/A',
            };

            console.log(`=== ${characterId} Job Info ===`);
            console.table(info);

            if (!rankUpAvailability.canRankUp && rankUpAvailability.reasons) {
                console.log('Rank up blocked by:', rankUpAvailability.reasons);
            }
        } catch (error) {
            console.error(`Failed to show job info for ${characterId}:`, error);
        }
    }

    /**
     * 薔薇の力を追加
     */
    public async addRoseEssence(amount: number, source: string = 'debug'): Promise<void> {
        try {
            const beforeAmount = this.jobSystem.getCurrentRoseEssence();

            await this.jobSystem.awardRoseEssence(amount, source);

            const afterAmount = this.jobSystem.getCurrentRoseEssence();

            console.log(`✓ Added ${amount} rose essence from ${source}`);
            console.log(`Rose essence: ${beforeAmount} → ${afterAmount}`);

            // ランクアップ候補がいるかチェック
            const candidates = this.jobSystem.getRankUpCandidates();
            if (candidates.length > 0) {
                console.log(`💡 ${candidates.length} character(s) can now rank up!`);
                console.table(candidates.map(c => ({
                    characterId: c.characterId,
                    currentRank: c.currentRank,
                    nextRank: c.nextRank,
                    cost: c.cost,
                })));
            }
        } catch (error) {
            console.error('Failed to add rose essence:', error);
        }
    }

    /**
     * 薔薇の力情報を表示
     */
    public showRoseEssenceInfo(): void {
        try {
            const currentAmount = this.jobSystem.getCurrentRoseEssence();
            const history = this.jobSystem.getRoseEssenceHistory();

            console.log(`=== Rose Essence Info ===`);
            console.log(`Current Amount: ${currentAmount}`);
            console.log(`Transaction History (last 10):`);

            const recentHistory = history.slice(-10);
            console.table(recentHistory.map(h => ({
                timestamp: new Date(h.timestamp).toLocaleString(),
                type: h.type,
                amount: h.amount,
                source: h.source,
                description: h.description,
            })));
        } catch (error) {
            console.error('Failed to show rose essence info:', error);
        }
    }

    /**
     * 薔薇の力をリセット
     */
    public resetRoseEssence(): void {
        try {
            // 現在の薔薇の力を0にする（実装依存）
            console.warn('Rose essence reset is not directly supported. Use system reset instead.');
            console.log('To reset rose essence, use: jobSystemDebug.resetMetrics()');
        } catch (error) {
            console.error('Failed to reset rose essence:', error);
        }
    }

    /**
     * ランクアップ候補を表示
     */
    public showRankUpCandidates(): void {
        try {
            const candidates = this.jobSystem.getRankUpCandidates();

            if (candidates.length === 0) {
                console.log('No characters can rank up at this time.');
                return;
            }

            console.log(`=== Rank Up Candidates (${candidates.length}) ===`);
            console.table(candidates.map(c => ({
                characterId: c.characterId,
                jobId: c.jobId,
                currentRank: c.currentRank,
                nextRank: c.nextRank,
                cost: c.cost,
                canAfford: c.canAfford,
            })));

            const totalCost = candidates.reduce((sum, c) => sum + c.cost, 0);
            const currentEssence = this.jobSystem.getCurrentRoseEssence();

            console.log(`Total cost for all rank ups: ${totalCost}`);
            console.log(`Current rose essence: ${currentEssence}`);
            console.log(`Can afford all: ${currentEssence >= totalCost ? '✓' : '✗'}`);
        } catch (error) {
            console.error('Failed to show rank up candidates:', error);
        }
    }

    /**
     * 全キャラクターの職業情報を表示
     */
    public showAllCharacterJobs(): void {
        try {
            const allJobs = this.jobSystem.getAllJobs();
            const characterJobs: any[] = [];

            // 実際の実装では、CharacterManagerから全キャラクターを取得する必要がある
            // ここでは例として、職業が設定されているキャラクターのみを表示
            console.log('=== All Character Jobs ===');
            console.log('Note: This shows only characters with assigned jobs.');

            // TODO: CharacterManagerとの連携が必要
            console.log('To see all characters, use CharacterManager integration.');
        } catch (error) {
            console.error('Failed to show all character jobs:', error);
        }
    }

    /**
     * 職業システムの健全性をチェック
     */
    public checkSystemHealth(): void {
        try {
            const healthCheck = this.jobSystem.performHealthCheck();

            console.log('=== Job System Health Check ===');
            console.log(`System is healthy: ${healthCheck.isHealthy ? '✓' : '✗'}`);

            if (healthCheck.issues.length > 0) {
                console.log('Issues found:');
                healthCheck.issues.forEach((issue, index) => {
                    console.log(`  ${index + 1}. ${issue}`);
                });
            }

            if (healthCheck.recommendations.length > 0) {
                console.log('Recommendations:');
                healthCheck.recommendations.forEach((rec, index) => {
                    console.log(`  ${index + 1}. ${rec}`);
                });
            }

            if (healthCheck.isHealthy) {
                console.log('✓ All systems are operating normally.');
            }
        } catch (error) {
            console.error('Failed to check system health:', error);
        }
    }

    /**
     * 職業システムの統計を表示
     */
    public showSystemStatistics(): void {
        try {
            const stats = this.jobSystem.getSystemStats();

            console.log('=== Job System Statistics ===');
            console.table(stats);

            // 追加の統計情報
            const candidates = this.jobSystem.getRankUpCandidates();
            console.log(`\nAdditional Info:`);
            console.log(`- Rank up candidates: ${candidates.length}`);
            console.log(`- System uptime: ${(stats.systemUptime / 1000 / 60).toFixed(1)} minutes`);
        } catch (error) {
            console.error('Failed to show system statistics:', error);
        }
    }

    /**
     * バッチ操作: 複数キャラクターに同じ職業を設定
     */
    public batchSetJob(characterIds: string[], jobId: string, rank: number = 1): void {
        try {
            console.log(`Setting job ${jobId} (rank ${rank}) for ${characterIds.length} characters...`);

            let successCount = 0;
            let failCount = 0;

            for (const characterId of characterIds) {
                try {
                    this.jobSystem.setCharacterJob(characterId, jobId, rank);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to set job for ${characterId}:`, error);
                    failCount++;
                }
            }

            console.log(`✓ Batch operation completed: ${successCount} success, ${failCount} failed`);
        } catch (error) {
            console.error('Failed to perform batch job setting:', error);
        }
    }

    /**
     * バッチ操作: 複数キャラクターをランクアップ
     */
    public async batchRankUp(characterIds: string[], targetRank?: number): Promise<void> {
        try {
            console.log(`Ranking up ${characterIds.length} characters...`);

            let successCount = 0;
            let failCount = 0;

            for (const characterId of characterIds) {
                try {
                    const result = await this.jobSystem.rankUpJob(characterId, targetRank);
                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    console.error(`Failed to rank up ${characterId}:`, error);
                    failCount++;
                }
            }

            console.log(`✓ Batch rank up completed: ${successCount} success, ${failCount} failed`);
        } catch (error) {
            console.error('Failed to perform batch rank up:', error);
        }
    }
}