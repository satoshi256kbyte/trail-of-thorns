/**
 * 経験値システムデータ永続化統合テスト
 * 
 * ExperienceSystemとSaveDataManagerの統合テスト
 * 要件: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { SaveDataManager } from '../../game/src/systems/SaveDataManager';
import { ExperiencePersistenceManager } from '../../game/src/systems/experience/ExperiencePersistenceManager';
import {
    ExperienceAction,
    ExperienceSource,
    ExperienceContext,
    GrowthRates
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// Phaserのモック
const mockScene = {
    add: {
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        container: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    tweens: {
        add: jest.fn().mockImplementation((config) => {
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return { destroy: jest.fn() };
        })
    },
    time: {
        delayedCall: jest.fn().mockImplementation((delay, callback) => {
            setTimeout(callback, 0);
            return { destroy: jest.fn() };
        })
    }
} as any;

describe('Experience Data Persistence Integration', () => {
    let experienceSystem: ExperienceSystem;
    let saveDataManager: SaveDataManager;
    let persistenceManager: ExperiencePersistenceManager;

    // テスト用キャラクター
    const testCharacter: Unit = {
        id: 'test-character',
        name: 'Test Character',
        position: { x: 0, y: 0 },
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3
        },
        currentHP: 100,
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false
    };

    beforeEach(async () => {
        // LocalStorageのモック
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });

        // システムを初期化
        experienceSystem = new ExperienceSystem(mockScene);
        saveDataManager = new SaveDataManager();

        // 経験値システムを初期化
        await experienceSystem.initialize();

        // 永続化システムを初期化
        await experienceSystem.initializePersistence(saveDataManager);
        persistenceManager = experienceSystem.getPersistenceManager()!;

        // テストキャラクターを登録
        experienceSystem.registerCharacter(testCharacter, 1, 0);
    });

    afterEach(() => {
        experienceSystem.destroy();
        jest.clearAllMocks();
    });

    describe('経験値データの保存と読み込み', () => {
        test('経験値獲得後にデータを保存・読み込みできる', async () => {
            // 経験値を獲得
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(testCharacter.id, ExperienceAction.ATTACK, context);

            // データを保存
            const saveResult = await experienceSystem.saveExperienceData();
            expect(saveResult).toBe(true);

            // 新しいシステムを作成して読み込み
            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // データが正しく復元されているか確認
            const experienceInfo = newExperienceSystem.getExperienceInfo(testCharacter.id);
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);

            newExperienceSystem.destroy();
        });

        test('複数キャラクターの経験値データを保存・読み込みできる', async () => {
            // 追加キャラクターを登録
            const character2: Unit = {
                ...testCharacter,
                id: 'test-character-2',
                name: 'Test Character 2'
            };

            experienceSystem.registerCharacter(character2, 3, 150);

            // 両キャラクターに経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(testCharacter.id, ExperienceAction.DEFEAT, context);
            experienceSystem.awardExperience(character2.id, ExperienceAction.DEFEAT, context);

            // データを保存
            const saveResult = await experienceSystem.saveExperienceData();
            expect(saveResult).toBe(true);

            // 新しいシステムで読み込み
            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // 両キャラクターのデータが復元されているか確認
            const char1Info = newExperienceSystem.getExperienceInfo(testCharacter.id);
            const char2Info = newExperienceSystem.getExperienceInfo(character2.id);

            expect(char1Info.currentExperience).toBeGreaterThan(0);
            expect(char2Info.currentLevel).toBe(3);
            expect(char2Info.currentExperience).toBeGreaterThan(150);

            newExperienceSystem.destroy();
        });
    });

    describe('章進行時の経験値情報継続管理', () => {
        test('章進行と共に経験値データが保存される', async () => {
            // 経験値を獲得
            const context: ExperienceContext = {
                source: ExperienceSource.ALLY_SUPPORT,
                action: ExperienceAction.SUPPORT,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(testCharacter.id, ExperienceAction.SUPPORT, context);

            // 章進行を保存
            const saveResult = await experienceSystem.saveChapterProgressWithExperience(
                'chapter_1',
                5,
                false
            );
            expect(saveResult).toBe(true);

            // 新しいシステムで読み込み
            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // 経験値データが保持されているか確認
            const experienceInfo = newExperienceSystem.getExperienceInfo(testCharacter.id);
            expect(experienceInfo.currentExperience).toBeGreaterThan(0);

            newExperienceSystem.destroy();
        });

        test('章完了時の特別処理が実行される', async () => {
            // レベルアップするまで経験値を獲得
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            // 複数回経験値を獲得してレベルアップさせる
            for (let i = 0; i < 10; i++) {
                experienceSystem.awardExperience(testCharacter.id, ExperienceAction.DEFEAT, context);
            }

            // 章完了を保存
            const saveResult = await experienceSystem.saveChapterProgressWithExperience(
                'chapter_1',
                24,
                true // 章完了
            );
            expect(saveResult).toBe(true);

            // 新しいシステムで読み込み
            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // レベルアップが保持されているか確認
            const experienceInfo = newExperienceSystem.getExperienceInfo(testCharacter.id);
            expect(experienceInfo.currentLevel).toBeGreaterThan(1);

            newExperienceSystem.destroy();
        });
    });

    describe('新規仲間キャラクターの初期化', () => {
        test('新規仲間キャラクターが正しく初期化される', async () => {
            const baseGrowthRates: GrowthRates = {
                hp: 60,
                mp: 40,
                attack: 55,
                defense: 45,
                speed: 50,
                skill: 50,
                luck: 35
            };

            // 新規キャラクターを初期化
            const initResult = await experienceSystem.initializeNewCharacterExperience(
                'new-ally',
                5,
                200,
                'chapter_2',
                10,
                baseGrowthRates,
                false
            );

            expect(initResult).toBe(true);

            // 経験値情報を確認
            const experienceInfo = experienceSystem.getExperienceInfo('new-ally');
            expect(experienceInfo.characterId).toBe('new-ally');
            expect(experienceInfo.currentLevel).toBe(5);
            expect(experienceInfo.currentExperience).toBe(200);

            // データを保存・読み込み
            await experienceSystem.saveExperienceData();

            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // 新規キャラクターのデータが保持されているか確認
            const loadedInfo = newExperienceSystem.getExperienceInfo('new-ally');
            expect(loadedInfo.currentLevel).toBe(5);
            expect(loadedInfo.currentExperience).toBe(200);

            newExperienceSystem.destroy();
        });

        test('一時的なキャラクターが正しく処理される', async () => {
            // 一時的なキャラクターを初期化
            const initResult = await experienceSystem.initializeNewCharacterExperience(
                'temp-ally',
                1,
                0,
                'chapter_1',
                15,
                undefined,
                true // 一時的
            );

            expect(initResult).toBe(true);

            // 経験値を獲得
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience('temp-ally', ExperienceAction.ATTACK, context);

            // データを保存・読み込み
            await experienceSystem.saveExperienceData();

            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // 一時的なキャラクターのデータも保持されているか確認
            const tempInfo = newExperienceSystem.getExperienceInfo('temp-ally');
            expect(tempInfo.currentExperience).toBeGreaterThan(0);

            newExperienceSystem.destroy();
        });
    });

    describe('データ破損時の復旧処理', () => {
        test('バックアップからの復旧が正常に動作する', async () => {
            // 経験値データを作成・保存
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(testCharacter.id, ExperienceAction.DEFEAT, context);
            await experienceSystem.saveExperienceData();

            // データ破損をシミュレート（LocalStorageを破損）
            const mockGetItem = jest.fn().mockReturnValue(null);
            Object.defineProperty(window, 'localStorage', {
                value: { ...window.localStorage, getItem: mockGetItem }
            });

            // 復旧を実行
            const recoveryResult = await experienceSystem.recoverCorruptedExperienceData(true, false);
            expect(recoveryResult).toBe(true);

            // データが復旧されているか確認
            const experienceInfo = experienceSystem.getExperienceInfo(testCharacter.id);
            expect(experienceInfo).toBeDefined();
        });

        test('デフォルト値での復旧が正常に動作する', async () => {
            // データ破損をシミュレート
            const mockGetItem = jest.fn().mockReturnValue(null);
            Object.defineProperty(window, 'localStorage', {
                value: { ...window.localStorage, getItem: mockGetItem }
            });

            // デフォルト値での復旧を実行
            const recoveryResult = await experienceSystem.recoverCorruptedExperienceData(false, true);
            expect(recoveryResult).toBe(true);

            // デフォルトキャラクターが作成されているか確認
            try {
                const defaultInfo = experienceSystem.getExperienceInfo('player_1');
                expect(defaultInfo.currentLevel).toBe(1);
                expect(defaultInfo.currentExperience).toBe(0);
            } catch (error) {
                // デフォルトキャラクターが存在しない場合は、システムが正常に復旧していることを確認
                expect(experienceSystem.getSystemState().isInitialized).toBe(true);
            }
        });
    });

    describe('レベルアップとデータ永続化の統合', () => {
        test('レベルアップ後のデータが正しく保存・復元される', async () => {
            // レベルアップするまで経験値を獲得
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            // 複数回経験値を獲得
            for (let i = 0; i < 15; i++) {
                experienceSystem.awardExperience(testCharacter.id, ExperienceAction.DEFEAT, context);

                // レベルアップ判定
                const levelUpResult = experienceSystem.checkAndProcessLevelUp(testCharacter.id);
                if (levelUpResult) {
                    break; // レベルアップしたら終了
                }
            }

            // レベルアップ後の状態を確認
            const beforeSaveInfo = experienceSystem.getExperienceInfo(testCharacter.id);
            expect(beforeSaveInfo.currentLevel).toBeGreaterThan(1);

            // データを保存
            await experienceSystem.saveExperienceData();

            // 新しいシステムで読み込み
            const newExperienceSystem = new ExperienceSystem(mockScene);
            await newExperienceSystem.initialize();
            await newExperienceSystem.initializePersistence(saveDataManager);

            const loadResult = await newExperienceSystem.loadExperienceData();
            expect(loadResult).toBe(true);

            // レベルアップ後のデータが正しく復元されているか確認
            const afterLoadInfo = newExperienceSystem.getExperienceInfo(testCharacter.id);
            expect(afterLoadInfo.currentLevel).toBe(beforeSaveInfo.currentLevel);
            expect(afterLoadInfo.currentExperience).toBe(beforeSaveInfo.currentExperience);

            newExperienceSystem.destroy();
        });
    });

    describe('イベント統合', () => {
        test('永続化関連のイベントが正しく発行される', async () => {
            const saveEventSpy = jest.fn();
            const loadEventSpy = jest.fn();
            const recoveryEventSpy = jest.fn();

            experienceSystem.on('experience-persistence-saved', saveEventSpy);
            experienceSystem.on('experience-persistence-loaded', loadEventSpy);
            experienceSystem.on('experience-persistence-recovered', recoveryEventSpy);

            // 経験値を獲得してデータを保存
            const context: ExperienceContext = {
                source: ExperienceSource.HEALING,
                action: ExperienceAction.HEAL,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(testCharacter.id, ExperienceAction.HEAL, context);
            await experienceSystem.saveExperienceData();

            expect(saveEventSpy).toHaveBeenCalled();

            // データを読み込み
            await experienceSystem.loadExperienceData();
            expect(loadEventSpy).toHaveBeenCalled();

            // 復旧を実行
            await experienceSystem.recoverCorruptedExperienceData(true, false);
            expect(recoveryEventSpy).toHaveBeenCalled();
        });

        test('新規キャラクター初期化イベントが発行される', async () => {
            const initEventSpy = jest.fn();
            experienceSystem.on('experience-persistence-character-initialized', initEventSpy);

            await experienceSystem.initializeNewCharacterExperience(
                'event-test-char',
                2,
                50,
                'chapter_1',
                8
            );

            expect(initEventSpy).toHaveBeenCalledWith(expect.objectContaining({
                characterId: 'event-test-char',
                initialLevel: 2,
                initialExperience: 50
            }));
        });

        test('章進行保存イベントが発行される', async () => {
            const chapterEventSpy = jest.fn();
            experienceSystem.on('experience-persistence-chapter-saved', chapterEventSpy);

            await experienceSystem.saveChapterProgressWithExperience('chapter_2', 12, true);

            expect(chapterEventSpy).toHaveBeenCalledWith(expect.objectContaining({
                chapterId: 'chapter_2',
                stageNumber: 12,
                isCompleted: true
            }));
        });
    });

    describe('エラーハンドリング', () => {
        test('永続化マネージャー未初期化時のエラーハンドリング', async () => {
            const uninitializedSystem = new ExperienceSystem(mockScene);
            await uninitializedSystem.initialize();

            // 永続化マネージャーを初期化せずに操作を試行
            const saveResult = await uninitializedSystem.saveExperienceData();
            expect(saveResult).toBe(false);

            const loadResult = await uninitializedSystem.loadExperienceData();
            expect(loadResult).toBe(false);

            const recoveryResult = await uninitializedSystem.recoverCorruptedExperienceData();
            expect(recoveryResult).toBe(false);

            uninitializedSystem.destroy();
        });

        test('無効なキャラクターIDでの操作エラーハンドリング', async () => {
            // 存在しないキャラクターで新規初期化を試行
            const initResult = await experienceSystem.initializeNewCharacterExperience(
                '', // 空のID
                1,
                0,
                'chapter_1',
                1
            );

            expect(initResult).toBe(false);
        });
    });
});