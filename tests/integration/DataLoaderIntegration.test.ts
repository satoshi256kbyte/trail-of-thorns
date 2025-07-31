/**
 * Integration tests for DataLoader with actual JSON files
 */

import { DataLoader } from '../../game/src/utils/DataLoader';

// Mock fetch to simulate loading from actual files
const mockFetch = (url: string) => {
    const fs = require('fs');
    const path = require('path');

    let filePath: string;
    if (url.includes('stages.json')) {
        filePath = path.join(process.cwd(), 'data', 'stages.json');
    } else if (url.includes('config.json')) {
        filePath = path.join(process.cwd(), 'data', 'config.json');
    } else {
        return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return Promise.resolve({
            ok: true,
            json: async () => JSON.parse(data)
        });
    } catch (error) {
        return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });
    }
};

// Replace global fetch with our mock
global.fetch = jest.fn().mockImplementation(mockFetch);

describe('DataLoader Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Real JSON File Loading', () => {
        it('should successfully load and validate actual stages.json', async () => {
            const stages = await DataLoader.loadStageData();

            expect(Array.isArray(stages)).toBe(true);
            expect(stages.length).toBeGreaterThan(0);

            // Validate first stage structure
            const firstStage = stages[0];
            expect(firstStage).toHaveProperty('id');
            expect(firstStage).toHaveProperty('name');
            expect(firstStage).toHaveProperty('description');
            expect(firstStage).toHaveProperty('isUnlocked');
            expect(firstStage).toHaveProperty('difficulty');
            expect(firstStage).toHaveProperty('order');

            // Validate data types
            expect(typeof firstStage.id).toBe('string');
            expect(typeof firstStage.name).toBe('string');
            expect(typeof firstStage.description).toBe('string');
            expect(typeof firstStage.isUnlocked).toBe('boolean');
            expect(typeof firstStage.difficulty).toBe('number');
            expect(typeof firstStage.order).toBe('number');

            // Validate ranges
            expect(firstStage.difficulty).toBeGreaterThanOrEqual(1);
            expect(firstStage.difficulty).toBeLessThanOrEqual(10);
            expect(firstStage.order).toBeGreaterThan(0);
        });

        it('should successfully load and validate actual config.json', async () => {
            const config = await DataLoader.loadConfigData();

            expect(config).toHaveProperty('defaultConfig');
            expect(config.defaultConfig).toHaveProperty('audio');
            expect(config.defaultConfig).toHaveProperty('graphics');
            expect(config.defaultConfig).toHaveProperty('controls');
            expect(config.defaultConfig).toHaveProperty('gameplay');

            // Validate audio settings
            const audio = config.defaultConfig.audio;
            expect(audio.masterVolume).toBeGreaterThanOrEqual(0);
            expect(audio.masterVolume).toBeLessThanOrEqual(1);
            expect(audio.sfxVolume).toBeGreaterThanOrEqual(0);
            expect(audio.sfxVolume).toBeLessThanOrEqual(1);
            expect(audio.musicVolume).toBeGreaterThanOrEqual(0);
            expect(audio.musicVolume).toBeLessThanOrEqual(1);

            // Validate graphics settings
            const graphics = config.defaultConfig.graphics;
            expect(typeof graphics.fullscreen).toBe('boolean');
            expect(typeof graphics.resolution).toBe('string');
            expect(['low', 'medium', 'high', 'ultra']).toContain(graphics.quality);

            // Validate controls
            const controls = config.defaultConfig.controls;
            expect(controls.keyBindings).toHaveProperty('up');
            expect(controls.keyBindings).toHaveProperty('down');
            expect(controls.keyBindings).toHaveProperty('left');
            expect(controls.keyBindings).toHaveProperty('right');
            expect(controls.keyBindings).toHaveProperty('action');
            expect(controls.keyBindings).toHaveProperty('menu');

            // Validate gameplay settings
            const gameplay = config.defaultConfig.gameplay;
            expect(['easy', 'normal', 'hard', 'expert']).toContain(gameplay.difficulty);
            expect(typeof gameplay.autoSave).toBe('boolean');
            expect(typeof gameplay.showTutorials).toBe('boolean');
        });

        it('should validate stage data integrity', async () => {
            const stages = await DataLoader.loadStageData();

            // Check for unique IDs
            const ids = stages.map(stage => stage.id);
            const uniqueIds = [...new Set(ids)];
            expect(uniqueIds.length).toBe(ids.length);

            // Check for unique orders
            const orders = stages.map(stage => stage.order);
            const uniqueOrders = [...new Set(orders)];
            expect(uniqueOrders.length).toBe(orders.length);

            // Check that stages are properly ordered
            const sortedStages = [...stages].sort((a, b) => a.order - b.order);
            expect(sortedStages).toEqual(stages);

            // Check that at least one stage is unlocked (for game start)
            const unlockedStages = stages.filter(stage => stage.isUnlocked);
            expect(unlockedStages.length).toBeGreaterThan(0);
        });

        it('should handle missing files gracefully', async () => {
            // Mock fetch to return 404
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(DataLoader.loadStageData()).rejects.toThrow('Failed to load stages.json: 404 Not Found');
        });
    });

    describe('Default Data Fallbacks', () => {
        it('should provide valid default stage data', () => {
            const defaultStages = DataLoader.getDefaultStageData();

            expect(Array.isArray(defaultStages)).toBe(true);
            expect(defaultStages.length).toBeGreaterThan(0);

            const firstStage = defaultStages[0];
            expect(firstStage.isUnlocked).toBe(true); // Default should have at least one unlocked stage
        });

        it('should provide valid default config data', () => {
            const defaultConfig = DataLoader.getDefaultConfigData();

            expect(defaultConfig.defaultConfig.audio.masterVolume).toBeGreaterThanOrEqual(0);
            expect(defaultConfig.defaultConfig.audio.masterVolume).toBeLessThanOrEqual(1);
            expect(['low', 'medium', 'high', 'ultra']).toContain(defaultConfig.defaultConfig.graphics.quality);
            expect(['easy', 'normal', 'hard', 'expert']).toContain(defaultConfig.defaultConfig.gameplay.difficulty);
        });
    });
});