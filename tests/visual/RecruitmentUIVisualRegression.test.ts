/**
 * 仲間化システム UI ビジュアル回帰テスト
 * 
 * 仲間化システムのUI表示と状態同期の視覚的な正確性をテストします。
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { RecruitmentUI } from '../../game/src/systems/recruitment/RecruitmentUI';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { UIManager } from '../../game/src/ui/UIManager';
import { Unit, RecruitmentCondition, RecruitmentProgress } from '../../game/src/types';

// ビジュアルテスト用のモックとヘルパー
class MockPhaserScene {
    add = {
        container: jest.fn(() => ({
            setPosition: jest.fn(),
            setVisible: jest.fn(),
            add: jest.fn(),
            destroy: jest.fn()
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn(),
            setStyle: jest.fn(),
            setText: jest.fn(),
            setTint: jest.fn()
        })),
        rectangle: jest.fn(() => ({
            setOrigin: jest.fn(),
            setFillStyle: jest.fn(),
            setStrokeStyle: jest.fn()
        })),
        sprite: jest.fn(() => ({
            setOrigin: jest.fn(),
            setTint: jest.fn(),
            setAlpha: jest.fn(),
            play: jest.fn()
        }))
    };

    tweens = {
        add: jest.fn(() => ({
            play: jest.fn()
        }))
    };
}

const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    isRecruitable: true,
    ...overrides
});

describe('RecruitmentUI ビジュアル回帰テスト', () => {
    let mockScene: MockPhaserScene;
    let recruitmentUI: RecruitmentUI;
    let recruitmentSystem: RecruitmentSystem;
    let characterManager: CharacterManager;
    let uiManager: UIManager;

    beforeEach(() => {
        mockScene = new MockPhaserScene();
        recruitmentUI = new RecruitmentUI(mockScene as any);
        characterManager = new CharacterManager();
        uiManager = new UIManager();
        recruitmentSystem = new RecruitmentSystem(null as any, characterManager, null as any);
    });

    describe('仲間化条件表示のビジュアルテスト', () => {
        test('単一条件の表示レイアウト', () => {
            const unit = createMockUnit({
                recruitmentConditions: [{
                    id: 'specific_attacker',
                    type: 'specific_attacker',
                    description: '主人公で攻撃して撃破する',
                    parameters: { attackerId: 'protagonist' }
                }]
            });

            const conditions = unit.recruitmentConditions!;
            recruitmentUI.showRecruitmentConditions(unit, conditions);

            // コンテナが作成されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();

            // テキスト要素が適切に作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('仲間化条件'),
                expect.any(Object)
            );

            // 条件テキストが表示されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '主人公で攻撃して撃破する',
                expect.any(Object)
            );
        });

        test('複数条件の表示レイアウト', () => {
            const unit = createMockUnit({
                recruitmentConditions: [
                    {
                        id: 'specific_attacker',
                        type: 'specific_attacker',
                        description: '主人公で攻撃して撃破する',
                        parameters: { attackerId: 'protagonist' }
                    },
                    {
                        id: 'hp_threshold',
                        type: 'hp_threshold',
                        description: 'HPが30%以下の状態で撃破する',
                        parameters: { threshold: 0.3 }
                    },
                    {
                        id: 'turn_limit',
                        type: 'turn_limit',
                        description: '10ターン以内に撃破する',
                        parameters: { maxTurn: 10 }
                    }
                ]
            });

            const conditions = unit.recruitmentConditions!;
            recruitmentUI.showRecruitmentConditions(unit, conditions);

            // 複数の条件テキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(4); // タイトル + 3つの条件

            // 各条件が適切な位置に配置されることを確認
            const textCalls = (mockScene.add.text as jest.Mock).mock.calls;

            // Y座標が段階的に増加していることを確認（縦に並んでいる）
            const yPositions = textCalls.slice(1).map(call => call[1]); // タイトルを除く
            for (let i = 1; i < yPositions.length; i++) {
                expect(yPositions[i]).toBeGreaterThan(yPositions[i - 1]);
            }
        });

        test('条件達成状況の色分け表示', () => {
            const unit = createMockUnit({
                recruitmentConditions: [
                    {
                        id: 'condition1',
                        type: 'specific_attacker',
                        description: '達成済み条件',
                        parameters: { attackerId: 'protagonist' }
                    },
                    {
                        id: 'condition2',
                        type: 'hp_threshold',
                        description: '未達成条件',
                        parameters: { threshold: 0.3 }
                    }
                ]
            });

            const progress: RecruitmentProgress = {
                conditionsMet: [true, false],
                allConditionsMet: false,
                completionPercentage: 50
            };

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // テキスト要素の色が適切に設定されることを確認
            const textElements = (mockScene.add.text as jest.Mock).mock.results;

            // 達成済み条件は緑色
            expect(textElements[1].value.setTint).toHaveBeenCalledWith(0x00ff00);

            // 未達成条件は赤色
            expect(textElements[2].value.setTint).toHaveBeenCalledWith(0xff0000);
        });

        test('条件パネルの位置とサイズ', () => {
            const unit = createMockUnit({
                position: { x: 8, y: 6 },
                recruitmentConditions: [{
                    id: 'test_condition',
                    type: 'specific_attacker',
                    description: 'テスト条件',
                    parameters: {}
                }]
            });

            recruitmentUI.showRecruitmentConditions(unit, unit.recruitmentConditions!);

            // コンテナが適切な位置に配置されることを確認
            const container = (mockScene.add.container as jest.Mock).mock.results[0].value;
            expect(container.setPosition).toHaveBeenCalledWith(
                expect.any(Number), // ユニット位置に基づく計算値
                expect.any(Number)
            );

            // 背景矩形が適切なサイズで作成されることを確認
            expect(mockScene.add.rectangle).toHaveBeenCalledWith(
                0, 0,
                expect.any(Number), // 幅
                expect.any(Number), // 高さ
                expect.any(Number)  // 色
            );
        });
    });

    describe('NPC状態インジケーターのビジュアルテスト', () => {
        test('NPC状態インジケーターの表示', () => {
            const unit = createMockUnit({ faction: 'npc' });

            recruitmentUI.showNPCIndicator(unit);

            // NPCインジケータースプライトが作成されることを確認
            expect(mockScene.add.sprite).toHaveBeenCalledWith(
                expect.any(Number), // X座標
                expect.any(Number), // Y座標
                'npc-indicator'     // テクスチャキー
            );

            // インジケーターが適切に設定されることを確認
            const indicator = (mockScene.add.sprite as jest.Mock).mock.results[0].value;
            expect(indicator.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
            expect(indicator.play).toHaveBeenCalledWith('npc-indicator-pulse');
        });

        test('NPC状態インジケーターの位置計算', () => {
            const unit = createMockUnit({
                position: { x: 10, y: 8 },
                faction: 'npc'
            });

            recruitmentUI.showNPCIndicator(unit);

            // インジケーターがユニットの上部に配置されることを確認
            const spriteCall = (mockScene.add.sprite as jest.Mock).mock.calls[0];
            const expectedX = unit.position.x * 32 + 16; // タイルサイズ32px、中央配置
            const expectedY = unit.position.y * 32 - 16; // ユニットの上部

            expect(spriteCall[0]).toBe(expectedX);
            expect(spriteCall[1]).toBe(expectedY);
        });

        test('NPC状態インジケーターの非表示', () => {
            const unit = createMockUnit({ faction: 'npc' });

            recruitmentUI.showNPCIndicator(unit);
            const indicator = (mockScene.add.sprite as jest.Mock).mock.results[0].value;

            recruitmentUI.hideNPCIndicator(unit);

            expect(indicator.destroy).toHaveBeenCalled();
        });

        test('複数NPCのインジケーター管理', () => {
            const npc1 = createMockUnit({ id: 'npc1', position: { x: 5, y: 5 }, faction: 'npc' });
            const npc2 = createMockUnit({ id: 'npc2', position: { x: 8, y: 3 }, faction: 'npc' });

            recruitmentUI.showNPCIndicator(npc1);
            recruitmentUI.showNPCIndicator(npc2);

            // 2つのインジケーターが作成されることを確認
            expect(mockScene.add.sprite).toHaveBeenCalledTimes(2);

            // 各インジケーターが適切な位置に配置されることを確認
            const spriteCalls = (mockScene.add.sprite as jest.Mock).mock.calls;

            expect(spriteCalls[0][0]).toBe(5 * 32 + 16); // npc1のX座標
            expect(spriteCalls[0][1]).toBe(5 * 32 - 16); // npc1のY座標

            expect(spriteCalls[1][0]).toBe(8 * 32 + 16); // npc2のX座標
            expect(spriteCalls[1][1]).toBe(3 * 32 - 16); // npc2のY座標
        });
    });

    describe('仲間化成功演出のビジュアルテスト', () => {
        test('仲間化成功演出の表示要素', () => {
            const unit = createMockUnit();

            recruitmentUI.showRecruitmentSuccess(unit);

            // 成功メッセージテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('仲間化成功'),
                expect.objectContaining({
                    fontSize: expect.any(String),
                    fill: expect.any(String)
                })
            );

            // 成功エフェクトスプライトが作成されることを確認
            expect(mockScene.add.sprite).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'recruitment-success-effect'
            );
        });

        test('仲間化成功演出のアニメーション', () => {
            const unit = createMockUnit();

            recruitmentUI.showRecruitmentSuccess(unit);

            // Tweenアニメーションが作成されることを確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    duration: expect.any(Number),
                    ease: expect.any(String)
                })
            );

            // エフェクトアニメーションが再生されることを確認
            const effect = (mockScene.add.sprite as jest.Mock).mock.results[0].value;
            expect(effect.play).toHaveBeenCalledWith('recruitment-success-animation');
        });

        test('仲間化成功演出の表示時間', async () => {
            const unit = createMockUnit();

            const startTime = Date.now();
            await recruitmentUI.showRecruitmentSuccess(unit);
            const endTime = Date.now();

            // 演出が適切な時間で完了することを確認（2-3秒程度）
            const duration = endTime - startTime;
            expect(duration).toBeGreaterThan(2000);
            expect(duration).toBeLessThan(4000);
        });
    });

    describe('仲間化失敗演出のビジュアルテスト', () => {
        test('仲間化失敗演出の表示要素', () => {
            const unit = createMockUnit();
            const reason = 'NPCが撃破されました';

            recruitmentUI.showRecruitmentFailure(unit, reason);

            // 失敗メッセージテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('仲間化失敗'),
                expect.objectContaining({
                    fontSize: expect.any(String),
                    fill: '#ff0000' // 赤色
                })
            );

            // 失敗理由テキストが表示されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                reason,
                expect.any(Object)
            );
        });

        test('失敗理由別の表示内容', () => {
            const unit = createMockUnit();
            const reasons = [
                'NPCが撃破されました',
                '仲間化条件を満たしていません',
                'システムエラーが発生しました'
            ];

            reasons.forEach(reason => {
                jest.clearAllMocks();
                recruitmentUI.showRecruitmentFailure(unit, reason);

                // 各理由に応じたメッセージが表示されることを確認
                expect(mockScene.add.text).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Number),
                    reason,
                    expect.any(Object)
                );
            });
        });
    });

    describe('進捗表示のビジュアルテスト', () => {
        test('進捗バーの表示', () => {
            const unit = createMockUnit({
                recruitmentConditions: [
                    { id: '1', type: 'specific_attacker', description: '条件1', parameters: {} },
                    { id: '2', type: 'hp_threshold', description: '条件2', parameters: {} }
                ]
            });

            const progress: RecruitmentProgress = {
                conditionsMet: [true, false],
                allConditionsMet: false,
                completionPercentage: 50
            };

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // 進捗バーの背景が作成されることを確認
            expect(mockScene.add.rectangle).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                100, // 進捗バーの幅
                10,  // 進捗バーの高さ
                0x333333 // 背景色
            );

            // 進捗バーの前景が作成されることを確認
            expect(mockScene.add.rectangle).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                50, // 50%の進捗
                10,
                0x00ff00 // 進捗色
            );
        });

        test('進捗パーセンテージの表示', () => {
            const unit = createMockUnit();
            const progress: RecruitmentProgress = {
                conditionsMet: [true, false, true],
                allConditionsMet: false,
                completionPercentage: 67
            };

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // パーセンテージテキストが表示されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '67%',
                expect.any(Object)
            );
        });

        test('リアルタイム進捗更新', () => {
            const unit = createMockUnit();

            // 初期状態（0%）
            let progress: RecruitmentProgress = {
                conditionsMet: [false, false],
                allConditionsMet: false,
                completionPercentage: 0
            };

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // 50%に更新
            progress = {
                conditionsMet: [true, false],
                allConditionsMet: false,
                completionPercentage: 50
            };

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // 100%に更新
            progress = {
                conditionsMet: [true, true],
                allConditionsMet: true,
                completionPercentage: 100
            };

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // 各段階で適切な更新が行われることを確認
            const rectangleCalls = (mockScene.add.rectangle as jest.Mock).mock.calls;

            // 進捗バーの幅が段階的に変化していることを確認
            expect(rectangleCalls.some(call => call[2] === 0)).toBe(true);   // 0%
            expect(rectangleCalls.some(call => call[2] === 50)).toBe(true);  // 50%
            expect(rectangleCalls.some(call => call[2] === 100)).toBe(true); // 100%
        });
    });

    describe('レスポンシブデザインのテスト', () => {
        test('画面サイズに応じたUI要素のスケーリング', () => {
            const unit = createMockUnit();

            // 小さい画面サイズをシミュレート
            const smallScreenConfig = { width: 800, height: 600 };
            recruitmentUI.setScreenConfig(smallScreenConfig);

            recruitmentUI.showRecruitmentConditions(unit, unit.recruitmentConditions!);

            // UI要素が小さい画面に適応することを確認
            const textCalls = (mockScene.add.text as jest.Mock).mock.calls;
            const fontSize = textCalls[0][3].fontSize;
            expect(parseInt(fontSize)).toBeLessThan(20); // 小さいフォントサイズ

            // 大きい画面サイズをシミュレート
            jest.clearAllMocks();
            const largeScreenConfig = { width: 1920, height: 1080 };
            recruitmentUI.setScreenConfig(largeScreenConfig);

            recruitmentUI.showRecruitmentConditions(unit, unit.recruitmentConditions!);

            // UI要素が大きい画面に適応することを確認
            const largeTextCalls = (mockScene.add.text as jest.Mock).mock.calls;
            const largeFontSize = largeTextCalls[0][3].fontSize;
            expect(parseInt(largeFontSize)).toBeGreaterThan(16); // 大きいフォントサイズ
        });

        test('モバイルデバイス向けのタッチ対応UI', () => {
            const unit = createMockUnit();

            // モバイル設定を有効化
            recruitmentUI.setMobileMode(true);

            recruitmentUI.showRecruitmentConditions(unit, unit.recruitmentConditions!);

            // タッチ操作に適したサイズのUI要素が作成されることを確認
            const rectangleCalls = (mockScene.add.rectangle as jest.Mock).mock.calls;
            const buttonHeight = rectangleCalls[0][3]; // ボタンの高さ
            expect(buttonHeight).toBeGreaterThanOrEqual(44); // タッチ操作に適した最小サイズ
        });
    });

    describe('アクセシビリティのビジュアルテスト', () => {
        test('色覚異常対応の色使い', () => {
            const unit = createMockUnit();
            const progress: RecruitmentProgress = {
                conditionsMet: [true, false],
                allConditionsMet: false,
                completionPercentage: 50
            };

            // 色覚異常対応モードを有効化
            recruitmentUI.setAccessibilityMode('colorblind');

            recruitmentUI.updateRecruitmentProgress(unit, progress);

            // 色だけでなく形状やパターンでも区別できることを確認
            const textElements = (mockScene.add.text as jest.Mock).mock.results;

            // 達成済み条件にはチェックマークが追加される
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('✓'), // チェックマーク
                expect.any(Object)
            );

            // 未達成条件には×マークが追加される
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('×'), // ×マーク
                expect.any(Object)
            );
        });

        test('高コントラストモードの対応', () => {
            const unit = createMockUnit();

            // 高コントラストモードを有効化
            recruitmentUI.setAccessibilityMode('high-contrast');

            recruitmentUI.showRecruitmentConditions(unit, unit.recruitmentConditions!);

            // 高コントラストの色が使用されることを確認
            expect(mockScene.add.rectangle).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(Number),
                expect.any(Number),
                0x000000 // 黒背景
            );

            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(String),
                expect.objectContaining({
                    fill: '#ffffff' // 白文字
                })
            );
        });

        test('フォントサイズ拡大対応', () => {
            const unit = createMockUnit();

            // 大きいフォントサイズを設定
            recruitmentUI.setFontScale(1.5);

            recruitmentUI.showRecruitmentConditions(unit, unit.recruitmentConditions!);

            // フォントサイズが拡大されることを確認
            const textCalls = (mockScene.add.text as jest.Mock).mock.calls;
            const fontSize = parseInt(textCalls[0][3].fontSize);
            expect(fontSize).toBeGreaterThanOrEqual(24); // 拡大されたフォントサイズ
        });
    });
});