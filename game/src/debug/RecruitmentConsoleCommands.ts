/**
 * Console commands for recruitment system testing and debugging
 * Provides command-line interface for testing recruitment mechanics
 */

import { Unit } from '../types/gameplay';
import {
  RecruitmentCondition,
  RecruitmentContext,
  RecruitmentResult,
  RecruitmentStatus,
  RecruitmentConditionType,
  NPCState,
  RecruitableCharacter,
} from '../types/recruitment';
import { GameConfig } from '../config/GameConfig';
import { RecruitmentDebugManager } from './RecruitmentDebugManager';
import { RecruitmentSystem } from '../systems/recruitment/RecruitmentSystem';

/**
 * Console command definition
 */
interface ConsoleCommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[]) => void;
}

/**
 * Mock data for testing
 */
interface MockTestData {
  units: Unit[];
  conditions: RecruitmentCondition[];
  recruitableCharacters: RecruitableCharacter[];
}

/**
 * Recruitment console commands manager
 */
export class RecruitmentConsoleCommands {
  private static instance: RecruitmentConsoleCommands;
  private commands: Map<string, ConsoleCommand> = new Map();
  private commandPrefix: string = 'recruitment';
  private enabled: boolean = false;
  private debugManager: RecruitmentDebugManager;
  private recruitmentSystem: RecruitmentSystem | null = null;
  private mockData: MockTestData;

  private constructor() {
    this.debugManager = RecruitmentDebugManager.getInstance();
    this.initializeMockData();
    this.registerCommands();
    this.updateFromConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RecruitmentConsoleCommands {
    if (!RecruitmentConsoleCommands.instance) {
      RecruitmentConsoleCommands.instance = new RecruitmentConsoleCommands();
    }
    return RecruitmentConsoleCommands.instance;
  }

  /**
   * Set recruitment system reference
   */
  public setRecruitmentSystem(system: RecruitmentSystem): void {
    this.recruitmentSystem = system;
  }

  /**
   * Update settings from game configuration
   */
  public updateFromConfig(): void {
    const gameConfig = new GameConfig();
    const recruitmentConfig = gameConfig.getRecruitmentSystemConfig();

    this.enabled = recruitmentConfig.consoleCommands.enableCommands;
    this.commandPrefix = recruitmentConfig.consoleCommands.commandPrefix;

    if (this.enabled) {
      this.enableCommands();
    } else {
      this.disableCommands();
    }
  }

  /**
   * Enable console commands
   */
  public enableCommands(): void {
    this.enabled = true;
    this.registerGlobalCommands();
    console.log(`RecruitmentConsoleCommands: Commands enabled with prefix '${this.commandPrefix}'`);
    this.showHelp();
  }

  /**
   * Disable console commands
   */
  public disableCommands(): void {
    this.enabled = false;
    this.unregisterGlobalCommands();
    console.log('RecruitmentConsoleCommands: Commands disabled');
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    // Create mock units
    this.mockData = {
      units: [
        {
          id: 'player_hero',
          name: 'Hero',
          position: { x: 0, y: 0 },
          stats: { maxHP: 100, attack: 20, defense: 15, speed: 10, movement: 3 },
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        } as Unit,
        {
          id: 'enemy_knight',
          name: 'Enemy Knight',
          position: { x: 5, y: 5 },
          stats: { maxHP: 80, attack: 18, defense: 20, speed: 8, movement: 2 },
          currentHP: 24, // 30% HP for testing HP threshold
          currentMP: 30,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        } as Unit,
        {
          id: 'enemy_mage',
          name: 'Enemy Mage',
          position: { x: 3, y: 7 },
          stats: { maxHP: 60, attack: 25, defense: 10, speed: 12, movement: 3 },
          currentHP: 60,
          currentMP: 80,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        } as Unit,
      ],
      conditions: [],
      recruitableCharacters: [],
    };

    // Create mock conditions
    this.mockData.conditions = [
      {
        id: 'specific_attacker_hero',
        type: RecruitmentConditionType.SPECIFIC_ATTACKER,
        description: 'Must be attacked by Hero',
        parameters: { attackerId: 'player_hero' },
        checkCondition: (context: RecruitmentContext) => context.attacker.id === 'player_hero',
      },
      {
        id: 'hp_threshold_30',
        type: RecruitmentConditionType.HP_THRESHOLD,
        description: 'Target HP must be below 30%',
        parameters: { threshold: 0.3 },
        checkCondition: (context: RecruitmentContext) =>
          context.target.currentHP / context.target.stats.maxHP <= 0.3,
      },
      {
        id: 'turn_limit_5',
        type: RecruitmentConditionType.TURN_LIMIT,
        description: 'Must be recruited within 5 turns',
        parameters: { maxTurn: 5 },
        checkCondition: (context: RecruitmentContext) => context.turn <= 5,
      },
    ];

    // Create mock recruitable characters
    this.mockData.recruitableCharacters = [
      {
        characterId: 'enemy_knight',
        conditions: [this.mockData.conditions[0], this.mockData.conditions[1]],
        recruitmentStatus: RecruitmentStatus.AVAILABLE,
        priority: 100,
        description: 'A noble knight who can be convinced to join',
      },
      {
        characterId: 'enemy_mage',
        conditions: [this.mockData.conditions[0], this.mockData.conditions[2]],
        recruitmentStatus: RecruitmentStatus.AVAILABLE,
        priority: 80,
        description: 'A wise mage seeking a worthy cause',
      },
    ];
  }

  /**
   * Register all console commands
   */
  private registerCommands(): void {
    // Help command
    this.commands.set('help', {
      name: 'help',
      description: 'Show available recruitment commands',
      usage: `${this.commandPrefix}.help()`,
      handler: () => this.showHelp(),
    });

    // Status command
    this.commands.set('status', {
      name: 'status',
      description: 'Show recruitment system status',
      usage: `${this.commandPrefix}.status()`,
      handler: () => this.showStatus(),
    });

    // Test recruitment command
    this.commands.set('test', {
      name: 'test',
      description: 'Test recruitment scenario',
      usage: `${this.commandPrefix}.test(attackerId, targetId, damage?)`,
      handler: args => this.testRecruitment(args),
    });

    // Simulate command
    this.commands.set('simulate', {
      name: 'simulate',
      description: 'Simulate multiple recruitment attempts',
      usage: `${this.commandPrefix}.simulate(attackerId, targetId, attempts?)`,
      handler: args => this.simulateRecruitment(args),
    });

    // List units command
    this.commands.set('units', {
      name: 'units',
      description: 'List available test units',
      usage: `${this.commandPrefix}.units()`,
      handler: () => this.listUnits(),
    });

    // List conditions command
    this.commands.set('conditions', {
      name: 'conditions',
      description: 'List available recruitment conditions',
      usage: `${this.commandPrefix}.conditions(characterId?)`,
      handler: args => this.listConditions(args),
    });

    // Create NPC command
    this.commands.set('createNPC', {
      name: 'createNPC',
      description: 'Convert unit to NPC state',
      usage: `${this.commandPrefix}.createNPC(unitId)`,
      handler: args => this.createNPC(args),
    });

    // Debug session commands
    this.commands.set('startSession', {
      name: 'startSession',
      description: 'Start debug session',
      usage: `${this.commandPrefix}.startSession(sessionName?)`,
      handler: args => this.startDebugSession(args),
    });

    this.commands.set('endSession', {
      name: 'endSession',
      description: 'End current debug session',
      usage: `${this.commandPrefix}.endSession()`,
      handler: () => this.endDebugSession(),
    });

    // Statistics commands
    this.commands.set('stats', {
      name: 'stats',
      description: 'Show recruitment statistics',
      usage: `${this.commandPrefix}.stats()`,
      handler: () => this.showStatistics(),
    });

    this.commands.set('report', {
      name: 'report',
      description: 'Generate debug report',
      usage: `${this.commandPrefix}.report()`,
      handler: () => this.generateReport(),
    });

    // Configuration commands
    this.commands.set('config', {
      name: 'config',
      description: 'Show recruitment configuration',
      usage: `${this.commandPrefix}.config()`,
      handler: () => this.showConfiguration(),
    });

    this.commands.set('setConfig', {
      name: 'setConfig',
      description: 'Update recruitment configuration',
      usage: `${this.commandPrefix}.setConfig(key, value)`,
      handler: args => this.updateConfiguration(args),
    });

    // Clear data command
    this.commands.set('clear', {
      name: 'clear',
      description: 'Clear debug data',
      usage: `${this.commandPrefix}.clear()`,
      handler: () => this.clearDebugData(),
    });

    // Balance testing commands
    this.commands.set('balance', {
      name: 'balance',
      description: 'Run balance tests',
      usage: `${this.commandPrefix}.balance(testType?)`,
      handler: args => this.runBalanceTests(args),
    });
  }

  /**
   * Register commands globally
   */
  private registerGlobalCommands(): void {
    if (typeof window !== 'undefined') {
      (window as any)[this.commandPrefix] = {};

      for (const [name, command] of this.commands) {
        (window as any)[this.commandPrefix][name] = (...args: any[]) => {
          if (this.enabled) {
            command.handler(args);
          } else {
            console.warn('Recruitment console commands are disabled');
          }
        };
      }
    }
  }

  /**
   * Unregister global commands
   */
  private unregisterGlobalCommands(): void {
    if (typeof window !== 'undefined' && (window as any)[this.commandPrefix]) {
      delete (window as any)[this.commandPrefix];
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log('=== Recruitment System Console Commands ===');
    console.log(`Prefix: ${this.commandPrefix}`);
    console.log('');

    for (const command of this.commands.values()) {
      console.log(`${command.usage}`);
      console.log(`  ${command.description}`);
      console.log('');
    }

    console.log('Examples:');
    console.log(`  ${this.commandPrefix}.test('player_hero', 'enemy_knight', 50)`);
    console.log(`  ${this.commandPrefix}.simulate('player_hero', 'enemy_knight', 10)`);
    console.log(`  ${this.commandPrefix}.stats()`);
  }

  /**
   * Show system status
   */
  private showStatus(): void {
    console.log('=== Recruitment System Status ===');
    console.log(`Commands Enabled: ${this.enabled}`);
    console.log(`Command Prefix: ${this.commandPrefix}`);
    console.log(`Recruitment System: ${this.recruitmentSystem ? 'Connected' : 'Not Connected'}`);
    console.log(`Mock Units: ${this.mockData.units.length}`);
    console.log(`Mock Conditions: ${this.mockData.conditions.length}`);
    console.log(`Mock Recruitable Characters: ${this.mockData.recruitableCharacters.length}`);
  }

  /**
   * Test recruitment scenario
   */
  private testRecruitment(args: string[]): void {
    if (args.length < 2) {
      console.error('Usage: test(attackerId, targetId, damage?)');
      return;
    }

    const [attackerId, targetId, damageStr] = args;
    const damage = damageStr ? parseInt(damageStr) : 50;

    const attacker = this.mockData.units.find(u => u.id === attackerId);
    const target = this.mockData.units.find(u => u.id === targetId);

    if (!attacker) {
      console.error(`Attacker not found: ${attackerId}`);
      return;
    }

    if (!target) {
      console.error(`Target not found: ${targetId}`);
      return;
    }

    const recruitableChar = this.mockData.recruitableCharacters.find(
      c => c.characterId === targetId
    );

    if (!recruitableChar) {
      console.error(`Target is not recruitable: ${targetId}`);
      return;
    }

    console.log(`Testing recruitment: ${attacker.name} -> ${target.name} (${damage} damage)`);

    const result = this.debugManager.simulateRecruitment(
      attacker,
      target,
      recruitableChar.conditions,
      damage
    );

    console.log('Result:', result);
  }

  /**
   * Simulate multiple recruitment attempts
   */
  private simulateRecruitment(args: string[]): void {
    if (args.length < 2) {
      console.error('Usage: simulate(attackerId, targetId, attempts?)');
      return;
    }

    const [attackerId, targetId, attemptsStr] = args;
    const attempts = attemptsStr ? parseInt(attemptsStr) : 10;

    const attacker = this.mockData.units.find(u => u.id === attackerId);
    const target = this.mockData.units.find(u => u.id === targetId);

    if (!attacker || !target) {
      console.error('Invalid attacker or target ID');
      return;
    }

    const recruitableChar = this.mockData.recruitableCharacters.find(
      c => c.characterId === targetId
    );

    if (!recruitableChar) {
      console.error(`Target is not recruitable: ${targetId}`);
      return;
    }

    console.log(`Simulating ${attempts} recruitment attempts: ${attacker.name} -> ${target.name}`);

    const sessionId = this.debugManager.startDebugSession(`simulation_${Date.now()}`);
    let successCount = 0;

    for (let i = 0; i < attempts; i++) {
      const damage = Math.floor(Math.random() * 50) + 25; // Random damage 25-75
      const result = this.debugManager.simulateRecruitment(
        attacker,
        target,
        recruitableChar.conditions,
        damage,
        i + 1
      );

      if (result.success) {
        successCount++;
      }
    }

    const session = this.debugManager.endDebugSession();

    console.log(`Simulation completed:`);
    console.log(`  Success Rate: ${((successCount / attempts) * 100).toFixed(2)}%`);
    console.log(`  Average Evaluation Time: ${session?.averageEvaluationTime.toFixed(2)}ms`);
    console.log(`  Errors: ${session?.errors.length || 0}`);
  }

  /**
   * List available units
   */
  private listUnits(): void {
    console.log('=== Available Test Units ===');
    for (const unit of this.mockData.units) {
      console.log(`${unit.id}: ${unit.name} (${unit.faction})`);
      console.log(`  HP: ${unit.currentHP}/${unit.stats.maxHP}`);
      console.log(`  Position: (${unit.position.x}, ${unit.position.y})`);
    }
  }

  /**
   * List recruitment conditions
   */
  private listConditions(args: string[]): void {
    const characterId = args[0];

    if (characterId) {
      const recruitableChar = this.mockData.recruitableCharacters.find(
        c => c.characterId === characterId
      );

      if (!recruitableChar) {
        console.error(`Character not found: ${characterId}`);
        return;
      }

      console.log(`=== Conditions for ${characterId} ===`);
      recruitableChar.conditions.forEach((condition, index) => {
        console.log(`${index + 1}. ${condition.description}`);
        console.log(`   Type: ${condition.type}`);
        console.log(`   Parameters:`, condition.parameters);
      });
    } else {
      console.log('=== All Available Conditions ===');
      this.mockData.conditions.forEach((condition, index) => {
        console.log(`${index + 1}. ${condition.id}: ${condition.description}`);
        console.log(`   Type: ${condition.type}`);
        console.log(`   Parameters:`, condition.parameters);
      });
    }
  }

  /**
   * Create NPC from unit
   */
  private createNPC(args: string[]): void {
    if (args.length < 1) {
      console.error('Usage: createNPC(unitId)');
      return;
    }

    const unitId = args[0];
    const unit = this.mockData.units.find(u => u.id === unitId);

    if (!unit) {
      console.error(`Unit not found: ${unitId}`);
      return;
    }

    const npcState: NPCState = {
      convertedAt: Date.now(),
      remainingHP: unit.currentHP,
      isProtected: false,
      visualState: {
        indicatorVisible: true,
        indicatorType: 'crown',
        tintColor: 0x00ff00,
        glowEffect: true,
        animationSpeed: 0.8,
      },
      originalFaction: unit.faction,
      recruitmentId: `test_recruitment_${unitId}_${Date.now()}`,
    };

    console.log(`Created NPC state for ${unit.name}:`, npcState);

    // Log the NPC state change
    this.debugManager.logNPCStateChange(unit, null, npcState, 'Console command');
  }

  /**
   * Start debug session
   */
  private startDebugSession(args: string[]): void {
    const sessionName = args[0] || `console_session_${Date.now()}`;
    const sessionId = this.debugManager.startDebugSession(sessionName);
    console.log(`Started debug session: ${sessionId}`);
  }

  /**
   * End debug session
   */
  private endDebugSession(): void {
    const session = this.debugManager.endDebugSession();
    if (session) {
      console.log(`Ended debug session: ${session.sessionId}`);
      console.log(`Duration: ${session.endTime! - session.startTime}ms`);
      console.log(`Attempts: ${session.totalAttempts}`);
      console.log(
        `Success Rate: ${
          session.totalAttempts > 0
            ? ((session.successfulAttempts / session.totalAttempts) * 100).toFixed(2)
            : 0
        }%`
      );
    } else {
      console.log('No active debug session to end');
    }
  }

  /**
   * Show statistics
   */
  private showStatistics(): void {
    const stats = this.debugManager.getStatistics();
    console.log('=== Recruitment Statistics ===');
    console.log(`Total Attempts: ${stats.totalAttempts}`);
    console.log(`Successful Recruitments: ${stats.successfulRecruitments}`);
    console.log(`Failed Recruitments: ${stats.failedRecruitments}`);
    console.log(
      `Success Rate: ${
        stats.totalAttempts > 0
          ? ((stats.successfulRecruitments / stats.totalAttempts) * 100).toFixed(2)
          : 0
      }%`
    );
    console.log(`NPCs Saved: ${stats.npcsSaved}`);
    console.log(`NPCs Lost: ${stats.npcsLost}`);
    console.log(`Average Conditions Met: ${stats.averageConditionsMet.toFixed(2)}%`);

    if (Object.keys(stats.recruitmentsByStage).length > 0) {
      console.log('Recruitments by Stage:');
      for (const [stage, count] of Object.entries(stats.recruitmentsByStage)) {
        console.log(`  ${stage}: ${count}`);
      }
    }
  }

  /**
   * Generate debug report
   */
  private generateReport(): void {
    const report = this.debugManager.generateDebugReport();
    console.log(report);
  }

  /**
   * Show configuration
   */
  private showConfiguration(): void {
    const gameConfig = new GameConfig();
    const config = gameConfig.getRecruitmentSystemConfig();
    console.log('=== Recruitment System Configuration ===');
    console.log(JSON.stringify(config, null, 2));
  }

  /**
   * Update configuration
   */
  private updateConfiguration(args: string[]): void {
    if (args.length < 2) {
      console.error('Usage: setConfig(key, value)');
      return;
    }

    const [key, value] = args;
    const gameConfig = new GameConfig();

    try {
      const parsedValue = JSON.parse(value);
      const updateObj = { [key]: parsedValue };
      gameConfig.updateRecruitmentSystemConfig(updateObj);
      console.log(`Updated configuration: ${key} = ${value}`);
    } catch (error) {
      console.error('Invalid JSON value:', error);
    }
  }

  /**
   * Clear debug data
   */
  private clearDebugData(): void {
    this.debugManager.clearDebugData();
    console.log('Debug data cleared');
  }

  /**
   * Run balance tests
   */
  private runBalanceTests(args: string[]): void {
    const testType = args[0] || 'all';

    console.log(`Running balance tests: ${testType}`);

    if (testType === 'all' || testType === 'conditions') {
      this.testConditionBalance();
    }

    if (testType === 'all' || testType === 'difficulty') {
      this.testDifficultyBalance();
    }

    if (testType === 'all' || testType === 'performance') {
      this.testPerformanceBalance();
    }
  }

  /**
   * Test condition balance
   */
  private testConditionBalance(): void {
    console.log('=== Condition Balance Test ===');

    const sessionId = this.debugManager.startDebugSession('condition_balance_test');

    for (const recruitableChar of this.mockData.recruitableCharacters) {
      const target = this.mockData.units.find(u => u.id === recruitableChar.characterId);
      const attacker = this.mockData.units.find(u => u.faction === 'player');

      if (!target || !attacker) continue;

      let successCount = 0;
      const testAttempts = 100;

      for (let i = 0; i < testAttempts; i++) {
        const damage = Math.floor(Math.random() * 50) + 25;
        const result = this.debugManager.simulateRecruitment(
          attacker,
          target,
          recruitableChar.conditions,
          damage,
          i + 1
        );

        if (result.success) successCount++;
      }

      const successRate = (successCount / testAttempts) * 100;
      console.log(`${target.name}: ${successRate.toFixed(2)}% success rate`);

      // Analyze balance
      if (successRate < 10) {
        console.warn(`  ⚠️  Too difficult (${successRate.toFixed(2)}%)`);
      } else if (successRate > 80) {
        console.warn(`  ⚠️  Too easy (${successRate.toFixed(2)}%)`);
      } else {
        console.log(`  ✓  Balanced (${successRate.toFixed(2)}%)`);
      }
    }

    this.debugManager.endDebugSession();
  }

  /**
   * Test difficulty balance
   */
  private testDifficultyBalance(): void {
    console.log('=== Difficulty Balance Test ===');
    // Implementation would test various difficulty scenarios
    console.log('Difficulty balance test completed');
  }

  /**
   * Test performance balance
   */
  private testPerformanceBalance(): void {
    console.log('=== Performance Balance Test ===');

    const startTime = Date.now();
    const testAttempts = 1000;

    const attacker = this.mockData.units.find(u => u.faction === 'player')!;
    const target = this.mockData.units.find(u => u.faction === 'enemy')!;
    const conditions = this.mockData.conditions;

    for (let i = 0; i < testAttempts; i++) {
      this.debugManager.simulateRecruitment(attacker, target, conditions, 50, 1);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / testAttempts;

    console.log(`${testAttempts} simulations completed in ${totalTime}ms`);
    console.log(`Average time per simulation: ${avgTime.toFixed(2)}ms`);

    if (avgTime > 10) {
      console.warn('⚠️  Performance may be too slow for real-time gameplay');
    } else {
      console.log('✓  Performance is acceptable');
    }
  }
}
