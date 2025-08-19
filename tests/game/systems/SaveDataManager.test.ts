/**
 * SaveDataManager テストスイート
 * 
 * データ永続化とセーブ・ロード連携機能のテスト
 * 要件: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { SaveDataManager } from '../../../game/src/systems/SaveDataManager';
import {
    GameSaveData,
    SaveDataError,
    NewCharacterInitialSettings,
    SaveDataRecoveryOptions
} from '../../../game/src/types/saveData';
import { ExperienceInfo } from '../../../game/src/types/experience';

// EventEmitterのモック
class MockEventEmitter {
    private listeners: Map<string, Function[]> = new Map();

    on(event: string, listener: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(listener);
    }

    off(event: string, listener: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(listener);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    emit(event: string, ...args: any[]) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(listener => listener(...args));
        }
    }

    removeAllListeners() {
        this.listeners.clear();
    }
}

// Phaserのモック
(global as any).Phaser = {
    Events: {
        EventEmitter: MockEventEmitter
    }
};

// LocalStorageのモック
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn((index: number) => Object.keys(store)[index] || null)
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

describe('SaveDataManager', () => {
    let saveDataManager: SaveDataManager;

    beforeEach(() => {
        mockLocalStorage.clear();
        jest.clearAllMocks();
        saveDataManager = new SaveDataManager();
    });

    afterEach(() => {
        if (saveDataManager) {
            saveDataManager.destroy();
        }
    });

    describe('初期化', () => {
        test('システムが正常に初期化される', async () => {
            const result = await saveDataManager.initialize();

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
            expect(result.message).toContain('initialized successfully');
        });

        test('ストレージが利用できない場合はエラーを返す', async () => {
            // localStorageを無効化
            Object.defineProperty(window, 'localStorage', {
                value: undefined
            });

            const testManager = new SaveDataManager();
            const result = await testManager.initialize();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SaveDataError.PERMISSION_DENIED);

            testManager.destroy();
        });
    });

    describe('キャラクター経験値データの保存', () => {
        test('経験値データが正常に保存される', async () => {
            await saveDataManager.initialize();

            // 新しいゲームを作成
            const newGameResult = saveDataManager.createNewGame('TestPlayer');
            expect(newGameResult.success).toBe(true);

            // テスト用経験値データを作成
            const experienceMap = new Map<string, ExperienceInfo>();
            experienceMap.set('char1', {
                characterId: 'char1',
                currentLevel: 5,
                currentExperience: 150,
                totalExperience: 150,
                experienceToNextLevel: 50,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            });

            const result = saveDataManager.saveCharacterExperienceData(experienceMap);

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
            expect(result.message).toContain('saved successfully');
        });

        test('システムが初期化されていない場合はエラーを返す', () => {
            const uninitializedManager = new SaveDataManager();
            const experienceMap = new Map<string, ExperienceInfo>();
            const result = uninitializedManager.saveCharacterExperienceData(experienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(SaveDataError.SAVE_FAILED);
            expect(result.message).toContain('not initialized');

            uninitializedManager.destroy();
        });

        test('アクティブなセーブデータがない場合はエラーを返す', async () => {
            await saveDataManager.initialize();

            const experienceMap = new Map<string, ExperienceInfo>();
            const result = saveDataManager.saveCharacterExperienceData(experienceMap);

            expect(result.success).toBe(false);
            expect(result.error).toBe(SaveDataError.SAVE_FAILED);
            expect(result.message).toContain('No active save data');
        });
    });

    describe('新しいゲームの作成', () => {
        test('新しいゲームが正常に作成される', async () => {
            await saveDataManager.initialize();

            const result = saveDataManager.createNewGame('TestPlayer');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.playerName).toBe('TestPlayer');
            expect(result.data!.currentChapter).toBe('chapter_1');
            expect(result.data!.currentStage).toBe(1);
        });
    });

    describe('セーブスロット管理', () => {
        test('利用可能なセーブスロット情報が取得される', async () => {
            await saveDataManager.initialize();

            // スロット0にデータを保存
            const newGameResult = saveDataManager.createNewGame('Player1');
            expect(newGameResult.success).toBe(true);
            const saveResult = saveDataManager.saveToSlot(0);
            expect(saveResult.success).toBe(true);

            const slots = saveDataManager.getAvailableSaveSlots();

            expect(slots).toHaveLength(10); // デフォルトの最大スロット数
            expect(slots[0].isEmpty).toBe(false);
            expect(slots[0].previewData).toBeDefined();
            expect(slots[0].previewData!.playerName).toBe('Player1');

            for (let i = 1; i < 10; i++) {
                expect(slots[i].isEmpty).toBe(true);
            }
        });

        test('無効なスロットIDでエラーが返される', async () => {
            await saveDataManager.initialize();

            const saveResult = saveDataManager.saveToSlot(-1);
            expect(saveResult.success).toBe(false);
            expect(saveResult.error).toBe(SaveDataError.SAVE_FAILED);
            expect(saveResult.message).toContain('Invalid slot ID');

            const loadResult = saveDataManager.loadFromSlot(100);
            expect(loadResult.success).toBe(false);
            expect(loadResult.error).toBe(SaveDataError.LOAD_FAILED);
            expect(loadResult.message).toContain('Invalid slot ID');
        });
    });
});