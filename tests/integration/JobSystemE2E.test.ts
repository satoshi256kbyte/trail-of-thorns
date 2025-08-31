import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { JobData, RoseEssenceData } from '../../game/src/types/jobs';
import { Unit } from '../../game/src/types/gameplay';

// Mock Phaser
jest.mock('phaser', () => ({
    Scene: class MockScene {
        add = { text: jest.fn(), image: jest.fn(), container: jest.fn() };
        load = { json: jest.fn(), image: jest.fn() };
        input = { on: jest.fn() };
        events = { on: jest.fn(), emit: jest.fn() };
    }
}));

/**
 * 職業システム E2E テストシナリオ
 * 
 * このテストスイートは、職業システムの完全なワークフローを
 * エンドツーエンドでテストし、実際のゲームプレイシナリオを検証します。
 */
describe('Job System E2E Test Scenarios', () => {
    let jobSystem: JobSystem;
    let experienceSystem: ExperienceSystem;
    let skillSystem: SkillSystem;
    let battleSystem: BattleSystem;
    let gameplayScene: GameplayScene;

    const mockJobData: JobData = {
        warrior: {
            id: 'warrior',
            name: '戦士',
            description: '近接戦闘の専門家',
            category: 'warrior',
            maxRank: 3,
            statModifiers: {
                1: { hp: 5, mp: 0, attack: 3, defense: 2, speed: -1, skill: 0, luck: 0 },
                2: { hp: 10, mp: 0, attack: 6, defense: 4, speed: -2, skill: 0, luck: 0 },
                3: { hp: 15, mp: 0, attack: 9, defense: 6, speed: -3, skill: 0, luck: 0 }
            },
            availableSkills: {
                1: ['sword_slash', 'guard'],
                2: ['sword_slash', 'guard', 'power_strike'],
                3: ['sword_slash', 'guard', 'power_strike', 'berserker_rage']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] }
            },
            growthRateModifiers: {
                1: { hp: 1.1, mp: 0.8, attack: 1.2, defense: 1.1, speed: 0.9, skill: 1.0, luck: 1.0 },
                2: { hp: 1.2, mp: 0.8, attack: 1.3, defense: 1.2, speed: 0.9, skill: 1.0, luck: 1.0 },
                3: { hp: 1.3, mp: 0.8, attack: 1.4, defense: 1.3, speed: 0.9, skill: 1.0, luck: 1.0 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'warrior_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#ff0000', secondary: '#800000' }
            }
        },
        mage: {
            id: 'mage',
            name: '魔法使い',
            description: '魔法攻撃の専門家',
            category: 'mage',
            maxRank: 3,
            statModifiers: {
                1: { hp: 0, mp: 8, attack: 4, defense: -1, speed: 1, skill: 2, luck: 0 },
                2: { hp: 0, mp: 16, attack: 8, defense: -2, speed: 2, skill: 4, luck: 0 },
                3: { hp: 0, mp: 24, attack: 12, defense: -3, speed: 3, skill: 6, luck: 0 }
            },
            availableSkills: {
                1: ['fire_bolt', 'heal'],
                2: ['fire_bolt', 'heal', 'ice_shard', 'group_heal'],
                3: ['fire_bolt', 'heal', 'ice_shard', 'group_heal', 'meteor', 'resurrection']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 15, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 25, levelRequirement: 10, prerequisiteSkills: ['group_heal'] }
            },
            growthRateModifiers: {
                1: { hp: 0.9, mp: 1.3, attack: 1.2, defense: 0.8, speed: 1.1, skill: 1.3, luck: 1.0 },
                2: { hp: 0.9, mp: 1.4, attack: 1.3, defense: 0.8, speed: 1.2, skill: 1.4, luck: 1.0 },
                3: { hp: 0.9, mp: 1.5, attack: 1.4, defense: 0.8, speed: 1.3, skill: 1.5, luck: 1.0 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'mage_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#0000ff', secondary: '#000080' }
            }
        },
        archer: {
            id: 'archer',
            name: '弓使い',
            description: '遠距離攻撃の専門家',
            category: 'archer',
            maxRank: 3,
            statModifiers: {
                1: { hp: 2, mp: 2, attack: 4, defense: 0, speed: 2, skill: 1, luck: 1 },
                2: { hp: 4, mp: 4, attack: 8, defense: 0, speed: 4, skill: 2, luck: 2 },
                3: { hp: 6, mp: 6, attack: 12, defense: 0, speed: 6, skill: 3, luck: 3 }
            },
            availableSkills: {
                1: ['bow_shot', 'aim'],
                2: ['bow_shot', 'aim', 'double_shot'],
                3: ['bow_shot', 'aim', 'double_shot', 'rain_of_arrows']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 12, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 22, levelRequirement: 10, prerequisiteSkills: ['double_shot'] }
            },
            growthRateModifiers: {
                1: { hp: 1.0, mp: 1.0, attack: 1.3, defense: 0.9, speed: 1.2, skill: 1.1, luck: 1.1 },
                2: { hp: 1.0, mp: 1.0, attack: 1.4, defense: 0.9, speed: 1.3, skill: 1.2, luck: 1.2 },
                3: { hp: 1.0, mp: 1.0, attack: 1.5, defense: 0.9, speed: 1.4, skill: 1.3, luck: 1.3 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'archer_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#00ff00', secondary: '#008000' }
            }
        }
    };

    const mockRoseEssenceData: RoseEssenceData = {
        currentAmount: 100,
        totalEarned: 100,
        totalSpent: 0,
        sources: {
            boss_defeat: { baseAmount: 20, difficultyMultiplier: 1.5, firstTimeBonus: 10 },
            mini_boss_defeat: { baseAmount: 10, difficultyMultiplier: 1.2, firstTimeBonus: 5 }
        },
        costs: {
            rankUp: {
                warrior: { 2: 10, 3: 20 },
                mage: { 2: 15, 3: 25 },
                archer: { 2: 12, 3: 22 }
            },
            jobChange: 5,
            skillUnlock: 3
        }
    };

    const createMockUnit = (id: string, jobId: string = 'warrior', level: number = 1): Unit => ({
        id,
        name: `Character ${id}`,
        position: { x: 0, y: 0 },
        stats: {
            level,
            maxHP: 100,
            maxMP: 50,
            currentHP: 100,
            currentMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            skill: 12,
            luck: 8,
            movement: 3,
            experience: level * 100
        },
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        jobId,
        jobRank: 1,
        skills: []
    });

    beforeEach(() => {
        // Initialize all systems
        jobSystem = new JobSystem();
        experienceSystem = new ExperienceSystem();
        skillSystem = new SkillSystem();
        battleSystem = new BattleSystem();
        gameplayScene = new GameplayScene();

        // Initialize job system
        jobSystem.initialize(mockJobData, mockRoseEssenceData);

        // Set up system integrations
        (experienceSystem as any).jobSystem = jobSystem;
        (skillSystem as any).jobSystem = jobSystem;
        (battleSystem as any).jobSystem = jobSystem;
        (gameplayScene as any).jobSystem = jobSystem;
    });

    describe('Scenario 1: New Character Job Assignment and Basic Progression', () => {
        it('should complete full new character job assignment workflow', async () => {
            // Given: A new character is created
            const character = createMockUnit('player1');

            // When: Character is assigned initial job
            jobSystem.setCharacterJob(character.id, 'warrior');

            // Then: Character should have warrior job with appropriate stats and skills
            const jobData = jobSystem.getCharacterJobData(character.id);
            expect(jobData.currentJobId).toBe('warrior');
            expect(jobData.currentRank).toBe(1);

            const stats = jobSystem.calculateJobStats(character.id);
            expect(stats.hp).toBe(5);
            expect(stats.attack).toBe(3);

            const skills = jobSystem.getJobSkills(character.id);
            expect(skills).toContain('sword_slash');
            expect(skills).toContain('guard');

            // And: Character should have appropriate visual representation
            const visual = jobSystem.getJobVisual(character.id);
            expect(visual.iconPath).toBe('warrior_icon.png');
            expect(visual.colorScheme.primary).toBe('#ff0000');
        });

        it('should handle character progression through experience and level up', async () => {
            // Given: A warrior character at level 1
            const character = createMockUnit('player1', 'warrior', 1);
            jobSystem.setCharacterJob(character.id, 'warrior');

            // When: Character gains experience and levels up
            experienceSystem.awardExperience(character.id, 200, 'battle_victory');
            const levelUpResult = await experienceSystem.processLevelUp(character);

            // Then: Level up should apply job growth rate modifiers
            expect(levelUpResult.characterId).toBe(character.id);
            expect(levelUpResult.newLevel).toBeGreaterThan(character.stats.level);

            // And: Job stats should be recalculated with new level
            const updatedStats = jobSystem.calculateJobStats(character.id);
            expect(updatedStats).toBeDefined();
        });
    });

    describe('Scenario 2: Boss Battle and Rose Essence Acquisition', () => {
        it('should complete full boss battle and rose essence workflow', async () => {
            // Given: A character in battle and initial rose essence amount
            const character = createMockUnit('player1', 'warrior', 5);
            jobSystem.setCharacterJob(character.id, 'warrior');
            const initialEssence = jobSystem.getCurrentRoseEssence();

            // When: Character defeats a boss
            const boss = createMockUnit('boss1', 'warrior', 10);
            boss.faction = 'enemy';

            battleSystem.handleBossDefeat(boss);

            // Then: Rose essence should be awarded
            const newEssence = jobSystem.getCurrentRoseEssence();
            expect(newEssence).toBeGreaterThan(initialEssence);

            // And: Transaction should be recorded in history
            const history = jobSystem.getRoseEssenceHistory();
            const lastTransaction = history[history.length - 1];
            expect(lastTransaction.type).toBe('gain');
            expect(lastTransaction.amount).toBeGreaterThan(0);

            // And: Character should be able to rank up with acquired essence
            const canRankUp = jobSystem.canRankUp(character.id);
            expect(canRankUp.canRankUp).toBe(true);
        });

        it('should handle multiple boss defeats with different rewards', async () => {
            // Given: A character and multiple boss types
            const character = createMockUnit('player1', 'warrior', 5);
            jobSystem.setCharacterJob(character.id, 'warrior');
            const initialEssence = jobSystem.getCurrentRoseEssence();

            // When: Character defeats different types of bosses
            const mainBoss = createMockUnit('main_boss', 'warrior', 15);
            mainBoss.faction = 'enemy';
            battleSystem.handleBossDefeat(mainBoss);

            const miniBoss = createMockUnit('mini_boss', 'mage', 8);
            miniBoss.faction = 'enemy';
            battleSystem.handleBossDefeat(miniBoss);

            // Then: Different amounts of rose essence should be awarded
            const finalEssence = jobSystem.getCurrentRoseEssence();
            expect(finalEssence).toBeGreaterThan(initialEssence + 20); // At least base amounts

            // And: History should show multiple transactions
            const history = jobSystem.getRoseEssenceHistory();
            const gainTransactions = history.filter(t => t.type === 'gain');
            expect(gainTransactions.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Scenario 3: Job Rank Up Progression', () => {
        it('should complete full job rank up workflow', async () => {
            // Given: A character with sufficient level and rose essence
            const character = createMockUnit('player1', 'warrior', 5);
            jobSystem.setCharacterJob(character.id, 'warrior');

            // Ensure sufficient rose essence
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'test_boss' });

            // When: Character ranks up job
            const initialStats = jobSystem.calculateJobStats(character.id);
            const initialSkills = jobSystem.getJobSkills(character.id);
            const initialEssence = jobSystem.getCurrentRoseEssence();

            const rankUpResult = await jobSystem.rankUpJob(character.id, 2);

            // Then: Rank up should succeed
            expect(rankUpResult.success).toBe(true);
            expect(rankUpResult.newRank).toBe(2);
            expect(rankUpResult.roseEssenceUsed).toBe(10);

            // And: Stats should be improved
            const newStats = jobSystem.calculateJobStats(character.id);
            expect(newStats.hp).toBeGreaterThan(initialStats.hp);
            expect(newStats.attack).toBeGreaterThan(initialStats.attack);

            // And: New skills should be unlocked
            const newSkills = jobSystem.getJobSkills(character.id);
            expect(newSkills.length).toBeGreaterThan(initialSkills.length);
            expect(newSkills).toContain('power_strike');

            // And: Rose essence should be consumed
            expect(jobSystem.getCurrentRoseEssence()).toBe(initialEssence - 10);
        });

        it('should handle rank up with prerequisite skill requirements', async () => {
            // Given: A character at rank 2 wanting to rank up to 3
            const character = createMockUnit('player1', 'warrior', 10);
            jobSystem.setCharacterJob(character.id, 'warrior');

            // Rank up to 2 first
            jobSystem.awardRoseEssence(100, { type: 'boss_defeat', bossId: 'test_boss' });
            await jobSystem.rankUpJob(character.id, 2);

            // When: Character tries to rank up to 3 (requires power_strike skill)
            const rankUpResult = await jobSystem.rankUpJob(character.id, 3);

            // Then: Rank up should succeed because power_strike was learned at rank 2
            expect(rankUpResult.success).toBe(true);
            expect(rankUpResult.newRank).toBe(3);
            expect(rankUpResult.newSkills).toContain('berserker_rage');

            // And: Final stats should reflect rank 3 bonuses
            const finalStats = jobSystem.calculateJobStats(character.id);
            expect(finalStats.hp).toBe(15);
            expect(finalStats.attack).toBe(9);
        });

        it('should prevent rank up when requirements are not met', async () => {
            // Given: A character with insufficient level
            const character = createMockUnit('player1', 'warrior', 3); // Below level requirement
            jobSystem.setCharacterJob(character.id, 'warrior');
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'test_boss' });

            // When: Character tries to rank up
            const rankUpResult = await jobSystem.rankUpJob(character.id, 2);

            // Then: Rank up should fail
            expect(rankUpResult.success).toBe(false);
            expect(rankUpResult.message).toContain('level requirement');

            // And: Character should remain at rank 1
            const jobData = jobSystem.getCharacterJobData(character.id);
            expect(jobData.currentRank).toBe(1);
        });
    });

    describe('Scenario 4: Job Change Workflow', () => {
        it('should complete full job change workflow', async () => {
            // Given: A warrior character with some progression
            const character = createMockUnit('player1', 'warrior', 5);
            jobSystem.setCharacterJob(character.id, 'warrior');
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'test_boss' });
            await jobSystem.rankUpJob(character.id, 2);

            // When: Character changes job to mage
            const initialEssence = jobSystem.getCurrentRoseEssence();
            const changeResult = jobSystem.changeJob(character.id, 'mage');

            // Then: Job change should succeed
            expect(changeResult.success).toBe(true);
            expect(changeResult.oldJobId).toBe('warrior');
            expect(changeResult.newJobId).toBe('mage');

            // And: Rose essence should be consumed for job change
            expect(jobSystem.getCurrentRoseEssence()).toBe(initialEssence - 5);

            // And: Stats should change to mage stats
            const newStats = jobSystem.calculateJobStats(character.id);
            expect(newStats.mp).toBe(8); // Mage rank 1 MP bonus
            expect(newStats.attack).toBe(4); // Mage rank 1 attack bonus

            // And: Skills should change to mage skills
            const newSkills = jobSystem.getJobSkills(character.id);
            expect(newSkills).toContain('fire_bolt');
            expect(newSkills).toContain('heal');
            expect(newSkills).not.toContain('sword_slash');

            // And: Job history should be recorded
            const jobData = jobSystem.getCharacterJobData(character.id);
            expect(jobData.jobHistory).toHaveLength(1);
            expect(jobData.jobHistory[0].jobId).toBe('mage');
        });

        it('should handle multiple job changes with history tracking', async () => {
            // Given: A character with sufficient rose essence
            const character = createMockUnit('player1', 'warrior', 5);
            jobSystem.setCharacterJob(character.id, 'warrior');
            jobSystem.awardRoseEssence(100, { type: 'boss_defeat', bossId: 'test_boss' });

            // When: Character changes jobs multiple times
            jobSystem.changeJob(character.id, 'mage');
            jobSystem.changeJob(character.id, 'archer');
            jobSystem.changeJob(character.id, 'warrior');

            // Then: All changes should be recorded in history
            const jobData = jobSystem.getCharacterJobData(character.id);
            expect(jobData.jobHistory).toHaveLength(3);
            expect(jobData.jobHistory[0].jobId).toBe('mage');
            expect(jobData.jobHistory[1].jobId).toBe('archer');
            expect(jobData.jobHistory[2].jobId).toBe('warrior');

            // And: Current job should be warrior
            expect(jobData.currentJobId).toBe('warrior');

            // And: Skills should match current job
            const skills = jobSystem.getJobSkills(character.id);
            expect(skills).toContain('sword_slash');
            expect(skills).toContain('guard');
        });
    });

    describe('Scenario 5: Multi-Character Party Management', () => {
        it('should handle multiple characters with different jobs', async () => {
            // Given: A party of characters with different jobs
            const warrior = createMockUnit('warrior1', 'warrior', 5);
            const mage = createMockUnit('mage1', 'mage', 5);
            const archer = createMockUnit('archer1', 'archer', 5);

            jobSystem.setCharacterJob(warrior.id, 'warrior');
            jobSystem.setCharacterJob(mage.id, 'mage');
            jobSystem.setCharacterJob(archer.id, 'archer');

            // When: Party engages in battle and gains experience
            experienceSystem.awardExperience(warrior.id, 100, 'battle_victory');
            experienceSystem.awardExperience(mage.id, 100, 'battle_victory');
            experienceSystem.awardExperience(archer.id, 100, 'battle_victory');

            // And: Boss is defeated, awarding rose essence
            jobSystem.awardRoseEssence(60, { type: 'boss_defeat', bossId: 'party_boss' });

            // Then: Each character should maintain their job identity
            expect(jobSystem.getCharacterJobData(warrior.id).currentJobId).toBe('warrior');
            expect(jobSystem.getCharacterJobData(mage.id).currentJobId).toBe('mage');
            expect(jobSystem.getCharacterJobData(archer.id).currentJobId).toBe('archer');

            // And: Each should have job-appropriate skills
            expect(jobSystem.getJobSkills(warrior.id)).toContain('sword_slash');
            expect(jobSystem.getJobSkills(mage.id)).toContain('fire_bolt');
            expect(jobSystem.getJobSkills(archer.id)).toContain('bow_shot');

            // And: All should be able to rank up with shared rose essence
            expect(jobSystem.canRankUp(warrior.id).canRankUp).toBe(true);
            expect(jobSystem.canRankUp(mage.id).canRankUp).toBe(true);
            expect(jobSystem.canRankUp(archer.id).canRankUp).toBe(true);
        });

        it('should handle strategic job changes for party composition', async () => {
            // Given: A party that needs rebalancing
            const char1 = createMockUnit('char1', 'warrior', 5);
            const char2 = createMockUnit('char2', 'warrior', 5);
            const char3 = createMockUnit('char3', 'warrior', 5);

            jobSystem.setCharacterJob(char1.id, 'warrior');
            jobSystem.setCharacterJob(char2.id, 'warrior');
            jobSystem.setCharacterJob(char3.id, 'warrior');

            // Provide sufficient rose essence for job changes
            jobSystem.awardRoseEssence(100, { type: 'boss_defeat', bossId: 'strategy_boss' });

            // When: Player strategically changes jobs for better party balance
            jobSystem.changeJob(char2.id, 'mage');
            jobSystem.changeJob(char3.id, 'archer');

            // Then: Party should have balanced composition
            const partyJobs = [
                jobSystem.getCharacterJobData(char1.id).currentJobId,
                jobSystem.getCharacterJobData(char2.id).currentJobId,
                jobSystem.getCharacterJobData(char3.id).currentJobId
            ];

            expect(partyJobs).toContain('warrior');
            expect(partyJobs).toContain('mage');
            expect(partyJobs).toContain('archer');

            // And: Each character should have appropriate skills for their role
            expect(jobSystem.getJobSkills(char1.id)).toContain('sword_slash'); // Warrior
            expect(jobSystem.getJobSkills(char2.id)).toContain('fire_bolt'); // Mage
            expect(jobSystem.getJobSkills(char3.id)).toContain('bow_shot'); // Archer
        });
    });

    describe('Scenario 6: Complete Character Progression Journey', () => {
        it('should complete full character progression from novice to master', async () => {
            // Given: A new character starting their journey
            const character = createMockUnit('hero', 'warrior', 1);
            jobSystem.setCharacterJob(character.id, 'warrior');

            // Phase 1: Early game progression
            // When: Character gains initial experience and levels up
            experienceSystem.awardExperience(character.id, 200, 'battle_victory');
            await experienceSystem.processLevelUp(character);

            // And: Defeats first boss
            jobSystem.awardRoseEssence(30, { type: 'boss_defeat', bossId: 'first_boss' });

            // Then: Should be able to rank up
            let canRankUp = jobSystem.canRankUp(character.id);
            expect(canRankUp.canRankUp).toBe(true);

            // Phase 2: Mid game progression
            // When: Character ranks up to level 2
            let rankUpResult = await jobSystem.rankUpJob(character.id, 2);
            expect(rankUpResult.success).toBe(true);

            // And: Gains more experience and levels
            experienceSystem.awardExperience(character.id, 500, 'multiple_battles');
            await experienceSystem.processLevelUp(character);

            // And: Defeats major boss
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'major_boss', isFirstTime: true });

            // Phase 3: Late game progression
            // When: Character reaches high level and ranks up to max
            rankUpResult = await jobSystem.rankUpJob(character.id, 3);
            expect(rankUpResult.success).toBe(true);

            // Then: Character should have maximum progression
            const finalJobData = jobSystem.getCharacterJobData(character.id);
            expect(finalJobData.currentRank).toBe(3);

            const finalStats = jobSystem.calculateJobStats(character.id);
            expect(finalStats.hp).toBe(15); // Max warrior HP bonus
            expect(finalStats.attack).toBe(9); // Max warrior attack bonus

            const finalSkills = jobSystem.getJobSkills(character.id);
            expect(finalSkills).toContain('berserker_rage'); // Ultimate warrior skill

            // Phase 4: Job mastery and experimentation
            // When: Character experiments with other jobs
            jobSystem.changeJob(character.id, 'mage');
            jobSystem.changeJob(character.id, 'archer');
            jobSystem.changeJob(character.id, 'warrior'); // Return to mastered job

            // Then: Should maintain progression and have rich job history
            const finalHistory = jobSystem.getCharacterJobData(character.id).jobHistory;
            expect(finalHistory.length).toBeGreaterThanOrEqual(3);

            // And: Should have accumulated significant rose essence transactions
            const essenceHistory = jobSystem.getRoseEssenceHistory();
            expect(essenceHistory.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('Scenario 7: Error Recovery and Edge Cases', () => {
        it('should handle system errors gracefully without data corruption', async () => {
            // Given: A character with some progression
            const character = createMockUnit('test_char', 'warrior', 5);
            jobSystem.setCharacterJob(character.id, 'warrior');
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'test_boss' });

            // When: Various error conditions occur
            let errorCount = 0;

            // Try invalid job change
            try {
                jobSystem.changeJob(character.id, 'invalid_job');
            } catch (error) {
                errorCount++;
            }

            // Try rank up with insufficient level
            try {
                await jobSystem.rankUpJob(character.id, 10); // Invalid rank
            } catch (error) {
                errorCount++;
            }

            // Try operations on non-existent character
            try {
                jobSystem.calculateJobStats('non_existent');
            } catch (error) {
                errorCount++;
            }

            // Then: System should remain stable despite errors
            expect(errorCount).toBeGreaterThan(0); // Errors should occur

            // And: Valid operations should still work
            const stats = jobSystem.calculateJobStats(character.id);
            expect(stats).toBeDefined();

            const canRankUp = jobSystem.canRankUp(character.id);
            expect(canRankUp).toBeDefined();

            const essence = jobSystem.getCurrentRoseEssence();
            expect(essence).toBeGreaterThanOrEqual(0);
        });

        it('should handle concurrent operations without data races', async () => {
            // Given: Multiple characters and concurrent operations
            const characters = ['char1', 'char2', 'char3', 'char4', 'char5'];

            characters.forEach(charId => {
                jobSystem.setCharacterJob(charId, 'warrior');
            });

            jobSystem.awardRoseEssence(200, { type: 'boss_defeat', bossId: 'concurrent_boss' });

            // When: Concurrent operations are performed
            const operations = characters.map(async (charId, index) => {
                // Mix of different operations
                if (index % 3 === 0) {
                    return jobSystem.rankUpJob(charId, 2);
                } else if (index % 3 === 1) {
                    return Promise.resolve(jobSystem.changeJob(charId, 'mage'));
                } else {
                    return Promise.resolve(jobSystem.calculateJobStats(charId));
                }
            });

            const results = await Promise.all(operations);

            // Then: All operations should complete successfully
            expect(results).toHaveLength(characters.length);
            results.forEach(result => {
                expect(result).toBeDefined();
            });

            // And: System should remain in consistent state
            characters.forEach(charId => {
                const jobData = jobSystem.getCharacterJobData(charId);
                expect(jobData).toBeDefined();
                expect(jobData.currentJobId).toBeDefined();
                expect(jobData.currentRank).toBeGreaterThanOrEqual(1);
            });
        });
    });

    describe('Scenario 8: Performance Under Load', () => {
        it('should maintain performance with large number of characters', async () => {
            // Given: Large number of characters
            const numCharacters = 100;
            const characters: string[] = [];

            for (let i = 0; i < numCharacters; i++) {
                const charId = `load_char${i}`;
                characters.push(charId);
                jobSystem.setCharacterJob(charId, i % 3 === 0 ? 'warrior' : i % 3 === 1 ? 'mage' : 'archer');
            }

            jobSystem.awardRoseEssence(1000, { type: 'boss_defeat', bossId: 'load_boss' });

            // When: Performing operations on all characters
            const startTime = performance.now();

            const operations = characters.map(async (charId, index) => {
                // Perform various operations
                jobSystem.calculateJobStats(charId);
                jobSystem.getJobSkills(charId);

                if (index % 10 === 0) {
                    await jobSystem.rankUpJob(charId, 2);
                }

                if (index % 15 === 0) {
                    jobSystem.changeJob(charId, 'mage');
                }
            });

            await Promise.all(operations);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Then: Operations should complete within reasonable time
            expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 characters

            // And: All characters should be in valid state
            characters.forEach(charId => {
                const jobData = jobSystem.getCharacterJobData(charId);
                expect(jobData).toBeDefined();
                expect(jobData.currentJobId).toBeDefined();
            });

            console.log(`Load test completed in ${totalTime.toFixed(2)}ms for ${numCharacters} characters`);
        });
    });
});