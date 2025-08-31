# 職業システム包括的テストスイート

## 概要

この文書は、職業・ランクアップシステムの包括的テストスイートの構成と実行方法を説明します。

## テストスイート構成

### 1. ユニットテスト

- **場所**: `tests/game/systems/`
- **対象**: 個別のクラスとメソッド
- **ファイル**:
  - `JobSystem.test.ts` - メインシステムのテスト
  - `JobManager.test.ts` - 職業管理のテスト
  - `RoseEssenceManager.test.ts` - 薔薇の力管理のテスト

### 2. 統合テスト

- **場所**: `tests/integration/`
- **対象**: システム間の連携
- **ファイル**:
  - `JobSystemComprehensiveIntegration.test.ts` - 包括的統合テスト
  - `JobSystemE2E.test.ts` - エンドツーエンドテスト

### 3. 要件カバレッジテスト

- **場所**: `tests/comprehensive/`
- **対象**: 要件書の全要件検証
- **ファイル**:
  - `JobSystemRequirementsCoverage.test.ts` - 要件カバレッジテスト

### 4. パフォーマンステスト

- **場所**: `tests/performance/`
- **対象**: 性能要件の検証
- **ファイル**:
  - `JobSystemBenchmark.test.ts` - パフォーマンステスト

### 5. アクセシビリティテスト

- **場所**: `tests/accessibility/`
- **対象**: UIアクセシビリティの検証
- **ファイル**:
  - `JobSystemAccessibility.test.ts` - アクセシビリティテスト

## テスト実行方法

### 全テスト実行

```bash
npm test
```

### 職業システム関連テストのみ実行

```bash
npm test -- --testPathPattern="Job"
```

### カバレッジ付きテスト実行

```bash
npm run test:coverage
```

### 特定のテストスイート実行

```bash
# ユニットテスト
npm test tests/game/systems/JobSystem.test.ts

# 統合テスト
npm test tests/integration/JobSystemComprehensiveIntegration.test.ts

# 要件カバレッジテスト
npm test tests/comprehensive/JobSystemRequirementsCoverage.test.ts

# パフォーマンステスト
npm test tests/performance/JobSystemBenchmark.test.ts

# アクセシビリティテスト
npm test tests/accessibility/JobSystemAccessibility.test.ts
```

## テストカバレッジ目標

### コードカバレッジ

- **ライン カバレッジ**: 90%以上
- **ブランチ カバレッジ**: 85%以上
- **関数 カバレッジ**: 95%以上
- **ステートメント カバレッジ**: 90%以上

### 要件カバレッジ

- **要件1 (職業システム基盤)**: 100%
- **要件2 (職業データ管理)**: 100%
- **要件3 (職業の視覚表現)**: 100%
- **要件4 (薔薇の力管理システム)**: 100%
- **要件5 (ランクアップシステム)**: 100%
- **要件6 (職業変更システム)**: 100%
- **要件7 (職業間の相互作用)**: 100%
- **要件8 (パフォーマンスと最適化)**: 100%

## テスト品質指標

### パフォーマンス指標

- **初期化時間**: 2秒以内
- **職業変更時間**: 1秒以内
- **統計計算時間**: 1ms以内（平均）
- **メモリ使用量**: 50MB以下（1000キャラクター）

### 信頼性指標

- **テスト成功率**: 99%以上
- **エラー回復率**: 100%
- **データ整合性**: 100%

### アクセシビリティ指標

- **WCAG 2.1 AA準拠**: 100%
- **キーボードナビゲーション**: 100%
- **スクリーンリーダー対応**: 100%

## テストデータ

### モックデータ

- **職業データ**: 戦士、魔法使い、弓使いの3職業
- **薔薇の力データ**: 初期値100、各種コスト設定
- **キャラクターデータ**: レベル1-10の範囲

### テストシナリオ

1. **新規キャラクター作成と職業割り当て**
2. **ボス撃破と薔薇の力獲得**
3. **職業ランクアップ**
4. **職業変更**
5. **複数キャラクターの管理**
6. **エラーハンドリング**
7. **パフォーマンス負荷**
8. **アクセシビリティ機能**

## 継続的インテグレーション

### GitHub Actions

```yaml
name: Job System Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:job-system
      - run: npm run test:coverage
```

### テスト結果レポート

- **カバレッジレポート**: HTML形式で出力
- **パフォーマンスレポート**: ベンチマーク結果をJSON出力
- **アクセシビリティレポート**: WCAG準拠状況を出力

## トラブルシューティング

### よくある問題

#### テストタイムアウト

```bash
# タイムアウト時間を延長
npm test -- --testTimeout=10000
```

#### メモリ不足

```bash
# Node.jsメモリ制限を増加
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

#### モック関連エラー

```bash
# モックをクリア
npm test -- --clearMocks
```

### デバッグ方法

#### 詳細ログ出力

```bash
DEBUG=job-system:* npm test
```

#### 特定テストのデバッグ

```bash
npm test -- --verbose tests/game/systems/JobSystem.test.ts
```

## 品質保証チェックリスト

### テスト実行前

- [ ] 全依存関係がインストール済み
- [ ] テストデータが最新
- [ ] モックが適切に設定済み

### テスト実行後

- [ ] 全テストが成功
- [ ] カバレッジ目標を達成
- [ ] パフォーマンス要件を満たす
- [ ] アクセシビリティ要件を満たす

### リリース前

- [ ] 全テストスイートが成功
- [ ] 要件カバレッジが100%
- [ ] パフォーマンステストが合格
- [ ] アクセシビリティテストが合格
- [ ] 統合テストが成功
- [ ] E2Eテストが成功

## メンテナンス

### 定期的な更新

- **月次**: テストデータの更新
- **四半期**: パフォーマンス基準の見直し
- **半年**: アクセシビリティ要件の更新

### テスト追加のガイドライン

1. 新機能追加時は対応するテストを作成
2. バグ修正時は回帰テストを追加
3. パフォーマンス改善時はベンチマークを更新
4. UI変更時はアクセシビリティテストを更新

この包括的テストスイートにより、職業システムの品質と信頼性を確保します。
