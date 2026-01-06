/**
 * ChapterStageDebugManager - 章・ステージ管理システムのデバッグツール
 *
 * 開発支援機能:
 * - 章・ステージ状態の可視化
 * - パーティ編成のデバッグ表示
 * - 進行状況の手動操作
 * - セーブデータの検証ツール
 * - コンソールコマンドによる操作
 */

import * as Phaser from 'phaser';

/**
 * 章状態のデバッグ情報
 */
export interface ChapterDebugInfo {
  chapterId: string;
  chapterName: string;
  currentStageIndex: number;
  totalStages: number;
  completedStages: number;
  lostCharacters: string[];
  availableCharacters: string[];
  partyMembers: string[];
  isCompleted: boolean;
  playTime: number;
}

/**
 * ステージ進行状況のデバッグ情報
 */
export interface StageProgressDebugInfo {
  stageId: string;
  stageName: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  completionTime?: number;
  unlockCondition: string;
  requiredStages: string[];
}

/**
 * パーティ編成のデバッグ情報
 */
export interface PartyDebugInfo {
  members: Array<{
    id: string;
    name: string;
    level: number;
    job: string;
    isLost: boolean;
  }>;
  maxSize: number;
  currentSize: number;
  validationErrors: string[];
}

/**
 * セーブデータのデバッグ情報
 */
export interface SaveDataDebugInfo {
  slotId: number;
  version: string;
  timestamp: number;
  isValid: boolean;
  validationErrors: string[];
  dataSize: number;
  chapterInfo: {
    chapterId: string;
    currentStage: number;
    completedStages: number;
  };
}

/**
 * デバッグ表示オプション
 */
export interface ChapterStageDebugOptions {
  showChapterState: boolean;
  showStageProgress: boolean;
  showPartyInfo: boolean;
  showSaveDataInfo: boolean;
  showPerformanceMetrics: boolean;
  logToConsole: boolean;
  logToScreen: boolean;
}

/**
 * 章・ステージ管理システムのデバッグマネージャー
 */
export class ChapterStageDebugManager {
  private scene?: Phaser.Scene;
  private isEnabled: boolean = false;

  // デバッグ表示要素
  private debugContainer?: Phaser.GameObjects.Container;
  private debugText?: Phaser.GameObjects.Text;
  private chapterStateText?: Phaser.GameObjects.Text;
  private stageProgressText?: Phaser.GameObjects.Text;
  private partyInfoText?: Phaser.GameObjects.Text;
  private saveDataInfoText?: Phaser.GameObjects.Text;

  // デバッグオプション
  private options: ChapterStageDebugOptions = {
    showChapterState: true,
    showStageProgress: true,
    showPartyInfo: true,
    showSaveDataInfo: true,
    showPerformanceMetrics: true,
    logToConsole: true,
    logToScreen: true,
  };

  // デバッグ情報キャッシュ
  private chapterDebugInfo?: ChapterDebugInfo;
  private stageProgressDebugInfo: StageProgressDebugInfo[] = [];
  private partyDebugInfo?: PartyDebugInfo;
  private saveDataDebugInfo: SaveDataDebugInfo[] = [];

  // パフォーマンスメトリクス
  private performanceMetrics = {
    lastSaveTime: 0,
    lastLoadTime: 0,
    lastValidationTime: 0,
    averageSaveTime: 0,
    averageLoadTime: 0,
    totalSaves: 0,
    totalLoads: 0,
  };

  /**
   * コンストラクタ
   * @param scene - Phaserシーンインスタンス（オプション）
   */
  constructor(scene?: Phaser.Scene) {
    this.scene = scene;
    this.setupConsoleCommands();
    console.log('ChapterStageDebugManager: 初期化完了');
  }

  /**
   * デバッグモードを有効化
   */
  public enableDebugMode(): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    console.log('ChapterStageDebugManager: デバッグモード有効化');

    if (this.scene) {
      this.createDebugContainer();
    }

    // イベント発行
    if (this.scene) {
      this.scene.events.emit('chapter-stage-debug-enabled');
    }
  }

  /**
   * デバッグモードを無効化
   */
  public disableDebugMode(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    console.log('ChapterStageDebugManager: デバッグモード無効化');

    this.clearDebugDisplay();

    // イベント発行
    if (this.scene) {
      this.scene.events.emit('chapter-stage-debug-disabled');
    }
  }

  /**
   * デバッグモードの切り替え
   */
  public toggleDebugMode(): void {
    if (this.isEnabled) {
      this.disableDebugMode();
    } else {
      this.enableDebugMode();
    }
  }

  /**
   * 章状態の更新
   * @param chapterInfo - 章のデバッグ情報
   */
  public updateChapterState(chapterInfo: ChapterDebugInfo): void {
    this.chapterDebugInfo = chapterInfo;

    if (this.options.logToConsole) {
      console.log('ChapterStageDebugManager: 章状態更新', chapterInfo);
    }

    if (this.isEnabled && this.options.showChapterState) {
      this.updateChapterStateDisplay();
    }
  }

  /**
   * ステージ進行状況の更新
   * @param stageProgress - ステージ進行状況のデバッグ情報配列
   */
  public updateStageProgress(stageProgress: StageProgressDebugInfo[]): void {
    this.stageProgressDebugInfo = stageProgress;

    if (this.options.logToConsole) {
      console.log('ChapterStageDebugManager: ステージ進行状況更新', stageProgress);
    }

    if (this.isEnabled && this.options.showStageProgress) {
      this.updateStageProgressDisplay();
    }
  }

  /**
   * パーティ情報の更新
   * @param partyInfo - パーティのデバッグ情報
   */
  public updatePartyInfo(partyInfo: PartyDebugInfo): void {
    this.partyDebugInfo = partyInfo;

    if (this.options.logToConsole) {
      console.log('ChapterStageDebugManager: パーティ情報更新', partyInfo);
    }

    if (this.isEnabled && this.options.showPartyInfo) {
      this.updatePartyInfoDisplay();
    }
  }

  /**
   * セーブデータ情報の更新
   * @param saveDataInfo - セーブデータのデバッグ情報配列
   */
  public updateSaveDataInfo(saveDataInfo: SaveDataDebugInfo[]): void {
    this.saveDataDebugInfo = saveDataInfo;

    if (this.options.logToConsole) {
      console.log('ChapterStageDebugManager: セーブデータ情報更新', saveDataInfo);
    }

    if (this.isEnabled && this.options.showSaveDataInfo) {
      this.updateSaveDataInfoDisplay();
    }
  }

  /**
   * セーブ操作のパフォーマンス記録
   * @param duration - 処理時間（ミリ秒）
   */
  public recordSavePerformance(duration: number): void {
    this.performanceMetrics.lastSaveTime = duration;
    this.performanceMetrics.totalSaves++;
    this.performanceMetrics.averageSaveTime =
      (this.performanceMetrics.averageSaveTime * (this.performanceMetrics.totalSaves - 1) +
        duration) /
      this.performanceMetrics.totalSaves;

    if (this.options.logToConsole) {
      console.log(
        `ChapterStageDebugManager: セーブ完了 ${duration.toFixed(2)}ms (平均: ${this.performanceMetrics.averageSaveTime.toFixed(2)}ms)`
      );
    }
  }

  /**
   * ロード操作のパフォーマンス記録
   * @param duration - 処理時間（ミリ秒）
   */
  public recordLoadPerformance(duration: number): void {
    this.performanceMetrics.lastLoadTime = duration;
    this.performanceMetrics.totalLoads++;
    this.performanceMetrics.averageLoadTime =
      (this.performanceMetrics.averageLoadTime * (this.performanceMetrics.totalLoads - 1) +
        duration) /
      this.performanceMetrics.totalLoads;

    if (this.options.logToConsole) {
      console.log(
        `ChapterStageDebugManager: ロード完了 ${duration.toFixed(2)}ms (平均: ${this.performanceMetrics.averageLoadTime.toFixed(2)}ms)`
      );
    }
  }

  /**
   * バリデーション操作のパフォーマンス記録
   * @param duration - 処理時間（ミリ秒）
   */
  public recordValidationPerformance(duration: number): void {
    this.performanceMetrics.lastValidationTime = duration;

    if (this.options.logToConsole) {
      console.log(`ChapterStageDebugManager: バリデーション完了 ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * デバッグレポートの生成
   * @returns デバッグレポート文字列
   */
  public generateDebugReport(): string {
    let report = '=== 章・ステージ管理システム デバッグレポート ===\n\n';

    // 章状態
    if (this.chapterDebugInfo) {
      report += '【章状態】\n';
      report += `章ID: ${this.chapterDebugInfo.chapterId}\n`;
      report += `章名: ${this.chapterDebugInfo.chapterName}\n`;
      report += `現在ステージ: ${this.chapterDebugInfo.currentStageIndex + 1}/${this.chapterDebugInfo.totalStages}\n`;
      report += `完了ステージ: ${this.chapterDebugInfo.completedStages}\n`;
      report += `ロストキャラクター: ${this.chapterDebugInfo.lostCharacters.length}人\n`;
      report += `利用可能キャラクター: ${this.chapterDebugInfo.availableCharacters.length}人\n`;
      report += `パーティメンバー: ${this.chapterDebugInfo.partyMembers.length}人\n`;
      report += `章完了: ${this.chapterDebugInfo.isCompleted ? 'はい' : 'いいえ'}\n`;
      report += `プレイ時間: ${this.formatPlayTime(this.chapterDebugInfo.playTime)}\n\n`;
    }

    // ステージ進行状況
    if (this.stageProgressDebugInfo.length > 0) {
      report += '【ステージ進行状況】\n';
      this.stageProgressDebugInfo.forEach((stage, index) => {
        report += `${index + 1}. ${stage.stageName} (${stage.stageId})\n`;
        report += `   解放: ${stage.isUnlocked ? 'はい' : 'いいえ'}\n`;
        report += `   完了: ${stage.isCompleted ? 'はい' : 'いいえ'}\n`;
        if (stage.completionTime) {
          report += `   クリア時間: ${this.formatPlayTime(stage.completionTime)}\n`;
        }
        report += `   解放条件: ${stage.unlockCondition}\n`;
        if (stage.requiredStages.length > 0) {
          report += `   必要ステージ: ${stage.requiredStages.join(', ')}\n`;
        }
      });
      report += '\n';
    }

    // パーティ情報
    if (this.partyDebugInfo) {
      report += '【パーティ情報】\n';
      report += `パーティサイズ: ${this.partyDebugInfo.currentSize}/${this.partyDebugInfo.maxSize}\n`;
      if (this.partyDebugInfo.members.length > 0) {
        report += 'メンバー:\n';
        this.partyDebugInfo.members.forEach((member, index) => {
          report += `  ${index + 1}. ${member.name} (Lv.${member.level} ${member.job})`;
          if (member.isLost) {
            report += ' [ロスト]';
          }
          report += '\n';
        });
      }
      if (this.partyDebugInfo.validationErrors.length > 0) {
        report += 'バリデーションエラー:\n';
        this.partyDebugInfo.validationErrors.forEach(error => {
          report += `  - ${error}\n`;
        });
      }
      report += '\n';
    }

    // セーブデータ情報
    if (this.saveDataDebugInfo.length > 0) {
      report += '【セーブデータ情報】\n';
      this.saveDataDebugInfo.forEach(saveData => {
        report += `スロット ${saveData.slotId}:\n`;
        report += `  バージョン: ${saveData.version}\n`;
        report += `  タイムスタンプ: ${new Date(saveData.timestamp).toLocaleString()}\n`;
        report += `  有効: ${saveData.isValid ? 'はい' : 'いいえ'}\n`;
        report += `  データサイズ: ${(saveData.dataSize / 1024).toFixed(2)}KB\n`;
        report += `  章: ${saveData.chapterInfo.chapterId}\n`;
        report += `  ステージ: ${saveData.chapterInfo.currentStage + 1}\n`;
        report += `  完了ステージ: ${saveData.chapterInfo.completedStages}\n`;
        if (saveData.validationErrors.length > 0) {
          report += '  エラー:\n';
          saveData.validationErrors.forEach(error => {
            report += `    - ${error}\n`;
          });
        }
      });
      report += '\n';
    }

    // パフォーマンスメトリクス
    report += '【パフォーマンスメトリクス】\n';
    report += `最終セーブ時間: ${this.performanceMetrics.lastSaveTime.toFixed(2)}ms\n`;
    report += `平均セーブ時間: ${this.performanceMetrics.averageSaveTime.toFixed(2)}ms\n`;
    report += `総セーブ回数: ${this.performanceMetrics.totalSaves}\n`;
    report += `最終ロード時間: ${this.performanceMetrics.lastLoadTime.toFixed(2)}ms\n`;
    report += `平均ロード時間: ${this.performanceMetrics.averageLoadTime.toFixed(2)}ms\n`;
    report += `総ロード回数: ${this.performanceMetrics.totalLoads}\n`;
    report += `最終バリデーション時間: ${this.performanceMetrics.lastValidationTime.toFixed(2)}ms\n`;

    return report;
  }

  /**
   * デバッグ表示オプションの更新
   * @param options - 更新するオプション
   */
  public updateOptions(options: Partial<ChapterStageDebugOptions>): void {
    this.options = { ...this.options, ...options };

    if (this.isEnabled) {
      this.updateAllDisplays();
    }
  }

  /**
   * デバッグコンテナの作成
   */
  private createDebugContainer(): void {
    if (!this.scene) {
      return;
    }

    this.debugContainer = this.scene.add.container(10, 10).setScrollFactor(0).setDepth(10000);

    let yOffset = 0;
    const lineHeight = 15;

    // 章状態表示
    if (this.options.showChapterState) {
      this.chapterStateText = this.scene.add
        .text(0, yOffset, '', {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: { x: 5, y: 3 },
        })
        .setScrollFactor(0);
      this.debugContainer.add(this.chapterStateText);
      yOffset += 100;
    }

    // ステージ進行状況表示
    if (this.options.showStageProgress) {
      this.stageProgressText = this.scene.add
        .text(0, yOffset, '', {
          fontSize: '10px',
          color: '#88ff88',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: { x: 5, y: 3 },
        })
        .setScrollFactor(0);
      this.debugContainer.add(this.stageProgressText);
      yOffset += 150;
    }

    // パーティ情報表示
    if (this.options.showPartyInfo) {
      this.partyInfoText = this.scene.add
        .text(0, yOffset, '', {
          fontSize: '10px',
          color: '#ffff88',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: { x: 5, y: 3 },
        })
        .setScrollFactor(0);
      this.debugContainer.add(this.partyInfoText);
      yOffset += 100;
    }

    // セーブデータ情報表示
    if (this.options.showSaveDataInfo) {
      this.saveDataInfoText = this.scene.add
        .text(0, yOffset, '', {
          fontSize: '10px',
          color: '#ff88ff',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: { x: 5, y: 3 },
        })
        .setScrollFactor(0);
      this.debugContainer.add(this.saveDataInfoText);
    }

    this.updateAllDisplays();
  }

  /**
   * 全ての表示を更新
   */
  private updateAllDisplays(): void {
    this.updateChapterStateDisplay();
    this.updateStageProgressDisplay();
    this.updatePartyInfoDisplay();
    this.updateSaveDataInfoDisplay();
  }

  /**
   * 章状態表示の更新
   */
  private updateChapterStateDisplay(): void {
    if (!this.chapterStateText || !this.chapterDebugInfo) {
      return;
    }

    const info = this.chapterDebugInfo;
    const text = [
      '【章状態】',
      `章: ${info.chapterName} (${info.chapterId})`,
      `ステージ: ${info.currentStageIndex + 1}/${info.totalStages} (完了: ${info.completedStages})`,
      `ロスト: ${info.lostCharacters.length}人`,
      `利用可能: ${info.availableCharacters.length}人`,
      `パーティ: ${info.partyMembers.length}人`,
      `プレイ時間: ${this.formatPlayTime(info.playTime)}`,
    ].join('\n');

    this.chapterStateText.setText(text);
  }

  /**
   * ステージ進行状況表示の更新
   */
  private updateStageProgressDisplay(): void {
    if (!this.stageProgressText || this.stageProgressDebugInfo.length === 0) {
      return;
    }

    const lines = ['【ステージ進行状況】'];
    this.stageProgressDebugInfo.slice(0, 8).forEach((stage, index) => {
      const status = stage.isCompleted ? '✓' : stage.isUnlocked ? '○' : '×';
      lines.push(`${status} ${stage.stageName}`);
    });

    if (this.stageProgressDebugInfo.length > 8) {
      lines.push(`... 他 ${this.stageProgressDebugInfo.length - 8} ステージ`);
    }

    this.stageProgressText.setText(lines.join('\n'));
  }

  /**
   * パーティ情報表示の更新
   */
  private updatePartyInfoDisplay(): void {
    if (!this.partyInfoText || !this.partyDebugInfo) {
      return;
    }

    const info = this.partyDebugInfo;
    const lines = [`【パーティ】 ${info.currentSize}/${info.maxSize}`];

    info.members.forEach((member, index) => {
      const lostMark = member.isLost ? '[ロスト]' : '';
      lines.push(`${index + 1}. ${member.name} Lv.${member.level} ${lostMark}`);
    });

    if (info.validationErrors.length > 0) {
      lines.push('エラー:');
      info.validationErrors.forEach(error => {
        lines.push(`  ${error}`);
      });
    }

    this.partyInfoText.setText(lines.join('\n'));
  }

  /**
   * セーブデータ情報表示の更新
   */
  private updateSaveDataInfoDisplay(): void {
    if (!this.saveDataInfoText || this.saveDataDebugInfo.length === 0) {
      return;
    }

    const lines = ['【セーブデータ】'];
    this.saveDataDebugInfo.slice(0, 3).forEach(saveData => {
      const status = saveData.isValid ? '✓' : '×';
      const size = (saveData.dataSize / 1024).toFixed(1);
      lines.push(
        `${status} スロット${saveData.slotId}: ${saveData.chapterInfo.chapterId} (${size}KB)`
      );
    });

    this.saveDataInfoText.setText(lines.join('\n'));
  }

  /**
   * デバッグ表示のクリア
   */
  private clearDebugDisplay(): void {
    if (this.debugContainer) {
      this.debugContainer.destroy();
      this.debugContainer = undefined;
    }

    this.chapterStateText = undefined;
    this.stageProgressText = undefined;
    this.partyInfoText = undefined;
    this.saveDataInfoText = undefined;
  }

  /**
   * プレイ時間のフォーマット
   * @param milliseconds - ミリ秒
   * @returns フォーマットされた時間文字列
   */
  private formatPlayTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * コンソールコマンドのセットアップ
   */
  private setupConsoleCommands(): void {
    (window as any).chapterStageDebug = {
      enable: () => this.enableDebugMode(),
      disable: () => this.disableDebugMode(),
      toggle: () => this.toggleDebugMode(),

      report: () => {
        const report = this.generateDebugReport();
        console.log(report);
        return report;
      },

      showChapter: () => {
        if (this.chapterDebugInfo) {
          console.table(this.chapterDebugInfo);
        } else {
          console.log('章情報がありません');
        }
      },

      showStages: () => {
        if (this.stageProgressDebugInfo.length > 0) {
          console.table(this.stageProgressDebugInfo);
        } else {
          console.log('ステージ情報がありません');
        }
      },

      showParty: () => {
        if (this.partyDebugInfo) {
          console.table(this.partyDebugInfo.members);
        } else {
          console.log('パーティ情報がありません');
        }
      },

      showSaveData: () => {
        if (this.saveDataDebugInfo.length > 0) {
          console.table(this.saveDataDebugInfo);
        } else {
          console.log('セーブデータ情報がありません');
        }
      },

      metrics: () => {
        console.table(this.performanceMetrics);
      },

      options: (newOptions?: Partial<ChapterStageDebugOptions>) => {
        if (newOptions) {
          this.updateOptions(newOptions);
          console.log('デバッグオプションを更新しました:', this.options);
        } else {
          console.table(this.options);
        }
      },

      help: () => {
        console.log('章・ステージ管理デバッグコマンド:');
        console.log('  chapterStageDebug.enable() - デバッグモード有効化');
        console.log('  chapterStageDebug.disable() - デバッグモード無効化');
        console.log('  chapterStageDebug.toggle() - デバッグモード切り替え');
        console.log('  chapterStageDebug.report() - デバッグレポート生成');
        console.log('  chapterStageDebug.showChapter() - 章情報表示');
        console.log('  chapterStageDebug.showStages() - ステージ情報表示');
        console.log('  chapterStageDebug.showParty() - パーティ情報表示');
        console.log('  chapterStageDebug.showSaveData() - セーブデータ情報表示');
        console.log('  chapterStageDebug.metrics() - パフォーマンスメトリクス表示');
        console.log('  chapterStageDebug.options(newOptions?) - オプション表示/更新');
        console.log('  chapterStageDebug.help() - ヘルプ表示');
      },
    };

    console.log(
      'ChapterStageDebugManager: コンソールコマンド登録完了。"chapterStageDebug.help()" でヘルプを表示'
    );
  }
}
