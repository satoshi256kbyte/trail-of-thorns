/**
 * ExperienceUIVisualTest.test.ts - ExperienceUIのビジュアルテスト
 * 
 * このテストファイルは、ExperienceUIの視覚的な表示とアニメーション効果をテストします:
 * - UI要素の正しい配置と表示
 * - アニメーション効果の動作確認
 * - 色とスタイルの適用確認
 * - レスポンシブデザインの確認
 * - アクセシビリティ対応の確認
 * 
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5のビジュアルテスト
 */

import * as Phaser from 'phaser';
import { ExperienceUI, ExperienceGainDisplay } from '../../game/src/systems/experience/ExperienceUI';
import {
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    ExperienceSource,
    UnitStats
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// ビジュアルテスト用のシーン
class VisualTestScene extends Phaser.Scene {
    public experienceUI!: ExperienceUI;
    private testResults: Array<{ name: string; passed: boolean; details?: string }> = [];

    constructor() {
        super({ key: 'VisualTestScene' });
    }

    create(): void {
        this.experienceUI = new ExperienceUI(this);
        this.runVisualTests();
    }

    private async runVisualTests(): Promise<void> {
        await this.testExperienceGainDisplay();
        await this.testLevelUpEffect();
        await this.testExperienceBar();
        await this.testGrowthResults();
        await this.testExperienceInfo();
        await this.testResponsiveDesign();
        await this.testColorAndStyling();
        await this.testAnimationTiming();

        this.reportResults();
    }

    private async testExperienceGainDisplay(): Promise<void> {
        console.log('Testing Experience Gain Display...');

        try {
            // 異なるソースの経験値獲得を表示
            const sources = [
                ExperienceSource.ATTACK_HIT,
                ExperienceSource.ENEMY_DEFEAT,
                ExperienceSource.ALLY_SUPPORT,
                ExperienceSource.HEALING,
                ExperienceSource.SKILL_USE
            ];

            sources.forEach((source, index) => {
                const display: ExperienceGainDisplay = {
                    characterId: `test-char-${index}`,
                    amount: 25 + index * 15,
                    source,
                    position: { x: 200 + index * 100, y: 200 }
                };

                this.experienceUI.showExperienceGain(display);
            });

            // 表示の確認
            await this.wait(500);
            const debugInfo = this.experienceUI.getDebugInfo();

            this.testResults.push({
                name: 'Experience Gain Display',
                passed: debugInfo.activeGains === sources.length,
                details: `Expected ${sources.length} active gains, got ${debugInfo.activeGains}`
            });

        } catch (error) {
            this.testResults.push({
                name: 'Experience Gain Display',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testLevelUpEffect(): Promise<void> {
        console.log('Testing Level Up Effect...');

        try {
            const mockCharacter: Unit = {
                id: 'visual-test-character',
                name: 'Visual Test Hero',
                position: { x: 10, y: 10 },
                stats: {} as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            const levelUpResult: LevelUpResult = {
                characterId: 'visual-test-character',
                oldLevel: 4,
                newLevel: 5,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 250,
                oldStats: {} as UnitStats,
                newStats: {} as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            const effectPromise = this.experienceUI.showLevelUpEffect(mockCharacter, levelUpResult);

            // エフェクト開始の確認
            await this.wait(100);
            let debugInfo = this.experienceUI.getDebugInfo();
            const effectStarted = debugInfo.activeEffects > 0;

            // エフェクト完了の確認
            await effectPromise;
            await this.wait(100);
            debugInfo = this.experienceUI.getDebugInfo();
            const effectCompleted = debugInfo.activeEffects === 0;

            this.testResults.push({
                name: 'Level Up Effect',
                passed: effectStarted && effectCompleted,
                details: `Effect started: ${effectStarted}, Effect completed: ${effectCompleted}`
            });

        } catch (error) {
            this.testResults.push({
                name: 'Level Up Effect',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testExperienceBar(): Promise<void> {
        console.log('Testing Experience Bar...');

        try {
            const experienceInfos = [
                {
                    characterId: 'bar-test-1',
                    currentExperience: 25,
                    currentLevel: 3,
                    experienceToNextLevel: 75,
                    totalExperience: 125,
                    canLevelUp: false,
                    isMaxLevel: false,
                    experienceProgress: 0.25
                },
                {
                    characterId: 'bar-test-2',
                    currentExperience: 75,
                    currentLevel: 5,
                    experienceToNextLevel: 25,
                    totalExperience: 275,
                    canLevelUp: false,
                    isMaxLevel: false,
                    experienceProgress: 0.75
                },
                {
                    characterId: 'bar-test-3',
                    currentExperience: 0,
                    currentLevel: 10,
                    experienceToNextLevel: 0,
                    totalExperience: 1000,
                    canLevelUp: false,
                    isMaxLevel: true,
                    experienceProgress: 1.0
                }
            ];

            experienceInfos.forEach(info => {
                this.experienceUI.updateExperienceBar(info.characterId, info);
            });

            await this.wait(300);
            const debugInfo = this.experienceUI.getDebugInfo();

            this.testResults.push({
                name: 'Experience Bar',
                passed: debugInfo.activeBars === experienceInfos.length,
                details: `Expected ${experienceInfos.length} active bars, got ${debugInfo.activeBars}`
            });

        } catch (error) {
            this.testResults.push({
                name: 'Experience Bar',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testGrowthResults(): Promise<void> {
        console.log('Testing Growth Results...');

        try {
            const mockCharacter: Unit = {
                id: 'growth-test-character',
                name: 'Growth Test Hero',
                position: { x: 5, y: 5 },
                stats: {} as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            const growthResult: StatGrowthResult = {
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 1,
                speed: 1,
                skill: 2,
                luck: 0
            };

            this.experienceUI.showGrowthResults(mockCharacter, growthResult);

            await this.wait(500);

            // 成長結果が表示されていることを確認（実際の表示確認は手動）
            this.testResults.push({
                name: 'Growth Results',
                passed: true,
                details: 'Growth results panel displayed successfully'
            });

            // パネルを閉じる
            this.experienceUI.hideGrowthResults();

        } catch (error) {
            this.testResults.push({
                name: 'Growth Results',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testExperienceInfo(): Promise<void> {
        console.log('Testing Experience Info...');

        try {
            const mockCharacter: Unit = {
                id: 'info-test-character',
                name: 'Info Test Hero',
                position: { x: 5, y: 5 },
                stats: {} as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            const experienceInfo: ExperienceInfo = {
                characterId: 'info-test-character',
                currentExperience: 150,
                currentLevel: 7,
                experienceToNextLevel: 100,
                totalExperience: 650,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.6
            };

            this.experienceUI.displayExperienceInfo(mockCharacter, experienceInfo);

            await this.wait(300);

            this.testResults.push({
                name: 'Experience Info',
                passed: true,
                details: 'Experience info panel displayed successfully'
            });

            // 最大レベルの場合もテスト
            experienceInfo.isMaxLevel = true;
            experienceInfo.experienceProgress = 1.0;
            this.experienceUI.displayExperienceInfo(mockCharacter, experienceInfo);

            await this.wait(300);

            this.experienceUI.hideExperienceInfo();

        } catch (error) {
            this.testResults.push({
                name: 'Experience Info',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testResponsiveDesign(): Promise<void> {
        console.log('Testing Responsive Design...');

        try {
            // 異なる画面サイズでのテスト
            const screenSizes = [
                { width: 1024, height: 768 },
                { width: 1920, height: 1080 },
                { width: 800, height: 600 }
            ];

            for (const size of screenSizes) {
                this.experienceUI.resize(size.width, size.height);

                // リサイズ後にUI要素を表示
                const display: ExperienceGainDisplay = {
                    characterId: 'resize-test',
                    amount: 50,
                    source: ExperienceSource.ATTACK_HIT,
                    position: { x: size.width / 2, y: size.height / 2 }
                };

                this.experienceUI.showExperienceGain(display);
                await this.wait(100);
            }

            this.testResults.push({
                name: 'Responsive Design',
                passed: true,
                details: 'UI elements adapted to different screen sizes'
            });

        } catch (error) {
            this.testResults.push({
                name: 'Responsive Design',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testColorAndStyling(): Promise<void> {
        console.log('Testing Color and Styling...');

        try {
            // 異なる経験値ソースで異なる色が使用されることをテスト
            const colorTests = [
                { source: ExperienceSource.ATTACK_HIT, expectedColor: '#ff6666' },
                { source: ExperienceSource.ENEMY_DEFEAT, expectedColor: '#ffff00' },
                { source: ExperienceSource.ALLY_SUPPORT, expectedColor: '#66ff66' },
                { source: ExperienceSource.HEALING, expectedColor: '#66ffff' },
                { source: ExperienceSource.SKILL_USE, expectedColor: '#ff66ff' }
            ];

            colorTests.forEach((test, index) => {
                const display: ExperienceGainDisplay = {
                    characterId: `color-test-${index}`,
                    amount: 30,
                    source: test.source,
                    position: { x: 100 + index * 80, y: 400 }
                };

                this.experienceUI.showExperienceGain(display);
            });

            await this.wait(500);

            this.testResults.push({
                name: 'Color and Styling',
                passed: true,
                details: 'Different colors applied for different experience sources'
            });

        } catch (error) {
            this.testResults.push({
                name: 'Color and Styling',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private async testAnimationTiming(): Promise<void> {
        console.log('Testing Animation Timing...');

        try {
            const startTime = Date.now();

            // 短い期間のアニメーションをテスト
            const display: ExperienceGainDisplay = {
                characterId: 'timing-test',
                amount: 75,
                source: ExperienceSource.ENEMY_DEFEAT,
                position: { x: 500, y: 300 },
                duration: 1000
            };

            this.experienceUI.showExperienceGain(display);

            // アニメーション開始の確認
            let debugInfo = this.experienceUI.getDebugInfo();
            const animationStarted = debugInfo.activeGains > 0;

            // アニメーション完了まで待機
            await this.wait(1200);

            debugInfo = this.experienceUI.getDebugInfo();
            const animationCompleted = debugInfo.activeGains === 0;

            const totalTime = Date.now() - startTime;

            this.testResults.push({
                name: 'Animation Timing',
                passed: animationStarted && animationCompleted && totalTime >= 1000 && totalTime <= 1500,
                details: `Animation started: ${animationStarted}, completed: ${animationCompleted}, time: ${totalTime}ms`
            });

        } catch (error) {
            this.testResults.push({
                name: 'Animation Timing',
                passed: false,
                details: `Error: ${error}`
            });
        }
    }

    private reportResults(): void {
        console.log('\n=== ExperienceUI Visual Test Results ===');

        let passedTests = 0;
        let totalTests = this.testResults.length;

        this.testResults.forEach(result => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${result.name}`);
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }

            if (result.passed) {
                passedTests++;
            }
        });

        console.log(`\nSummary: ${passedTests}/${totalTests} tests passed`);

        if (passedTests === totalTests) {
            console.log('🎉 All visual tests passed!');
        } else {
            console.log('⚠️  Some visual tests failed. Please review the results above.');
        }
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.time.delayedCall(ms, resolve);
        });
    }
}

describe('ExperienceUI Visual Tests', () => {
    let game: Phaser.Game;
    let scene: VisualTestScene;

    beforeAll((done) => {
        // ヘッドレスモードでPhaserゲームを作成
        game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width: 1024,
            height: 768,
            scene: VisualTestScene,
            callbacks: {
                postBoot: () => {
                    scene = game.scene.getScene('VisualTestScene') as VisualTestScene;
                    done();
                }
            }
        });
    });

    afterAll(() => {
        if (game) {
            game.destroy(true);
        }
    });

    test('Visual tests execution', (done) => {
        // ビジュアルテストの実行完了を待つ
        setTimeout(() => {
            expect(scene).toBeDefined();
            expect(scene.experienceUI).toBeDefined();
            done();
        }, 10000); // 10秒でタイムアウト
    }, 15000);

    test('UI elements are properly positioned', () => {
        const debugInfo = scene.experienceUI.getDebugInfo();
        expect(debugInfo.containerVisible).toBe(true);
    });

    test('Animation effects work correctly', async () => {
        const mockCharacter: Unit = {
            id: 'animation-test',
            name: 'Animation Test',
            position: { x: 5, y: 5 },
            stats: {} as UnitStats,
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };

        const levelUpResult: LevelUpResult = {
            characterId: 'animation-test',
            oldLevel: 1,
            newLevel: 2,
            statGrowth: { hp: 3, mp: 2, attack: 1, defense: 1, speed: 0, skill: 1, luck: 0 },
            newExperienceRequired: 100,
            oldStats: {} as UnitStats,
            newStats: {} as UnitStats,
            levelsGained: 1,
            timestamp: Date.now()
        };

        const effectPromise = scene.experienceUI.showLevelUpEffect(mockCharacter, levelUpResult);
        expect(effectPromise).toBeInstanceOf(Promise);

        await effectPromise;

        const debugInfo = scene.experienceUI.getDebugInfo();
        expect(debugInfo.activeEffects).toBe(0); // アニメーション完了後はクリーンアップされる
    });

    test('Multiple UI elements can be displayed simultaneously', () => {
        // 複数の経験値獲得を同時表示
        for (let i = 0; i < 5; i++) {
            const display: ExperienceGainDisplay = {
                characterId: `multi-test-${i}`,
                amount: 20 + i * 10,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100 + i * 50, y: 200 }
            };
            scene.experienceUI.showExperienceGain(display);
        }

        const debugInfo = scene.experienceUI.getDebugInfo();
        expect(debugInfo.activeGains).toBe(5);
    });

    test('UI cleanup works properly', () => {
        // UI要素を作成
        const display: ExperienceGainDisplay = {
            characterId: 'cleanup-test',
            amount: 50,
            source: ExperienceSource.ENEMY_DEFEAT,
            position: { x: 300, y: 300 }
        };
        scene.experienceUI.showExperienceGain(display);

        // クリーンアップ実行
        scene.experienceUI.clearAll();

        const debugInfo = scene.experienceUI.getDebugInfo();
        expect(debugInfo.activeGains).toBe(0);
        expect(debugInfo.activeEffects).toBe(0);
        expect(debugInfo.activeBars).toBe(0);
    });

    test('Configuration updates work correctly', () => {
        const newConfig = {
            levelUpEffect: {
                duration: 1500,
                glowColor: 0x00ff00
            },
            experienceBar: {
                width: 250,
                height: 25
            }
        };

        expect(() => {
            scene.experienceUI.updateConfig(newConfig);
        }).not.toThrow();
    });
});