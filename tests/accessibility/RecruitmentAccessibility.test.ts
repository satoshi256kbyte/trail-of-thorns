/**
 * 仲間化システム アクセシビリティテスト
 * 
 * 仲間化システムのキーボード操作、視覚的フィードバック、
 * スクリーンリーダー対応などのアクセシビリティ機能をテストします。
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { RecruitmentUI } from '../../game/src/systems/recruitment/RecruitmentUI';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { InputHandler } from '../../game/src/input/InputHandler';
import { Unit, StageData, KeyboardEvent } from '../../game/src/types';

// アクセシビリティテスト用のモック
class MockAccessibilityAPI {
    private announcements: string[] = [];
    private focusedElement: string | null = null;

    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        this.announcements.push(`[${priority}] ${message}`);
    }

    setFocus(elementId: string): void {
        this.focusedElement = elementId;
    }

    getFocusedElement(): string | null {
        return this.focusedElement;
    }

    getAnnouncements(): string[] {
        return [...this.announcements];
    }

    clearAnnouncements(): void {
        this.announcements = [];
    }
}

const createAccessibleStageData = (): StageData => ({
    id: 'accessibility-test-stage',
    name: 'Accessibility Test Stage',
    mapData: {
        width: 10,
        height: 10,
        tiles: Array(10).fill(null).map(() =>
            Array(10).fill({ type: 'grass', movementCost: 1 })
        )
    },
    playerUnits: [
        {
            id: 'player-hero',
            name: 'Hero',
            position: { x: 2, y: 2 },
            stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        }
    ],
    enemyUnits: [
        {
            id: 'recruitable-enemy',
            name: 'Recruitable Knight',
            position: { x: 6, y: 6 },
            stats: { maxHP: 80, maxMP: 30, attack: 18, defense: 12, speed: 8, movement: 3 },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            isRecruitable: true,
            recruitmentConditions: [
                {
                    id: 'hero_attack',
                    type: 'specific_attacker',
                    description: '主人公で攻撃して撃破する',
                    parameters: { attackerId: 'player-hero' }
                },
                {
                    id: 'hp_low',
                    type: 'hp_threshold',
                    description: 'HPが30%以下の状態で撃破する',
                    parameters: { threshold: 0.3 }
                }
            ]
        }
    ],
    victoryConditions: [{ type: 'defeat_all_enemies' }]
});

describe('RecruitmentSystem アクセシビリティテスト', () => {
    let gameplayScene: GameplayScene;
    let recruitmentSystem: RecruitmentSystem;
    let recruitmentUI: RecruitmentUI;
    let characterManager: CharacterManager;
    let inputHandler: InputHandler;
    let accessibilityAPI: MockAccessibilityAPI;
    let stageData: StageData;

    beforeEach(() => {
        accessibilityAPI = new MockAccessibilityAPI();
        gameplayScene = new GameplayScene();
        characterManager = new CharacterManager();
        inputHandler = new InputHandler();

        recruitmentSystem = new RecruitmentSystem(null as any, characterManager, null as any);
        recruitmentUI = new RecruitmentUI(gameplayScene as any);

        // アクセシビリティAPIを注入
        recruitmentUI.setAccessibilityAPI(accessibilityAPI);

        stageData = createAccessibleStageData();
        gameplayScene.loadStage(stageData);
        recruitmentSystem.initialize(stageData);
    });

    describe('キーボード操作のアクセシビリティ', () => {
        test('Tabキーによる仲間化対象の順次選択', () => {
            const recruitableUnits = recruitmentSystem.getRecruitableUnits();
            expect(recruitableUnits.length).toBeGreaterThan(0);

            // 最初のユニットにフォーカス
            inputHandler.handleKeyDown({ key: 'Tab', preventDefault: jest.fn() } as any);

            expect(accessibilityAPI.getFocusedElement()).toBe('recruitable-enemy');
            expect(accessibilityAPI.getAnnouncements()).toContain(
                '[polite] 仲間化可能な敵: Recruitable Knight を選択しました'
            );
        });

        test('矢印キーによる仲間化対象の移動', () => {
            const target = characterManager.getUnitById('recruitable-enemy');

            // 仲間化対象を選択
            recruitmentSystem.selectRecruitmentTarget(target);

            // 右矢印キーで次の対象に移動
            inputHandler.handleKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as any);

            expect(accessibilityAPI.getAnnouncements()).toContain(
                '[polite] 次の仲間化対象に移動しました'
            );
        });

        test('Enterキーによる仲間化条件の詳細表示', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentSystem.selectRecruitmentTarget(target);

            // Enterキーで詳細表示
            inputHandler.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() } as any);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化条件を表示します'
            );
            expect(announcements).toContain(
                '[polite] 条件1: 主人公で攻撃して撃破する - 未達成'
            );
            expect(announcements).toContain(
                '[polite] 条件2: HPが30%以下の状態で撃破する - 未達成'
            );
        });

        test('Escapeキーによる仲間化UI の閉じる', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentSystem.selectRecruitmentTarget(target);
            recruitmentUI.showRecruitmentConditions(target, target.recruitmentConditions!);

            // EscapeキーでUI を閉じる
            inputHandler.handleKeyDown({ key: 'Escape', preventDefault: jest.fn() } as any);

            expect(accessibilityAPI.getAnnouncements()).toContain(
                '[polite] 仲間化条件表示を閉じました'
            );
            expect(accessibilityAPI.getFocusedElement()).toBe('player-hero'); // フォーカスが戻る
        });

        test('スペースキーによる仲間化進捗の音声読み上げ', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            const attacker = characterManager.getUnitById('player-hero');

            // 条件の一部を満たす
            target.currentHP = target.stats.maxHP * 0.2; // HP条件を満たす

            recruitmentSystem.selectRecruitmentTarget(target);

            // スペースキーで進捗読み上げ
            inputHandler.handleKeyDown({ key: ' ', preventDefault: jest.fn() } as any);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化進捗: 2つの条件のうち1つが達成済みです'
            );
            expect(announcements).toContain(
                '[polite] 達成済み: HPが30%以下の状態で撃破する'
            );
            expect(announcements).toContain(
                '[polite] 未達成: 主人公で攻撃して撃破する'
            );
        });

        test('数字キーによる仲間化対象の直接選択', () => {
            // 複数の仲間化対象を追加
            const secondEnemy = {
                id: 'recruitable-enemy-2',
                name: 'Recruitable Archer',
                position: { x: 8, y: 4 },
                stats: { maxHP: 70, maxMP: 40, attack: 22, defense: 10, speed: 12, movement: 4 },
                currentHP: 70,
                currentMP: 40,
                faction: 'enemy' as const,
                hasActed: false,
                hasMoved: false,
                isRecruitable: true,
                recruitmentConditions: [{
                    id: 'archer_condition',
                    type: 'specific_attacker',
                    description: '主人公で攻撃',
                    parameters: { attackerId: 'player-hero' }
                }]
            };

            characterManager.addUnit(secondEnemy);
            recruitmentSystem.initialize(stageData);

            // 数字キー2で2番目の対象を選択
            inputHandler.handleKeyDown({ key: '2', preventDefault: jest.fn() } as any);

            expect(accessibilityAPI.getFocusedElement()).toBe('recruitable-enemy-2');
            expect(accessibilityAPI.getAnnouncements()).toContain(
                '[polite] 仲間化対象2: Recruitable Archer を選択しました'
            );
        });
    });

    describe('視覚的フィードバックのアクセシビリティ', () => {
        test('高コントラストモードでの条件表示', () => {
            recruitmentUI.setAccessibilityMode('high-contrast');

            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentUI.showRecruitmentConditions(target, target.recruitmentConditions!);

            // 高コントラストの色設定が適用されることを確認
            const uiElements = recruitmentUI.getUIElements();
            expect(uiElements.conditionPanel.backgroundColor).toBe('#000000');
            expect(uiElements.conditionText.color).toBe('#ffffff');
            expect(uiElements.conditionPanel.borderColor).toBe('#ffffff');
            expect(uiElements.conditionPanel.borderWidth).toBeGreaterThanOrEqual(2);
        });

        test('色覚異常対応の条件達成表示', () => {
            recruitmentUI.setAccessibilityMode('colorblind');

            const target = characterManager.getUnitById('recruitable-enemy');
            target.currentHP = target.stats.maxHP * 0.2; // HP条件を満たす

            const progress = recruitmentSystem.getRecruitmentProgress(target);
            recruitmentUI.updateRecruitmentProgress(target, progress);

            // 色だけでなく形状やパターンでも区別できることを確認
            const progressElements = recruitmentUI.getProgressElements(target);

            // 達成済み条件にはチェックマークアイコン
            expect(progressElements.achievedConditions[0].icon).toBe('✓');
            expect(progressElements.achievedConditions[0].pattern).toBe('solid');

            // 未達成条件には×マークアイコン
            expect(progressElements.unachievedConditions[0].icon).toBe('×');
            expect(progressElements.unachievedConditions[0].pattern).toBe('dashed');
        });

        test('大きいフォントサイズでの表示対応', () => {
            recruitmentUI.setFontScale(1.5); // 150%拡大

            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentUI.showRecruitmentConditions(target, target.recruitmentConditions!);

            const textElements = recruitmentUI.getTextElements();

            // フォントサイズが拡大されることを確認
            expect(textElements.title.fontSize).toBeGreaterThanOrEqual(24);
            expect(textElements.conditions[0].fontSize).toBeGreaterThanOrEqual(18);

            // UI要素のサイズも適切に調整されることを確認
            const panelSize = recruitmentUI.getPanelSize();
            expect(panelSize.width).toBeGreaterThan(300);
            expect(panelSize.height).toBeGreaterThan(200);
        });

        test('アニメーション無効化モードの対応', () => {
            recruitmentUI.setAccessibilityMode('no-animation');

            const target = characterManager.getUnitById('recruitable-enemy');

            // 仲間化成功演出を実行
            const animationPromise = recruitmentUI.showRecruitmentSuccess(target);

            // アニメーションが即座に完了することを確認
            return animationPromise.then((duration) => {
                expect(duration).toBeLessThan(100); // 100ms以内で完了

                // 静的な表示のみが行われることを確認
                const effectElements = recruitmentUI.getEffectElements();
                expect(effectElements.successMessage.isAnimated).toBe(false);
                expect(effectElements.successIcon.isAnimated).toBe(false);
            });
        });

        test('点滅効果の制御', () => {
            recruitmentUI.setAccessibilityMode('no-flashing');

            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentSystem.convertToNPC(target);

            // NPCインジケーターを表示
            recruitmentUI.showNPCIndicator(target);

            const indicator = recruitmentUI.getNPCIndicator(target);

            // 点滅効果が無効化されることを確認
            expect(indicator.flashingEnabled).toBe(false);
            expect(indicator.pulseEnabled).toBe(false);

            // 代替の視覚的表現が使用されることを確認
            expect(indicator.staticHighlight).toBe(true);
            expect(indicator.borderStyle).toBe('solid');
        });
    });

    describe('スクリーンリーダー対応', () => {
        test('仲間化対象の詳細情報読み上げ', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentSystem.selectRecruitmentTarget(target);

            const announcements = accessibilityAPI.getAnnouncements();

            // 基本情報の読み上げ
            expect(announcements).toContain(
                '[polite] 仲間化可能な敵: Recruitable Knight'
            );
            expect(announcements).toContain(
                '[polite] 位置: 6行6列'
            );
            expect(announcements).toContain(
                '[polite] HP: 80/80, MP: 30/30'
            );
            expect(announcements).toContain(
                '[polite] 仲間化条件: 2つ'
            );
        });

        test('仲間化条件の詳細読み上げ', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentUI.announceRecruitmentConditions(target);

            const announcements = accessibilityAPI.getAnnouncements();

            expect(announcements).toContain(
                '[assertive] 仲間化条件の詳細を読み上げます'
            );
            expect(announcements).toContain(
                '[polite] 条件1: 主人公で攻撃して撃破する。現在の状態: 未達成'
            );
            expect(announcements).toContain(
                '[polite] 条件2: HPが30%以下の状態で撃破する。現在の状態: 未達成。現在のHP: 100%'
            );
        });

        test('仲間化進捗の変化通知', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            const attacker = characterManager.getUnitById('player-hero');

            // 初期状態
            recruitmentSystem.checkRecruitmentEligibility(attacker, target);
            accessibilityAPI.clearAnnouncements();

            // HP条件を満たす
            target.currentHP = target.stats.maxHP * 0.2;
            recruitmentSystem.checkRecruitmentEligibility(attacker, target);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化条件が更新されました'
            );
            expect(announcements).toContain(
                '[polite] HPが30%以下の状態で撃破する - 達成しました'
            );
            expect(announcements).toContain(
                '[polite] 仲間化進捗: 50%完了'
            );
        });

        test('NPC状態変化の通知', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            const attacker = characterManager.getUnitById('player-hero');

            // 仲間化条件を満たしてNPC化
            target.currentHP = target.stats.maxHP * 0.2;
            recruitmentSystem.processRecruitmentAttempt(attacker, target, target.currentHP);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] Recruitable Knight が仲間化候補状態になりました'
            );
            expect(announcements).toContain(
                '[polite] このキャラクターは行動できませんが、敵の攻撃対象になります'
            );
            expect(announcements).toContain(
                '[polite] ステージクリア時に生存していれば仲間になります'
            );
        });

        test('仲間化成功・失敗の通知', () => {
            const target = characterManager.getUnitById('recruitable-enemy');

            // 成功ケース
            recruitmentSystem.convertToNPC(target);
            recruitmentSystem.completeRecruitment();

            let announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化に成功しました'
            );
            expect(announcements).toContain(
                '[polite] Recruitable Knight が仲間に加わりました'
            );

            accessibilityAPI.clearAnnouncements();

            // 失敗ケース（NPCが撃破された場合）
            target.currentHP = 0;
            recruitmentSystem.completeRecruitment();

            announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化に失敗しました'
            );
            expect(announcements).toContain(
                '[polite] 理由: NPCが撃破されました'
            );
        });

        test('操作ヘルプの読み上げ', () => {
            inputHandler.handleKeyDown({ key: 'F1', preventDefault: jest.fn() } as any);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化システムの操作方法を説明します'
            );
            expect(announcements).toContain(
                '[polite] Tabキー: 仲間化対象の選択'
            );
            expect(announcements).toContain(
                '[polite] Enterキー: 仲間化条件の詳細表示'
            );
            expect(announcements).toContain(
                '[polite] スペースキー: 現在の進捗状況を読み上げ'
            );
            expect(announcements).toContain(
                '[polite] Escapeキー: 仲間化UI を閉じる'
            );
            expect(announcements).toContain(
                '[polite] 数字キー1-9: 仲間化対象の直接選択'
            );
        });
    });

    describe('認知的アクセシビリティ', () => {
        test('複雑な条件の簡潔な説明', () => {
            const complexTarget = {
                id: 'complex-enemy',
                name: 'Complex Enemy',
                position: { x: 5, y: 5 },
                stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
                currentHP: 100,
                currentMP: 50,
                faction: 'enemy' as const,
                hasActed: false,
                hasMoved: false,
                isRecruitable: true,
                recruitmentConditions: [
                    {
                        id: 'complex1',
                        type: 'specific_attacker',
                        description: '主人公で攻撃して撃破する',
                        parameters: { attackerId: 'player-hero' }
                    },
                    {
                        id: 'complex2',
                        type: 'hp_threshold',
                        description: 'HPが25%以下の状態で撃破する',
                        parameters: { threshold: 0.25 }
                    },
                    {
                        id: 'complex3',
                        type: 'turn_limit',
                        description: '10ターン以内に撃破する',
                        parameters: { maxTurn: 10 }
                    }
                ]
            };

            characterManager.addUnit(complexTarget);

            // 簡潔モードで説明
            recruitmentUI.setExplanationMode('simple');
            recruitmentUI.announceRecruitmentConditions(complexTarget);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[polite] 仲間化するには3つの条件を満たす必要があります'
            );
            expect(announcements).toContain(
                '[polite] 1. 主人公で攻撃する'
            );
            expect(announcements).toContain(
                '[polite] 2. HPを少なくする（25%以下）'
            );
            expect(announcements).toContain(
                '[polite] 3. 早めに倒す（10ターン以内）'
            );
        });

        test('進捗状況の分かりやすい表現', () => {
            const target = characterManager.getUnitById('recruitable-enemy');

            // 段階的な進捗を表現
            const progressStages = [
                { conditionsMet: [false, false], description: '準備段階' },
                { conditionsMet: [false, true], description: '半分完了' },
                { conditionsMet: [true, true], description: '完了' }
            ];

            progressStages.forEach((stage, index) => {
                accessibilityAPI.clearAnnouncements();

                const progress = {
                    conditionsMet: stage.conditionsMet,
                    allConditionsMet: stage.conditionsMet.every(met => met),
                    completionPercentage: (stage.conditionsMet.filter(met => met).length / stage.conditionsMet.length) * 100
                };

                recruitmentUI.announceProgressUpdate(target, progress);

                const announcements = accessibilityAPI.getAnnouncements();
                expect(announcements).toContain(
                    `[polite] 仲間化の進捗: ${stage.description}`
                );
            });
        });

        test('エラー状況の明確な説明', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            const wrongAttacker = {
                id: 'wrong-attacker',
                name: 'Wrong Attacker',
                position: { x: 1, y: 1 },
                stats: { maxHP: 90, maxMP: 40, attack: 18, defense: 12, speed: 9, movement: 3 },
                currentHP: 90,
                currentMP: 40,
                faction: 'player' as const,
                hasActed: false,
                hasMoved: false
            };

            characterManager.addUnit(wrongAttacker);

            // 間違った攻撃者で仲間化を試行
            const result = recruitmentSystem.processRecruitmentAttempt(wrongAttacker, target, target.currentHP);

            expect(result).toBe(false);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[assertive] 仲間化に失敗しました'
            );
            expect(announcements).toContain(
                '[polite] 理由: 攻撃者が条件を満たしていません'
            );
            expect(announcements).toContain(
                '[polite] 必要な攻撃者: Hero'
            );
            expect(announcements).toContain(
                '[polite] 実際の攻撃者: Wrong Attacker'
            );
        });

        test('次のアクションの提案', () => {
            const target = characterManager.getUnitById('recruitable-enemy');
            const attacker = characterManager.getUnitById('player-hero');

            // 一部の条件のみ満たした状態
            target.currentHP = target.stats.maxHP * 0.2; // HP条件は満たす

            recruitmentSystem.checkRecruitmentEligibility(attacker, target);
            recruitmentUI.suggestNextAction(target);

            const announcements = accessibilityAPI.getAnnouncements();
            expect(announcements).toContain(
                '[polite] 次のアクション提案'
            );
            expect(announcements).toContain(
                '[polite] Hero で攻撃して撃破してください'
            );
            expect(announcements).toContain(
                '[polite] HP条件は既に満たしています'
            );
        });
    });

    describe('カスタマイズ可能なアクセシビリティ設定', () => {
        test('読み上げ速度の調整', () => {
            recruitmentUI.setAccessibilitySettings({
                speechRate: 'slow'
            });

            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentUI.announceRecruitmentConditions(target);

            // 読み上げ設定が適用されることを確認
            const speechSettings = recruitmentUI.getSpeechSettings();
            expect(speechSettings.rate).toBe(0.7); // 遅い速度
            expect(speechSettings.pauseBetweenSentences).toBe(1000); // 長い間隔
        });

        test('詳細レベルの調整', () => {
            recruitmentUI.setAccessibilitySettings({
                detailLevel: 'minimal'
            });

            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentSystem.selectRecruitmentTarget(target);

            const announcements = accessibilityAPI.getAnnouncements();

            // 最小限の情報のみ読み上げ
            expect(announcements).toContain(
                '[polite] Recruitable Knight 選択'
            );
            expect(announcements).not.toContain('位置:');
            expect(announcements).not.toContain('HP:');
        });

        test('音声フィードバックの有効/無効', () => {
            recruitmentUI.setAccessibilitySettings({
                audioFeedback: false
            });

            const target = characterManager.getUnitById('recruitable-enemy');
            recruitmentSystem.selectRecruitmentTarget(target);

            // 音声フィードバックが無効化されることを確認
            const audioElements = recruitmentUI.getAudioElements();
            expect(audioElements.selectionSound.enabled).toBe(false);
            expect(audioElements.successSound.enabled).toBe(false);
            expect(audioElements.errorSound.enabled).toBe(false);
        });

        test('触覚フィードバックの設定', () => {
            recruitmentUI.setAccessibilitySettings({
                hapticFeedback: true
            });

            const target = characterManager.getUnitById('recruitable-enemy');

            // 仲間化成功時の触覚フィードバック
            recruitmentSystem.convertToNPC(target);
            recruitmentSystem.completeRecruitment();

            const hapticEvents = recruitmentUI.getHapticEvents();
            expect(hapticEvents).toContain({
                type: 'success',
                pattern: 'double-tap',
                intensity: 'medium'
            });
        });
    });
});