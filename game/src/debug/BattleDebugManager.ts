import { Unit, BattleResult, DamageModifier } from '../types/battle';
import { Position } from '../types/gameplay';
import { GameConfig } from '../config/GameConfig';
import { BattleBalanceTool } from './BattleBalanceTool';

/**
 * 戦闘デバッグ情報
 */
export interface BattleDebugInfo {
  timestamp: number;
  phase:
    | 'range_calculation'
    | 'target_selection'
    | 'damage_calculation'
    | 'animation'
    | 'state_update';
  attacker: {
    id: string;
    name: string;
    position: Position;
    stats: any;
    weapon?: any;
  };
  target?: {
    id: string;
    name: string;
    position: Position;
    stats: any;
    currentHP: number;
  };
  calculations?: {
    baseDamage?: number;
    modifiers?: DamageModifier[];
    finalDamage?: number;
    hitChance?: number;
    criticalChance?: number;
    evasionChance?: number;
  };
  result?: BattleResult;
  duration?: number;
  error?: string;
}

/**
 * デバッグ表示オプション
 */
export interface DebugDisplayOptions {
  showAttackRange: boolean;
  showDamageCalculation: boolean;
  showTargetSelection: boolean;
  showBattleStatistics: boolean;
  showPerformanceMetrics: boolean;
  logToConsole: boolean;
  logToScreen: boolean;
  enableDetailedLogging: boolean;
}

/**
 * 戦闘デバッグマネージャー
 * 戦闘システムのデバッグ情報収集と表示を管理
 */
export class BattleDebugManager {
  private debugInfo: BattleDebugInfo[] = [];
  private displayOptions: DebugDisplayOptions;
  private gameConfig: GameConfig;
  private balanceTool: BattleBalanceTool;
  private debugOverlay?: Phaser.GameObjects.Container;
  private scene?: Phaser.Scene;
  private performanceMetrics: {
    rangeCalculationTime: number[];
    damageCalculationTime: number[];
    animationTime: number[];
    totalBattleTime: number[];
  };

  constructor(scene?: Phaser.Scene) {
    this.scene = scene;
    this.gameConfig = new GameConfig();
    this.balanceTool = new BattleBalanceTool();
    this.performanceMetrics = {
      rangeCalculationTime: [],
      damageCalculationTime: [],
      animationTime: [],
      totalBattleTime: [],
    };

    const battleConfig = this.gameConfig.getBattleSystemConfig();
    this.displayOptions = {
      showAttackRange: battleConfig.showAttackRangeDebug,
      showDamageCalculation: battleConfig.showDamageCalculationDebug,
      showTargetSelection: battleConfig.showTargetSelectionDebug,
      showBattleStatistics: battleConfig.showBattleStatistics,
      showPerformanceMetrics: battleConfig.enableBattleDebug,
      logToConsole: battleConfig.enableBattleDebug,
      logToScreen: battleConfig.enableBattleDebug,
      enableDetailedLogging: battleConfig.enableBattleDebug,
    };

    this.initializeDebugOverlay();
  }

  /**
   * デバッグオーバーレイの初期化
   */
  private initializeDebugOverlay(): void {
    if (!this.scene || !this.displayOptions.logToScreen) return;

    this.debugOverlay = this.scene.add.container(10, 10);
    this.debugOverlay.setDepth(1000);
    this.debugOverlay.setScrollFactor(0);
  }

  /**
   * 戦闘フェーズの開始をログ
   */
  public logBattlePhaseStart(
    phase: BattleDebugInfo['phase'],
    attacker: Unit,
    target?: Unit
  ): number {
    const debugInfo: BattleDebugInfo = {
      timestamp: Date.now(),
      phase,
      attacker: {
        id: attacker.id,
        name: attacker.name,
        position: attacker.position,
        stats: attacker.stats,
        weapon: attacker.weapon,
      },
      target: target
        ? {
            id: target.id,
            name: target.name,
            position: target.position,
            stats: target.stats,
            currentHP: target.currentHP,
          }
        : undefined,
    };

    this.debugInfo.push(debugInfo);

    if (this.displayOptions.logToConsole && this.displayOptions.enableDetailedLogging) {
      console.log(`[BattleDebug] Phase started: ${phase}`, {
        attacker: attacker.name,
        target: target?.name,
        timestamp: new Date(debugInfo.timestamp).toLocaleTimeString(),
      });
    }

    return debugInfo.timestamp;
  }

  /**
   * 戦闘フェーズの完了をログ
   */
  public logBattlePhaseEnd(
    startTimestamp: number,
    calculations?: BattleDebugInfo['calculations'],
    result?: BattleResult,
    error?: string
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTimestamp;

    const debugInfoIndex = this.debugInfo.findIndex(info => info.timestamp === startTimestamp);
    if (debugInfoIndex !== -1) {
      this.debugInfo[debugInfoIndex].calculations = calculations;
      this.debugInfo[debugInfoIndex].result = result;
      this.debugInfo[debugInfoIndex].duration = duration;
      this.debugInfo[debugInfoIndex].error = error;

      const debugInfo = this.debugInfo[debugInfoIndex];

      // パフォーマンスメトリクス記録
      this.recordPerformanceMetric(debugInfo.phase, duration);

      // バランスツールに結果記録
      if (result && !error) {
        this.balanceTool.recordBattle(
          result.attacker,
          result.target,
          result.damage,
          result.isCritical,
          result.isEvaded,
          duration
        );
      }

      if (this.displayOptions.logToConsole) {
        this.logToConsole(debugInfo);
      }

      if (this.displayOptions.logToScreen) {
        this.updateScreenDisplay();
      }
    }
  }

  /**
   * パフォーマンスメトリクスの記録
   */
  private recordPerformanceMetric(phase: BattleDebugInfo['phase'], duration: number): void {
    switch (phase) {
      case 'range_calculation':
        this.performanceMetrics.rangeCalculationTime.push(duration);
        break;
      case 'damage_calculation':
        this.performanceMetrics.damageCalculationTime.push(duration);
        break;
      case 'animation':
        this.performanceMetrics.animationTime.push(duration);
        break;
      case 'state_update':
        this.performanceMetrics.totalBattleTime.push(duration);
        break;
    }

    // 最新100件のみ保持
    Object.keys(this.performanceMetrics).forEach(key => {
      const metrics = this.performanceMetrics[key as keyof typeof this.performanceMetrics];
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }
    });
  }

  /**
   * コンソールへのログ出力
   */
  private logToConsole(debugInfo: BattleDebugInfo): void {
    const time = new Date(debugInfo.timestamp).toLocaleTimeString();
    let message = `[BattleDebug] ${time} ${debugInfo.phase}`;

    if (debugInfo.attacker) {
      message += ` | ${debugInfo.attacker.name}`;
    }

    if (debugInfo.target) {
      message += ` → ${debugInfo.target.name}`;
    }

    if (debugInfo.duration) {
      message += ` | ${debugInfo.duration}ms`;
    }

    console.log(message);

    // 詳細情報の表示
    if (this.displayOptions.enableDetailedLogging) {
      if (debugInfo.calculations) {
        console.log('  Calculations:', debugInfo.calculations);
      }

      if (debugInfo.result) {
        console.log('  Result:', {
          damage: debugInfo.result.damage,
          isCritical: debugInfo.result.isCritical,
          isEvaded: debugInfo.result.isEvaded,
          targetDefeated: debugInfo.result.targetDefeated,
        });
      }

      if (debugInfo.error) {
        console.error('  Error:', debugInfo.error);
      }
    }
  }

  /**
   * 画面表示の更新
   */
  private updateScreenDisplay(): void {
    if (!this.debugOverlay || !this.scene) return;

    // 既存の表示をクリア
    this.debugOverlay.removeAll(true);

    let yOffset = 0;
    const lineHeight = 20;

    // 最新の戦闘情報を表示
    const recentBattles = this.debugInfo.slice(-5);
    recentBattles.forEach((info, index) => {
      const time = new Date(info.timestamp).toLocaleTimeString();
      let text = `${time} ${info.phase}`;

      if (info.result) {
        const result = info.result.isEvaded
          ? 'MISS'
          : info.result.isCritical
            ? `CRIT ${info.result.damage}`
            : info.result.damage.toString();
        text += ` | ${result}`;
      }

      if (info.duration) {
        text += ` | ${info.duration}ms`;
      }

      const textObj = this.scene.add.text(0, yOffset, text, {
        fontSize: '12px',
        color: info.error ? '#ff4444' : '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      });

      this.debugOverlay.add(textObj);
      yOffset += lineHeight;
    });

    // パフォーマンスメトリクス表示
    if (this.displayOptions.showPerformanceMetrics) {
      yOffset += 10;

      const avgRangeTime = this.getAverageTime(this.performanceMetrics.rangeCalculationTime);
      const avgDamageTime = this.getAverageTime(this.performanceMetrics.damageCalculationTime);
      const avgAnimationTime = this.getAverageTime(this.performanceMetrics.animationTime);

      const perfText = this.scene.add.text(
        0,
        yOffset,
        `Avg Times: Range ${avgRangeTime}ms | Damage ${avgDamageTime}ms | Anim ${avgAnimationTime}ms`,
        {
          fontSize: '10px',
          color: '#88ff88',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        }
      );

      this.debugOverlay.add(perfText);
      yOffset += lineHeight;
    }

    // 戦闘統計表示
    if (this.displayOptions.showBattleStatistics) {
      const stats = this.balanceTool.getStatistics();
      const statsText = this.scene.add.text(
        0,
        yOffset,
        `Battles: ${stats.totalBattles} | Avg Dmg: ${stats.averageDamage.toFixed(1)} | Crit: ${stats.criticalHitRate.toFixed(1)}%`,
        {
          fontSize: '10px',
          color: '#ffff88',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        }
      );

      this.debugOverlay.add(statsText);
    }
  }

  /**
   * 平均時間の計算
   */
  private getAverageTime(times: number[]): number {
    if (times.length === 0) return 0;
    const sum = times.reduce((a, b) => a + b, 0);
    return Math.round(sum / times.length);
  }

  /**
   * 攻撃範囲のデバッグ表示
   */
  public showAttackRangeDebug(
    attackerPosition: Position,
    attackRange: Position[],
    validTargets: Position[],
    invalidTargets: Position[]
  ): void {
    if (!this.displayOptions.showAttackRange || !this.scene) return;

    const config = this.gameConfig.getBattleSystemConfig();
    const tileSize = 32; // TODO: 設定から取得

    // 攻撃範囲の表示
    attackRange.forEach(pos => {
      const graphics = this.scene!.add.graphics();
      graphics.fillStyle(config.debugColors.attackRange, 0.3);
      graphics.fillRect(pos.x * tileSize, pos.y * tileSize, tileSize, tileSize);
      graphics.setDepth(100);

      // 一定時間後に削除
      this.scene!.time.delayedCall(2000, () => {
        graphics.destroy();
      });
    });

    // 有効な対象の表示
    validTargets.forEach(pos => {
      const graphics = this.scene!.add.graphics();
      graphics.fillStyle(config.debugColors.validTargets, 0.5);
      graphics.fillRect(pos.x * tileSize, pos.y * tileSize, tileSize, tileSize);
      graphics.setDepth(101);

      this.scene!.time.delayedCall(2000, () => {
        graphics.destroy();
      });
    });

    // 無効な対象の表示
    invalidTargets.forEach(pos => {
      const graphics = this.scene!.add.graphics();
      graphics.fillStyle(config.debugColors.invalidTargets, 0.3);
      graphics.fillRect(pos.x * tileSize, pos.y * tileSize, tileSize, tileSize);
      graphics.setDepth(101);

      this.scene!.time.delayedCall(2000, () => {
        graphics.destroy();
      });
    });
  }

  /**
   * ダメージ計算のデバッグ表示
   */
  public showDamageCalculationDebug(
    target: Unit,
    baseDamage: number,
    modifiers: DamageModifier[],
    finalDamage: number
  ): void {
    if (!this.displayOptions.showDamageCalculation || !this.scene) return;

    const tileSize = 32;
    const x = target.position.x * tileSize + tileSize / 2;
    const y = target.position.y * tileSize - 20;

    // ダメージ詳細の表示
    let debugText = `Base: ${baseDamage}\n`;
    modifiers.forEach(mod => {
      debugText += `${mod.description}: x${mod.multiplier}\n`;
    });
    debugText += `Final: ${finalDamage}`;

    const textObj = this.scene.add.text(x, y, debugText, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
      align: 'center',
    });
    textObj.setOrigin(0.5, 1);
    textObj.setDepth(200);

    // フェードアウトして削除
    this.scene.tweens.add({
      targets: textObj,
      alpha: 0,
      y: y - 30,
      duration: 2000,
      onComplete: () => {
        textObj.destroy();
      },
    });
  }

  /**
   * デバッグ表示オプションの更新
   */
  public updateDisplayOptions(options: Partial<DebugDisplayOptions>): void {
    this.displayOptions = { ...this.displayOptions, ...options };

    if (options.logToScreen !== undefined) {
      if (options.logToScreen && !this.debugOverlay) {
        this.initializeDebugOverlay();
      } else if (!options.logToScreen && this.debugOverlay) {
        this.debugOverlay.destroy();
        this.debugOverlay = undefined;
      }
    }
  }

  /**
   * デバッグ情報のクリア
   */
  public clearDebugInfo(): void {
    this.debugInfo = [];
    this.performanceMetrics = {
      rangeCalculationTime: [],
      damageCalculationTime: [],
      animationTime: [],
      totalBattleTime: [],
    };

    if (this.debugOverlay) {
      this.debugOverlay.removeAll(true);
    }

    console.log('[BattleDebugManager] Debug info cleared');
  }

  /**
   * デバッグレポートの生成
   */
  public generateDebugReport(): string {
    let report = '=== 戦闘デバッグレポート ===\n\n';

    // パフォーマンスメトリクス
    report += '【パフォーマンスメトリクス】\n';
    report += `攻撃範囲計算: 平均 ${this.getAverageTime(this.performanceMetrics.rangeCalculationTime)}ms\n`;
    report += `ダメージ計算: 平均 ${this.getAverageTime(this.performanceMetrics.damageCalculationTime)}ms\n`;
    report += `アニメーション: 平均 ${this.getAverageTime(this.performanceMetrics.animationTime)}ms\n`;
    report += `総戦闘時間: 平均 ${this.getAverageTime(this.performanceMetrics.totalBattleTime)}ms\n\n`;

    // バランス分析
    report += this.balanceTool.generateBattleReport();

    // 最近のデバッグ情報
    report += '\n【最近のデバッグ情報】\n';
    const recentDebugInfo = this.debugInfo.slice(-20);
    recentDebugInfo.forEach((info, index) => {
      const time = new Date(info.timestamp).toLocaleTimeString();
      report += `${index + 1}. ${time} ${info.phase}`;

      if (info.duration) {
        report += ` (${info.duration}ms)`;
      }

      if (info.error) {
        report += ` ERROR: ${info.error}`;
      }

      report += '\n';
    });

    return report;
  }

  /**
   * バランスツールの取得
   */
  public getBalanceTool(): BattleBalanceTool {
    return this.balanceTool;
  }

  /**
   * デバッグ情報の取得
   */
  public getDebugInfo(): BattleDebugInfo[] {
    return [...this.debugInfo];
  }

  /**
   * パフォーマンスメトリクスの取得
   */
  public getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }
}
