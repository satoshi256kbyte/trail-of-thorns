/**
 * JobSystemDevelopmentTools - 職業システム開発支援ツール
 * 
 * このクラスは職業システムの開発用設定、データ操作、
 * テスト支援機能を提供します。
 */

import { JobSystem } from '../systems/jobs/JobSystem';
import { JobData, StatModifiers, RankUpRequirements, JobCategory } from '../types/job';
import { Job } from '../systems/jobs/Job';

/**
 * 開発設定
 */
export interface DevelopmentConfig {
    // デバッグモード設定
    debug: {
        enabled: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        showPerformanceMetrics: boolean;
        enableAutoSave: boolean;
    };

    // テスト設定
    testing: {
        enableTestData: boolean;
        autoRunTests: boolean;
        mockExternalSystems: boolean;
        fastMode: boolean; // アニメーション等を高速化
    };

    // 開発支援設定
    development: {
        enableHotReload: boolean;
        showDataValidation: boolean;
        enableExperimentalFeatures: boolean;
        bypassRequirements: boolean; // 要件チェックをバイパス
    };
}

/**
 * テストデータセット
 */
export interface TestDataSet {
    name: string;
    description: string;
    characters: Array<{
        id: string;
        jobId: string;
        rank: number;
    }>;
    roseEssence: number;
    scenario: string;
}

/**
 * 職業システム開発支援ツール
 */
export class JobSystemDevelopmentTools {
    private jobSystem: JobSystem;
    private config: DevelopmentConfig;
    private testDataSets: Map<string, TestDataSet> = new Map();
    private backupStates: Map<string, any> = new Map();

    private static readonly DEFAULT_CONFIG: DevelopmentConfig = {
        debug: {
            enabled: true,
            logLevel: 'debug',
            showPerformanceMetrics: true,
            enableAutoSave: false,
        },
        testing: {
            enableTestData: true,
            autoRunTests: false,
            mockExternalSystems: false,
            fastMode: false,
        },
        development: {
            enableHotReload: false,
            showDataValidation: true,
            enableExperimentalFeatures: false,
            bypassRequirements: false,
        },
    };

    constructor(jobSystem: JobSystem, config?: Partial<DevelopmentConfig>) {
        this.jobSystem = jobSystem;
        this.config = { ...JobSystemDevelopmentTools.DEFAULT_CONFIG, ...config };

        this.initializeTestDataSets();
        this.setupConsoleCommands();
        this.setupDevelopmentFeatures();
    }

    /**
     * テストデータセットを初期化
     */
    private initializeTestDataSets(): void {
        // 基本テストデータセット
        this.testDataSets.set('basic', {
            name: 'Basic Test',
            description: 'Basic job system functionality test',
            characters: [
                { id: 'test_char_1', jobId: 'warrior', rank: 1 },
                { id: 'test_char_2', jobId: 'mage', rank: 1 },
                { id: 'test_char_3', jobId: 'archer', rank: 1 },
            ],
            roseEssence: 100,
            scenario: 'basic_functionality',
        });

        // 進行テストデータセット
        this.testDataSets.set('progression', {
            name: 'Progression Test',
            description: 'Job progression and rank up test',
            characters: [
                { id: 'prog_char_1', jobId: 'warrior', rank: 3 },
                { id: 'prog_char_2', jobId: 'mage', rank: 2 },
                { id: 'prog_char_3', jobId: 'healer', rank: 4 },
            ],
            roseEssence: 500,
            scenario: 'progression_testing',
        });

        // エッジケーステストデータセット
        this.testDataSets.set('edge_cases', {
            name: 'Edge Cases Test',
            description: 'Edge cases and error handling test',
            characters: [
                { id: 'edge_char_1', jobId: 'warrior', rank: 10 }, // 最大ランク
                { id: 'edge_char_2', jobId: 'thief', rank: 1 },
            ],
            roseEssence: 0, // 薔薇の力なし
            scenario: 'edge_case_testing',
        });

        // パフォーマンステストデータセット
        this.testDataSets.set('performance', {
            name: 'Performance Test',
            description: 'Performance and stress test',
            characters: Array.from({ length: 20 }, (_, i) => ({
                id: `perf_char_${i + 1}`,
                jobId: ['warrior', 'mage', 'archer', 'healer', 'thief'][i % 5],
                rank: Math.floor(i / 5) + 1,
            })),
            roseEssence: 2000,
            scenario: 'performance_testing',
        });
    }

    /**
     * コンソールコマンドを設定
     */
    private setupConsoleCommands(): void {
        if (typeof window !== 'undefined') {
            (window as any).jobDev = {
                // 設定管理
                setConfig: (config: Partial<DevelopmentConfig>) => this.setConfig(config),
                getConfig: () => this.getConfig(),
                resetConfig: () => this.resetConfig(),

                // テストデータ管理
                loadTestData: (dataSetName: string) => this.loadTestDataSet(dataSetName),
                listTestData: () => this.listTestDataSets(),
                createTestData: (name: string, data: TestDataSet) => this.createTestDataSet(name, data),

                // 状態管理
                saveState: (name: string) => this.saveState(name),
                loadState: (name: string) => this.loadState(name),
                listStates: () => this.listSavedStates(),

                // データ操作
                createJob: (jobData: Partial<JobData>) => this.createTestJob(jobData),
                modifyJob: (jobId: string, changes: Partial<JobData>) => this.modifyJob(jobId, changes),
                deleteJob: (jobId: string) => this.deleteJob(jobId),

                // キャラクター操作
                createCharacter: (characterId: string, jobId: string, rank?: number) =>
                    this.createTestCharacter(characterId, jobId, rank),
                setCharacterRank: (characterId: string, rank: number) =>
                    this.setCharacterRank(characterId, rank),

                // 薔薇の力操作
                setRoseEssence: (amount: number) => this.setRoseEssence(amount),
                addRoseEssence: (amount: number) => this.addRoseEssence(amount),
                resetRoseEssence: () => this.resetRoseEssence(),

                // システム操作
                resetSystem: () => this.resetJobSystem(),
                validateSystem: () => this.validateJobSystem(),

                // 開発機能
                enableFastMode: () => this.enableFastMode(),
                disableFastMode: () => this.disableFastMode(),
                bypassRequirements: (enabled: boolean) => this.setBypassRequirements(enabled),

                // ユーティリティ
                exportData: () => this.exportSystemData(),
                importData: (data: any) => this.importSystemData(data),

                // ヘルプ
                help: () => this.showHelp(),
            };

            console.log('Job System Development Tools loaded. Type jobDev.help() for commands.');
        }
    }

    /**
     * 開発機能を設定
     */
    private setupDevelopmentFeatures(): void {
        if (this.config.debug.enabled) {
            this.enableDebugMode();
        }

        if (this.config.testing.fastMode) {
            this.enableFastMode();
        }

        if (this.config.development.bypassRequirements) {
            this.setBypassRequirements(true);
        }
    }

    /**
     * 設定を更新
     */
    setConfig(config: Partial<DevelopmentConfig>): void {
        this.config = this.deepMerge(this.config, config);
        console.log('Development config updated:', this.config);

        // 設定変更を適用
        this.applyConfigChanges();
    }

    /**
     * 現在の設定を取得
     */
    getConfig(): DevelopmentConfig {
        return { ...this.config };
    }

    /**
     * 設定をリセット
     */
    resetConfig(): void {
        this.config = { ...JobSystemDevelopmentTools.DEFAULT_CONFIG };
        this.applyConfigChanges();
        console.log('Development config reset to defaults');
    }

    /**
     * 設定変更を適用
     */
    private applyConfigChanges(): void {
        if (this.config.debug.enabled) {
            this.enableDebugMode();
        } else {
            this.disableDebugMode();
        }

        if (this.config.testing.fastMode) {
            this.enableFastMode();
        } else {
            this.disableFastMode();
        }

        this.setBypassRequirements(this.config.development.bypassRequirements);
    }

    /**
     * テストデータセットを読み込み
     */
    loadTestDataSet(dataSetName: string): boolean {
        const dataSet = this.testDataSets.get(dataSetName);
        if (!dataSet) {
            console.error(`Test data set '${dataSetName}' not found`);
            return false;
        }

        console.log(`Loading test data set: ${dataSet.name}`);

        try {
            // 薔薇の力を設定
            this.setRoseEssence(dataSet.roseEssence);

            // キャラクターを設定
            dataSet.characters.forEach(char => {
                this.jobSystem.setCharacterJob(char.id, char.jobId, char.rank);
            });

            console.log(`Test data set '${dataSetName}' loaded successfully`);
            return true;

        } catch (error) {
            console.error(`Failed to load test data set '${dataSetName}':`, error);
            return false;
        }
    }

    /**
     * テストデータセット一覧を表示
     */
    listTestDataSets(): void {
        console.log('Available test data sets:');
        this.testDataSets.forEach((dataSet, name) => {
            console.log(`  ${name}: ${dataSet.description}`);
            console.log(`    Characters: ${dataSet.characters.length}`);
            console.log(`    Rose Essence: ${dataSet.roseEssence}`);
            console.log(`    Scenario: ${dataSet.scenario}`);
        });
    }

    /**
     * テストデータセットを作成
     */
    createTestDataSet(name: string, dataSet: TestDataSet): void {
        this.testDataSets.set(name, dataSet);
        console.log(`Test data set '${name}' created`);
    }

    /**
     * システム状態を保存
     */
    saveState(name: string): void {
        try {
            const state = {
                timestamp: Date.now(),
                jobSystemState: this.jobSystem.createBackup(),
                config: this.config,
            };

            this.backupStates.set(name, state);
            console.log(`System state saved as '${name}'`);

        } catch (error) {
            console.error(`Failed to save state '${name}':`, error);
        }
    }

    /**
     * システム状態を読み込み
     */
    loadState(name: string): boolean {
        const state = this.backupStates.get(name);
        if (!state) {
            console.error(`Saved state '${name}' not found`);
            return false;
        }

        try {
            this.jobSystem.restoreFromBackup(state.jobSystemState);
            this.config = state.config;

            console.log(`System state '${name}' loaded successfully`);
            return true;

        } catch (error) {
            console.error(`Failed to load state '${name}':`, error);
            return false;
        }
    }

    /**
     * 保存された状態一覧を表示
     */
    listSavedStates(): void {
        console.log('Saved states:');
        this.backupStates.forEach((state, name) => {
            const date = new Date(state.timestamp).toLocaleString();
            console.log(`  ${name}: ${date}`);
        });
    }

    /**
     * テスト用職業を作成
     */
    createTestJob(jobData: Partial<JobData>): void {
        const defaultJobData: JobData = {
            id: jobData.id || `test_job_${Date.now()}`,
            name: jobData.name || 'Test Job',
            description: jobData.description || 'A test job for development',
            category: jobData.category || JobCategory.WARRIOR,
            maxRank: jobData.maxRank || 5,
            statModifiers: jobData.statModifiers || {
                1: { hp: 10, mp: 5, attack: 8, defense: 6, speed: 4, skill: 3, luck: 2 },
                2: { hp: 20, mp: 10, attack: 16, defense: 12, speed: 8, skill: 6, luck: 4 },
                3: { hp: 30, mp: 15, attack: 24, defense: 18, speed: 12, skill: 9, luck: 6 },
                4: { hp: 40, mp: 20, attack: 32, defense: 24, speed: 16, skill: 12, luck: 8 },
                5: { hp: 50, mp: 25, attack: 40, defense: 30, speed: 20, skill: 15, luck: 10 },
            },
            availableSkills: jobData.availableSkills || {
                1: ['basic_attack'],
                2: ['basic_attack', 'power_strike'],
                3: ['basic_attack', 'power_strike', 'guard'],
                4: ['basic_attack', 'power_strike', 'guard', 'special_attack'],
                5: ['basic_attack', 'power_strike', 'guard', 'special_attack', 'ultimate'],
            },
            rankUpRequirements: jobData.rankUpRequirements || {
                2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] },
                4: { roseEssenceCost: 40, levelRequirement: 15, prerequisiteSkills: ['guard'] },
                5: { roseEssenceCost: 80, levelRequirement: 20, prerequisiteSkills: ['special_attack'] },
            },
            growthRateModifiers: jobData.growthRateModifiers || {
                1: { hp: 1.0, mp: 1.0, attack: 1.0, defense: 1.0, speed: 1.0, skill: 1.0, luck: 1.0 },
                2: { hp: 1.1, mp: 1.1, attack: 1.1, defense: 1.1, speed: 1.1, skill: 1.1, luck: 1.1 },
                3: { hp: 1.2, mp: 1.2, attack: 1.2, defense: 1.2, speed: 1.2, skill: 1.2, luck: 1.2 },
                4: { hp: 1.3, mp: 1.3, attack: 1.3, defense: 1.3, speed: 1.3, skill: 1.3, luck: 1.3 },
                5: { hp: 1.4, mp: 1.4, attack: 1.4, defense: 1.4, speed: 1.4, skill: 1.4, luck: 1.4 },
            },
            jobTraits: jobData.jobTraits || [],
            visual: jobData.visual || {
                iconPath: 'assets/jobs/test_job.png',
                spriteModifications: [],
                colorScheme: { primary: '#ffffff', secondary: '#cccccc' },
            },
        };

        // JobSystemに職業を追加（実装に依存）
        console.log(`Test job '${defaultJobData.id}' created:`, defaultJobData);
    }

    /**
     * 職業を修正
     */
    modifyJob(jobId: string, changes: Partial<JobData>): void {
        console.log(`Modifying job '${jobId}' with changes:`, changes);
        // 実際の修正処理は JobSystem の実装に依存
    }

    /**
     * 職業を削除
     */
    deleteJob(jobId: string): void {
        console.log(`Deleting job '${jobId}'`);
        // 実際の削除処理は JobSystem の実装に依存
    }

    /**
     * テスト用キャラクターを作成
     */
    createTestCharacter(characterId: string, jobId: string, rank: number = 1): void {
        try {
            this.jobSystem.setCharacterJob(characterId, jobId, rank);
            console.log(`Test character '${characterId}' created with job '${jobId}' at rank ${rank}`);
        } catch (error) {
            console.error(`Failed to create test character '${characterId}':`, error);
        }
    }

    /**
     * キャラクターランクを設定
     */
    setCharacterRank(characterId: string, rank: number): void {
        try {
            const currentJob = this.jobSystem.getCharacterJob(characterId);
            if (!currentJob) {
                console.error(`Character '${characterId}' has no job assigned`);
                return;
            }

            this.jobSystem.setCharacterJob(characterId, currentJob.id, rank);
            console.log(`Character '${characterId}' rank set to ${rank}`);
        } catch (error) {
            console.error(`Failed to set rank for character '${characterId}':`, error);
        }
    }

    /**
     * 薔薇の力を設定
     */
    setRoseEssence(amount: number): void {
        try {
            // 現在の薔薇の力をリセットして新しい値を設定
            const current = this.jobSystem.getCurrentRoseEssence();
            if (current > 0) {
                // 現在の薔薇の力を消費
                this.jobSystem.consumeRoseEssence(current, 'dev_reset');
            }

            if (amount > 0) {
                // 新しい薔薇の力を追加
                this.jobSystem.awardRoseEssence(amount, 'dev_set');
            }

            console.log(`Rose essence set to ${amount}`);
        } catch (error) {
            console.error(`Failed to set rose essence:`, error);
        }
    }

    /**
     * 薔薇の力を追加
     */
    addRoseEssence(amount: number): void {
        try {
            this.jobSystem.awardRoseEssence(amount, 'dev_add');
            console.log(`Added ${amount} rose essence. Current: ${this.jobSystem.getCurrentRoseEssence()}`);
        } catch (error) {
            console.error(`Failed to add rose essence:`, error);
        }
    }

    /**
     * 薔薇の力をリセット
     */
    resetRoseEssence(): void {
        this.setRoseEssence(0);
    }

    /**
     * 職業システムをリセット
     */
    resetJobSystem(): void {
        try {
            // システムの完全リセット
            this.jobSystem.reset();
            console.log('Job system reset successfully');
        } catch (error) {
            console.error('Failed to reset job system:', error);
        }
    }

    /**
     * 職業システムを検証
     */
    validateJobSystem(): any {
        try {
            const healthCheck = this.jobSystem.performHealthCheck();
            console.log('Job system validation:', healthCheck);
            return healthCheck;
        } catch (error) {
            console.error('Failed to validate job system:', error);
            return { isHealthy: false, issues: [error.toString()] };
        }
    }

    /**
     * デバッグモードを有効化
     */
    private enableDebugMode(): void {
        console.log('Debug mode enabled');
        // デバッグ機能を有効化
    }

    /**
     * デバッグモードを無効化
     */
    private disableDebugMode(): void {
        console.log('Debug mode disabled');
        // デバッグ機能を無効化
    }

    /**
     * 高速モードを有効化
     */
    enableFastMode(): void {
        this.config.testing.fastMode = true;
        console.log('Fast mode enabled - animations and delays will be reduced');
        // アニメーション速度を上げる、待機時間を短縮する等
    }

    /**
     * 高速モードを無効化
     */
    disableFastMode(): void {
        this.config.testing.fastMode = false;
        console.log('Fast mode disabled - normal timing restored');
        // 通常の速度に戻す
    }

    /**
     * 要件バイパスを設定
     */
    setBypassRequirements(enabled: boolean): void {
        this.config.development.bypassRequirements = enabled;
        console.log(`Requirements bypass ${enabled ? 'enabled' : 'disabled'}`);
        // JobSystemに設定を適用（実装に依存）
    }

    /**
     * システムデータをエクスポート
     */
    exportSystemData(): string {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                config: this.config,
                jobSystemState: this.jobSystem.createBackup(),
                testDataSets: Array.from(this.testDataSets.entries()),
                savedStates: Array.from(this.backupStates.entries()),
            };

            const exportText = JSON.stringify(exportData, null, 2);
            console.log('System data exported');
            return exportText;

        } catch (error) {
            console.error('Failed to export system data:', error);
            return '';
        }
    }

    /**
     * システムデータをインポート
     */
    importSystemData(data: any): boolean {
        try {
            if (data.config) {
                this.config = data.config;
            }

            if (data.jobSystemState) {
                this.jobSystem.restoreFromBackup(data.jobSystemState);
            }

            if (data.testDataSets) {
                this.testDataSets = new Map(data.testDataSets);
            }

            if (data.savedStates) {
                this.backupStates = new Map(data.savedStates);
            }

            console.log('System data imported successfully');
            return true;

        } catch (error) {
            console.error('Failed to import system data:', error);
            return false;
        }
    }

    /**
     * オブジェクトを深くマージ
     */
    private deepMerge(target: any, source: any): any {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * ヘルプを表示
     */
    private showHelp(): void {
        const commands = [
            '=== Job System Development Tools Commands ===',
            '',
            'Configuration:',
            '  setConfig(config)         - Update development configuration',
            '  getConfig()               - Get current configuration',
            '  resetConfig()             - Reset to default configuration',
            '',
            'Test Data Management:',
            '  loadTestData(name)        - Load test data set',
            '  listTestData()            - List available test data sets',
            '  createTestData(name, data) - Create new test data set',
            '',
            'State Management:',
            '  saveState(name)           - Save current system state',
            '  loadState(name)           - Load saved system state',
            '  listStates()              - List saved states',
            '',
            'Data Manipulation:',
            '  createJob(jobData)        - Create test job',
            '  modifyJob(jobId, changes) - Modify existing job',
            '  deleteJob(jobId)          - Delete job',
            '',
            'Character Operations:',
            '  createCharacter(id, jobId, rank) - Create test character',
            '  setCharacterRank(id, rank)       - Set character rank',
            '',
            'Rose Essence Operations:',
            '  setRoseEssence(amount)    - Set rose essence amount',
            '  addRoseEssence(amount)    - Add rose essence',
            '  resetRoseEssence()        - Reset rose essence to 0',
            '',
            'System Operations:',
            '  resetSystem()             - Reset entire job system',
            '  validateSystem()          - Validate system integrity',
            '',
            'Development Features:',
            '  enableFastMode()          - Enable fast mode (reduced delays)',
            '  disableFastMode()         - Disable fast mode',
            '  bypassRequirements(bool)  - Enable/disable requirement bypass',
            '',
            'Data Management:',
            '  exportData()              - Export all system data',
            '  importData(data)          - Import system data',
            '',
            'Usage Examples:',
            '  jobDev.loadTestData("basic")',
            '  jobDev.createCharacter("test1", "warrior", 3)',
            '  jobDev.setRoseEssence(500)',
            '  jobDev.enableFastMode()',
        ];

        console.log(commands.join('\n'));
    }
}