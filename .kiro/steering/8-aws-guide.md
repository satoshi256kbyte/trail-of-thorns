# AWS 利用ガイド

インフラ環境にはAWSを用いる。

## 基本方針

### Infrastructure as Code (IaC)

- **AWS CDK**: 全てのAWSリソースはCDKで管理
- **バージョン管理**: インフラ構成もGitで管理
- **環境分離**: loca/dev/stg/prod環境の明確な分離
- **手動デプロイ禁止**: トラブル調査時以外はAWS CDKを介さない変更は禁止

### AWS リソース命名規約

#### 基本命名規則

AWS リソースのリソース名は、以下の規則に従って命名してください。
連番は同名のリソースが複数存在する場合に使用します。

`{サービス名}-{環境名}-{AWSリソース種類}-{用途}-{連番}`

環境名は下記のいずれかです。

- `local`：ローカル開発環境
- `dev`：開発環境
- `stg`：ステージング環境
- `prd`：本番環境

#### IAMロール、ポリシーの命名規則

特定の AWS リソースに紐づく IAM ロールやポリシーは、以下の規則に従って命名してください。

`{サービス名}-{環境名}-{AWSリソース種類}-{用途}-role`
`{サービス名}-{環境名}-{AWSリソース種類}-{用途}-policy`

## AWS インフラ構成

### 静的ウェブサイトホスティング

```typescript
// cdk/lib/game-hosting-stack.ts
export class GameHostingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3バケット（静的ウェブサイトホスティング）
    const websiteBucket = new s3.Bucket(this, 'GameWebsiteBucket', {
      bucketName: `phaser-rpg-${props?.env?.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'GameDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });
  }
}
```

### データベース・API構成

```typescript
// cdk/lib/database-stack.ts
export class DatabaseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル
    const playerDataTable = new dynamodb.Table(this, 'PlayerDataTable', {
      tableName: 'PlayerSaveData',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'saveSlot', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda 関数
    const savePlayerDataFunction = new lambda.Function(this, 'SavePlayerData', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'savePlayerData.handler',
      code: lambda.Code.fromAsset('server/dist'),
      environment: {
        TABLE_NAME: playerDataTable.tableName,
      },
    });

    playerDataTable.grantReadWriteData(savePlayerDataFunction);
  }
}
```

## CI/CD パイプライン

### GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy Game

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Deploy CDK
        run: npm run cdk:deploy

      - name: Upload to S3
        run: aws s3 sync dist/ s3://${{ secrets.S3_BUCKET_NAME }} --delete

      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

### 環境別デプロイ

- **Development**: `cdk deploy GameHostingStack-dev`
- **Staging**: `cdk deploy GameHostingStack-staging`
- **Production**: `cdk deploy GameHostingStack-prod`

## セキュリティ設定

### IAM ポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::phaser-rpg-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "*"
    }
  ]
}
```

### 機密情報管理

- **AWS Secrets Manager**: データベース接続情報
- **GitHub Secrets**: CI/CD用認証情報
- **環境変数**: 設定値の外部化

### セキュリティヘッダー

```typescript
// CloudFront セキュリティヘッダー
const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
  securityHeadersBehavior: {
    contentTypeOptions: { override: true },
    frameOptions: { frameOption: cloudfront.FrameOptions.DENY, override: true },
    referrerPolicy: {
      referrerPolicy: cloudfront.ReferrerPolicyHeaderValue.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
      override: true,
    },
    strictTransportSecurity: {
      accessControlMaxAge: Duration.seconds(31536000),
      includeSubdomains: true,
      override: true,
    },
  },
});
```

## モニタリング・ログ

### CloudWatch メトリクス

- **S3**: リクエスト数、エラー率
- **CloudFront**: キャッシュヒット率、レスポンス時間
- **Lambda**: 実行時間、エラー率
- **DynamoDB**: 読み書き容量、スロットリング

### アラート設定

```typescript
// CloudWatch アラーム
const errorAlarm = new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: distribution.metricErrorRate(),
  threshold: 5,
  evaluationPeriods: 2,
});

errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
```

### ログ管理

- **CloudTrail**: API呼び出しログ
- **S3 アクセスログ**: ウェブサイトアクセス記録
- **Lambda ログ**: 関数実行ログ

## コスト最適化

### 無料利用枠活用

- **S3**: 5GB ストレージ
- **CloudFront**: 1TB データ転送
- **Lambda**: 100万リクエスト/月
- **DynamoDB**: 25GB ストレージ

### コスト監視

```typescript
// 予算アラート
const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetName: 'phaser-rpg-monthly',
    budgetLimit: {
      amount: 10,
      unit: 'USD',
    },
    timeUnit: 'MONTHLY',
    budgetType: 'COST',
  },
  notificationsWithSubscribers: [
    {
      notification: {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 80,
      },
      subscribers: [
        {
          subscriptionType: 'EMAIL',
          address: 'admin@example.com',
        },
      ],
    },
  ],
});
```

## デプロイ手順

### 初回セットアップ

1. **AWS CLI設定**: `aws configure`
2. **CDK初期化**: `cdk bootstrap`
3. **依存関係インストール**: `npm install`
4. **環境変数設定**: `.env`ファイル作成

### 通常デプロイ

1. **コードプッシュ**: `git push origin main`
2. **自動テスト**: GitHub Actions実行
3. **自動デプロイ**: CDKスタック更新
4. **動作確認**: デプロイ後の動作テスト

### ロールバック手順

1. **前バージョン特定**: Git履歴確認
2. **コードロールバック**: `git revert`
3. **再デプロイ**: 自動パイプライン実行
4. **動作確認**: ロールバック後の確認

## トラブルシューティング

### よくある問題

- **CloudFrontキャッシュ**: 無効化が必要
- **S3権限エラー**: IAMポリシー確認
- **Lambda タイムアウト**: 実行時間制限調整
- **DynamoDB スロットリング**: 容量設定見直し

### 緊急時対応

1. **サービス停止**: CloudFront無効化
2. **問題調査**: CloudWatchログ確認
3. **修正デプロイ**: 緊急パッチ適用
4. **サービス復旧**: 段階的復旧実施
