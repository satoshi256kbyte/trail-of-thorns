# セキュリティガイド

## 基本方針

### セキュリティファースト

- **設計段階からセキュリティを考慮**: 後付けではなく、最初からセキュアな設計を行う
- **最小権限の原則**: 必要最小限の権限のみを付与
- **多層防御**: 複数のセキュリティ対策を組み合わせる
- **継続的監視**: セキュリティ状況の定期的な確認と改善

## 機密情報管理

### ハードコーディング禁止

```typescript
// ❌ 悪い例：機密情報をコードに直接記述
const API_KEY = 'sk-1234567890abcdef';
const DATABASE_PASSWORD = 'mypassword123';

// ✅ 良い例：環境変数から取得
const API_KEY = process.env.API_KEY;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;
```

### 環境変数の管理

```bash
# .env.example（リポジトリに含める）
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
AWS_REGION=ap-northeast-1

# .env（リポジトリに含めない）
API_KEY=actual_secret_key
DATABASE_URL=actual_database_url
AWS_REGION=ap-northeast-1
```

### AWS Secrets Manager活用

```typescript
// AWS Secrets Managerから機密情報を取得
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: 'ap-northeast-1' });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    return response.SecretString || '';
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}

// 使用例
const dbPassword = await getSecret('prod/database/password');
```

## リポジトリ管理

### .gitignoreの設定

```gitignore
# 機密情報ファイル
.env
.env.local
.env.production
.env.staging

# AWS認証情報
.aws/
aws-credentials.json

# 秘密鍵
*.pem
*.key
id_rsa*

# 設定ファイル
config/secrets.json
config/production.json

# ログファイル（機密情報が含まれる可能性）
logs/
*.log

# データベースファイル
*.db
*.sqlite
```

### 機密情報の検出

```bash
# git-secretsを使用した機密情報の検出
git secrets --register-aws
git secrets --install
git secrets --scan
```

## データ保護

### 暗号化

#### 保存時の暗号化

```typescript
// プレイヤーデータの暗号化保存
import crypto from 'crypto';

class SecureStorage {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor(secretKey: string) {
    this.secretKey = crypto.scryptSync(secretKey, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('additional-data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

#### 転送時の暗号化

```typescript
// HTTPS通信の強制
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// セキュリティヘッダーの設定
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### アクセス制御

#### IAMロールの設定

```typescript
// CDKでのIAMロール定義
const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
  inlinePolicies: {
    DynamoDBAccess: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
          resources: [playerDataTable.tableArn],
        }),
      ],
    }),
  },
});
```

#### API認証・認可

```typescript
// JWT トークンベースの認証
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user as { id: string; email: string };
    next();
  });
};

// 使用例
app.get('/api/player-data', authenticateToken, (req: AuthenticatedRequest, res) => {
  // 認証されたユーザーのみアクセス可能
  const userId = req.user!.id;
  // プレイヤーデータの取得処理
});
```

## 入力検証・サニタイゼーション

### データバリデーション

```typescript
// Zodを使用した入力検証
import { z } from 'zod';

const PlayerDataSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  level: z.number().int().min(1).max(100),
  stats: z.object({
    hp: z.number().int().min(1).max(9999),
    mp: z.number().int().min(0).max(999),
  }),
});

// API エンドポイントでの使用
app.post('/api/player-data', (req, res) => {
  try {
    const validatedData = PlayerDataSchema.parse(req.body);
    // 検証済みデータの処理
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### SQLインジェクション対策

```typescript
// パラメータ化クエリの使用
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const getPlayerData = async (userId: string, saveSlot: number) => {
  const client = new DynamoDBClient({ region: 'ap-northeast-1' });

  const command = new GetItemCommand({
    TableName: 'PlayerSaveData',
    Key: {
      userId: { S: userId },
      saveSlot: { N: saveSlot.toString() },
    },
  });

  return await client.send(command);
};
```

## 監査・ログ

### セキュリティログ

```typescript
// セキュリティイベントのログ記録
class SecurityLogger {
  static logAuthAttempt(userId: string, success: boolean, ip: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'auth_attempt',
      userId,
      success,
      ip,
      userAgent: req.headers['user-agent'],
    };

    console.log(JSON.stringify(logEntry));

    // CloudWatch Logsに送信
    // 失敗時はアラート送信
    if (!success) {
      this.sendSecurityAlert('Failed authentication attempt', logEntry);
    }
  }

  static logDataAccess(userId: string, resource: string, action: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'data_access',
      userId,
      resource,
      action,
    };

    console.log(JSON.stringify(logEntry));
  }

  private static sendSecurityAlert(message: string, details: any) {
    // SNS経由でアラート送信
    // Slackやメール通知
  }
}
```

### CloudTrail設定

```typescript
// CDKでのCloudTrail設定
const trail = new cloudtrail.Trail(this, 'SecurityAuditTrail', {
  bucket: auditLogsBucket,
  includeGlobalServiceEvents: true,
  isMultiRegionTrail: true,
  enableFileValidation: true,
});

// 重要なイベントのみを記録
trail.addEventSelector(cloudtrail.DataResourceType.S3_OBJECT, [`${websiteBucket.bucketArn}/*`]);
```

## 脆弱性対策

### 依存関係の管理

```bash
# 脆弱性スキャン
npm audit
npm audit fix

# 定期的な依存関係更新
npm update
npm outdated
```

### セキュリティヘッダー

```typescript
// Express.jsでのセキュリティヘッダー設定
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

## インシデント対応

### セキュリティインシデント対応手順

1. **検知・報告**
   - 自動監視システムによる検知
   - 手動報告の受付
   - 初期トリアージ

2. **初期対応**
   - インシデントの確認と分類
   - 影響範囲の特定
   - 緊急対応の実施

3. **調査・分析**
   - ログ分析
   - 原因究明
   - 被害状況の確認

4. **復旧・改善**
   - システム復旧
   - セキュリティ対策の強化
   - 再発防止策の実施

### 緊急連絡先

```typescript
// 緊急時の連絡先設定
const SECURITY_CONTACTS = {
  primary: process.env.SECURITY_TEAM_EMAIL,
  secondary: process.env.ADMIN_EMAIL,
  slack: process.env.SECURITY_SLACK_WEBHOOK,
};

const notifySecurityIncident = async (incident: SecurityIncident) => {
  // メール通知
  await sendEmail(SECURITY_CONTACTS.primary, incident);

  // Slack通知
  await sendSlackNotification(SECURITY_CONTACTS.slack, incident);

  // SMS通知（重大インシデントの場合）
  if (incident.severity === 'critical') {
    await sendSMS(SECURITY_CONTACTS.emergency_phone, incident);
  }
};
```

## 定期的なセキュリティチェック

### チェックリスト

- [ ] 依存関係の脆弱性スキャン実施
- [ ] アクセスログの確認
- [ ] 不正アクセス試行の監視
- [ ] 機密情報の漏洩チェック
- [ ] IAMロール・ポリシーの見直し
- [ ] セキュリティパッチの適用
- [ ] バックアップの整合性確認

### 自動化スクリプト

```bash
#!/bin/bash
# security-check.sh

echo "=== セキュリティチェック開始 ==="

# 依存関係の脆弱性チェック
echo "依存関係の脆弱性チェック..."
npm audit

# Git secretsスキャン
echo "機密情報漏洩チェック..."
git secrets --scan

# ログファイルの権限チェック
echo "ログファイル権限チェック..."
find logs/ -type f -exec ls -la {} \;

echo "=== セキュリティチェック完了 ==="
```

このセキュリティガイドに従うことで、プロジェクトのセキュリティレベルを維持し、機密情報を適切に保護できます。
