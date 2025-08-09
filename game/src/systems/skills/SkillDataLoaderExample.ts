/**
 * SkillDataLoaderの使用例
 * 
 * このファイルはSkillDataLoaderの基本的な使用方法を示します。
 */

import { SkillDataLoader, SkillDataLoaderError } from './SkillDataLoader';
import { SkillManager } from './SkillManager';

/**
 * スキルデータローダーの使用例
 */
export class SkillDataLoaderExample {
    private loader: SkillDataLoader;
    private skillManager: SkillManager;

    constructor() {
        // SkillDataLoaderを初期化
        this.loader = new SkillDataLoader({
            dataFilePath: 'data/skills.json',
            strictValidation: true,
            ignoreWarnings: false,
            useCache: true,
            timeout: 5000,
            retryCount: 3
        });

        this.skillManager = new SkillManager();
    }

    /**
     * スキルデータを読み込んでSkillManagerに登録する
     */
    async initializeSkills(): Promise<void> {
        try {
            console.log('スキルデータを読み込み中...');

            // スキルデータを読み込み
            const result = await this.loader.loadSkillData();

            if (!result.success) {
                throw new Error(`スキルデータの読み込みに失敗: ${result.message}`);
            }

            console.log(`${result.skills!.length}個のスキルを読み込みました`);

            // 警告がある場合は表示
            if (result.warnings && result.warnings.length > 0) {
                console.warn('警告:', result.warnings);
            }

            // 各スキルをSkillManagerに登録
            for (const skillData of result.skills!) {
                const registerResult = this.skillManager.registerSkill(skillData);

                if (!registerResult.success) {
                    console.error(`スキル「${skillData.name}」の登録に失敗:`, registerResult.message);
                } else {
                    console.log(`スキル「${skillData.name}」を登録しました`);
                }
            }

            console.log('スキルシステムの初期化が完了しました');

        } catch (error) {
            console.error('スキルシステムの初期化に失敗:', error);
            throw error;
        }
    }

    /**
     * スキルデータを強制的に再読み込みする
     */
    async reloadSkills(): Promise<void> {
        try {
            console.log('スキルデータを再読み込み中...');

            // キャッシュをクリア
            this.loader.clearCache();

            // 強制的に再読み込み
            const result = await this.loader.loadSkillData(true);

            if (!result.success) {
                throw new Error(`スキルデータの再読み込みに失敗: ${result.message}`);
            }

            // SkillManagerをクリアして再登録
            this.skillManager.clear();

            for (const skillData of result.skills!) {
                this.skillManager.registerSkill(skillData);
            }

            console.log('スキルデータの再読み込みが完了しました');

        } catch (error) {
            console.error('スキルデータの再読み込みに失敗:', error);
            throw error;
        }
    }

    /**
     * スキルデータの統計情報を表示する
     */
    async showSkillStatistics(): Promise<void> {
        try {
            const result = await this.loader.loadSkillData();

            if (!result.success) {
                console.error('スキルデータの読み込みに失敗:', result.message);
                return;
            }

            const skills = result.skills!;

            console.log('=== スキル統計情報 ===');
            console.log(`総スキル数: ${skills.length}`);

            // スキル種別ごとの統計
            const typeStats = new Map<string, number>();
            for (const skill of skills) {
                const count = typeStats.get(skill.skillType) || 0;
                typeStats.set(skill.skillType, count + 1);
            }

            console.log('スキル種別別統計:');
            for (const [type, count] of typeStats) {
                console.log(`  ${type}: ${count}個`);
            }

            // レベル要件の統計
            const levelStats = skills.map(s => s.usageCondition.levelRequirement);
            const minLevel = Math.min(...levelStats);
            const maxLevel = Math.max(...levelStats);
            const avgLevel = levelStats.reduce((a, b) => a + b, 0) / levelStats.length;

            console.log(`レベル要件: 最小${minLevel}, 最大${maxLevel}, 平均${avgLevel.toFixed(1)}`);

            // MP消費の統計
            const mpStats = skills.map(s => s.usageCondition.mpCost);
            const minMP = Math.min(...mpStats);
            const maxMP = Math.max(...mpStats);
            const avgMP = mpStats.reduce((a, b) => a + b, 0) / mpStats.length;

            console.log(`MP消費: 最小${minMP}, 最大${maxMP}, 平均${avgMP.toFixed(1)}`);

        } catch (error) {
            console.error('統計情報の表示に失敗:', error);
        }
    }

    /**
     * エラーハンドリングの例
     */
    async handleErrors(): Promise<void> {
        try {
            const result = await this.loader.loadSkillData();

            if (!result.success) {
                switch (result.error) {
                    case SkillDataLoaderError.FILE_LOAD_ERROR:
                        console.error('ファイルの読み込みエラー:', result.message);
                        // ファイルパスの確認やネットワーク状況の確認を促す
                        break;

                    case SkillDataLoaderError.JSON_PARSE_ERROR:
                        console.error('JSON解析エラー:', result.message);
                        // JSONファイルの構文チェックを促す
                        break;

                    case SkillDataLoaderError.SCHEMA_VALIDATION_ERROR:
                        console.error('スキーマ検証エラー:', result.message);
                        console.error('詳細:', result.details);
                        // データ構造の修正を促す
                        break;

                    case SkillDataLoaderError.REFERENCE_INTEGRITY_ERROR:
                        console.error('参照整合性エラー:', result.message);
                        console.error('詳細:', result.details);
                        // 前提スキルの参照を確認するよう促す
                        break;

                    case SkillDataLoaderError.DUPLICATE_SKILL_ID_ERROR:
                        console.error('重複IDエラー:', result.message);
                        console.error('重複ID:', result.details);
                        // 重複するIDの修正を促す
                        break;

                    case SkillDataLoaderError.NETWORK_ERROR:
                        console.error('ネットワークエラー:', result.message);
                        // ネットワーク接続の確認を促す
                        break;

                    default:
                        console.error('不明なエラー:', result.message);
                        break;
                }
            }

        } catch (error) {
            console.error('予期しないエラー:', error);
        }
    }

    /**
     * 設定のカスタマイズ例
     */
    customizeConfiguration(): void {
        // 開発環境用の設定
        if (process.env.NODE_ENV === 'development') {
            this.loader.updateConfig({
                strictValidation: false,  // 開発中は厳密でない検証
                ignoreWarnings: true,     // 警告を無視
                timeout: 10000,           // タイムアウトを長く
                retryCount: 5             // リトライ回数を増やす
            });
        }

        // 本番環境用の設定
        if (process.env.NODE_ENV === 'production') {
            this.loader.updateConfig({
                strictValidation: true,   // 本番では厳密な検証
                ignoreWarnings: false,    // 警告も表示
                useCache: true,           // キャッシュを有効化
                timeout: 3000,            // タイムアウトを短く
                retryCount: 1             // リトライ回数を最小限に
            });
        }
    }

    /**
     * キャッシュ管理の例
     */
    manageCacheExample(): void {
        // キャッシュ情報の確認
        console.log('キャッシュされたスキル数:', this.loader.getCachedSkillCount());
        console.log('最後の読み込み時刻:', this.loader.getLastLoadTime());

        // キャッシュのクリア
        this.loader.clearCache();
        console.log('キャッシュをクリアしました');

        // 設定の確認
        const config = this.loader.getConfig();
        console.log('現在の設定:', config);
    }
}

// 使用例
export async function exampleUsage(): Promise<void> {
    const example = new SkillDataLoaderExample();

    try {
        // 基本的な初期化
        await example.initializeSkills();

        // 統計情報の表示
        await example.showSkillStatistics();

        // 設定のカスタマイズ
        example.customizeConfiguration();

        // キャッシュ管理
        example.manageCacheExample();

    } catch (error) {
        console.error('例の実行に失敗:', error);
    }
}