# OpenHandsクラウド環境 サーバーアーキテクチャドキュメント

## 1. サーバー構成概要

OpenHandsクラウド環境は、複数のサーバーで構成され、それぞれが特定の役割を担っています。この構成により、スケーラビリティと保守性を確保しています。

| サーバー名 | IPアドレス | 役割 | 実行中のサービス |
|------------|------------|------|------------------|
| **マネージャーサーバー** | 35.78.85.44 | OpenHands EC2マネージャー<br>（ユーザー管理・EC2管理） | - Nginx (Webサーバー)<br>- Node.js API (systemdサービス) |
| **リバースプロキシサーバー** | 35.78.204.42 | サブドメインルーティング<br>（ユーザー環境へのアクセス管理） | - Nginx (リバースプロキシ) |
| **OpenHandsサーバー** | 35.78.243.170 | OpenHandsアプリケーション<br>（AI開発環境） | - OpenHandsアプリケーション<br>- WebSocketサーバー |
| **テスト環境サーバー** | 18.183.29.225 | テスト用OpenHands EC2マネージャー | - Nginx (Webサーバー)<br>- Node.js API (systemdサービス) |

## 2. ドメイン構成

各サーバーは、以下のドメインを通じてアクセスされます：

| ドメイン | 向き先IPアドレス | 提供サービス |
|----------|------------------|--------------|
| teai.io | 35.78.85.44 | OpenHands EC2マネージャー |
| www.teai.io | 35.78.85.44 | OpenHands EC2マネージャー |
| manager.teai.io | 35.78.85.44 | OpenHands EC2マネージャー |
| staging.teai.io | 18.183.29.225 | テスト環境のOpenHands EC2マネージャー |
| user1.teai.io, user2.teai.io, ... | 35.78.204.42 → 35.78.243.170 | ユーザー専用OpenHands環境 |

## 3. サーバー詳細

### 3.1 マネージャーサーバー (35.78.85.44)

**役割**: 
- ユーザー認証・管理
- EC2インスタンスの起動・停止・管理
- 課金・請求管理
- ユーザーダッシュボード

**実行中のサービス**:
- **Nginx**: フロントエンドファイル配信とAPIリクエストのプロキシ
  - 設定ファイル: `/etc/nginx/sites-available/manager.teai.io`
  - ドキュメントルート: `/var/www/manager`

- **Node.js API**: バックエンドAPI
  - 実行ファイル: `/home/ubuntu/simple-server/server.js`
  - systemdサービス: `openhands-api.service`
  - ポート: 3000

### 3.2 リバースプロキシサーバー (35.78.204.42)

**役割**:
- サブドメインベースのルーティング
- ユーザーIDに基づくリクエスト転送
- WebSocketとHTTPリクエストの転送
- アクセス制御とセキュリティ

**実行中のサービス**:
- **Nginx**: リバースプロキシ
  - 設定ファイル: `/etc/nginx/sites-available/teai.io`
  - ルーティングルール:
    - `*.teai.io` → ユーザーサブドメインの処理
    - `manager.teai.io` → マネージャーサーバーへ転送
    - `staging.teai.io` → テスト環境サーバーへ転送
    - `teai.io`, `www.teai.io` → マネージャーサーバーへ転送

### 3.3 OpenHandsサーバー (35.78.243.170)

**役割**:
- OpenHandsアプリケーションの実行
- ユーザーのAI開発環境の提供
- WebSocketによるリアルタイム通信

**実行中のサービス**:
- **OpenHandsアプリケーション**: AI開発環境
  - HTTPポート: 80
  - WebSocketポート: 標準ポート
  - 特殊ポート: 43967（特定の機能用）

### 3.4 テスト環境サーバー (18.183.29.225)

**役割**:
- テスト用OpenHands EC2マネージャー
- 新機能のテスト環境

**実行中のサービス**:
- **Nginx**: フロントエンドファイル配信とAPIリクエストのプロキシ
  - 設定ファイル: `/etc/nginx/sites-available/staging.teai.io`
  - ドキュメントルート: `/var/www/manager`

- **Node.js API**: バックエンドAPI
  - 実行ファイル: `/home/ubuntu/simple-server/server.js`
  - systemdサービス: `openhands-api.service`
  - ポート: 3000

## 4. 通信フロー

### 4.1 ユーザーがteai.io/www.teai.io/manager.teai.ioにアクセスする場合
1. DNSがリクエストをマネージャーサーバー(35.78.85.44)に直接ルーティング
2. マネージャーサーバーのNginxがフロントエンドファイルを提供
3. APIリクエスト(/api/*)は同サーバー上のNode.js APIサービスにプロキシ

### 4.2 ユーザーがstaging.teai.ioにアクセスする場合
1. DNSがリクエストをテスト環境サーバー(18.183.29.225)に直接ルーティング
2. テスト環境サーバーのNginxがフロントエンドファイルを提供
3. APIリクエスト(/api/*)は同サーバー上のNode.js APIサービスにプロキシ

### 4.3 ユーザーがuser1.teai.io（など）にアクセスする場合
1. DNSがリクエストをリバースプロキシサーバー(35.78.204.42)にルーティング
2. リバースプロキシサーバーがサブドメインからユーザーIDを抽出
3. リクエストをOpenHandsサーバー(35.78.243.170)に転送
4. WebSocketリクエストも同様に転送

## 5. ソースコード構成

### 5.1 リポジトリ構成

OpenHandsクラウド環境のソースコードは主に以下のリポジトリに存在します：

| リポジトリ名 | 説明 | 主な機能 |
|--------------|------|----------|
| [openhands-ec2-manager](https://github.com/enablerdao/openhands-ec2-manager) | EC2マネージャー | ユーザー管理、EC2インスタンス管理、課金管理 |
| [OpenHands](https://github.com/All-Hands-AI/OpenHands) | OpenHandsアプリケーション | AI開発環境、コード実行環境 |

### 5.2 openhands-ec2-manager リポジトリの構成

#### ディレクトリ構造

```
openhands-ec2-manager/
├── client/                 # フロントエンドコード
│   ├── public/             # 静的ファイル
│   ├── src/                # Reactソースコード
│   │   ├── components/     # UIコンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── services/       # APIサービス
│   │   ├── utils/          # ユーティリティ関数
│   │   ├── App.js          # メインアプリケーション
│   │   └── index.js        # エントリーポイント
│   ├── package.json        # 依存関係
│   └── README.md           # フロントエンドのドキュメント
│
├── server/                 # バックエンドコード
│   ├── src/                # TypeScriptソースコード
│   │   ├── controllers/    # APIコントローラー
│   │   ├── middleware/     # ミドルウェア
│   │   ├── models/         # データモデル
│   │   ├── routes/         # APIルート
│   │   ├── services/       # ビジネスロジック
│   │   ├── types/          # 型定義
│   │   ├── utils/          # ユーティリティ関数
│   │   └── index.ts        # エントリーポイント
│   ├── package.json        # 依存関係
│   └── tsconfig.json       # TypeScript設定
│
├── .github/                # GitHub関連ファイル
│   └── workflows/          # GitHub Actions
│       └── deploy.yml      # デプロイワークフロー
│
└── README.md               # プロジェクト全体のドキュメント
```

#### デプロイ先

| コード部分 | デプロイ先 | サーバーパス |
|------------|------------|--------------|
| client/build/* | マネージャーサーバー | /var/www/manager/ |
| client/build/* | テスト環境サーバー | /var/www/manager/ |
| server/ | マネージャーサーバー | /home/ubuntu/openhands-ec2-manager/server/ |
| server/ | テスト環境サーバー | /home/ubuntu/openhands-ec2-manager/server/ |

## 6. 設定ファイル

### 6.1 簡易サーバー (simple-server)

TypeScriptのビルドエラーにより、本来のサーバーコードの代わりに簡易サーバーを使用しています。

**ファイル**: `/home/ubuntu/simple-server/server.js`

```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the React app
app.use(express.static(path.join('/var/www/manager')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join('/var/www/manager/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```

**systemdサービス設定**: `/etc/systemd/system/openhands-api.service`

```ini
[Unit]
Description=OpenHands API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/simple-server
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 6.2 Nginx設定ファイル

#### マネージャーサーバー (35.78.85.44)

**ファイル**: `/etc/nginx/sites-available/manager.teai.io`

```nginx
server {
    listen 80;
    server_name manager.teai.io teai.io www.teai.io;

    root /var/www/manager;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### リバースプロキシサーバー (35.78.204.42)

**ファイル**: `/etc/nginx/sites-available/teai.io`

```nginx
# ユーザーサブドメイン用の設定
server {
    listen 80;
    server_name ~^(?!www\.|manager\.|staging\.).*\.teai\.io$;

    # サブドメインからユーザーIDを抽出
    set $user_id "";
    if ($host ~* ^([^.]+)\.teai\.io$) {
        set $user_id $1;
    }

    # ユーザーIDに基づいてプロキシ先を決定
    location / {
        proxy_pass http://35.78.243.170;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-User-ID $user_id;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # WebSocket転送
    location /socket.io/ {
        proxy_pass http://35.78.243.170;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-User-ID $user_id;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # 43967番ポートへの転送
    location /port43967/ {
        proxy_pass http://35.78.243.170:43967/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-User-ID $user_id;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}

# 特定のサブドメイン用のリダイレクト設定
server {
    listen 80;
    server_name manager.teai.io;
    
    location / {
        proxy_pass http://35.78.85.44;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name staging.teai.io;
    
    location / {
        proxy_pass http://18.183.29.225;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# メインドメイン用の設定
server {
    listen 80;
    server_name teai.io www.teai.io;

    location / {
        proxy_pass http://35.78.85.44;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host manager.teai.io;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### テスト環境サーバー (18.183.29.225)

**ファイル**: `/etc/nginx/sites-available/staging.teai.io`

```nginx
server {
    listen 80;
    server_name staging.teai.io;

    root /var/www/manager;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.3 GitHub Actions ワークフロー

**ファイル**: `.github/workflows/deploy.yml`

```yaml
name: Deploy OpenHands EC2 Manager

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies for client
        run: |
          cd client
          npm install
          
      - name: Build client
        run: |
          cd client
          npm run build
          
      - name: Deploy to production
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Update frontend
            sudo rm -rf /var/www/manager/*
            sudo mkdir -p /var/www/manager
            
            # Copy new build
            sudo cp -r /home/ubuntu/deploy/client/build/* /var/www/manager/
            
            # Restart API server
            sudo systemctl restart openhands-api
            
      - name: Deploy to staging
        if: github.event_name == 'pull_request'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Update frontend
            sudo rm -rf /var/www/manager/*
            sudo mkdir -p /var/www/manager
            
            # Copy new build
            sudo cp -r /home/ubuntu/deploy/client/build/* /var/www/manager/
            
            # Restart API server
            sudo systemctl restart openhands-api
```

## 7. 開発・デプロイフロー

1. 開発者がopenhands-ec2-managerリポジトリに変更をプッシュ
2. GitHub Actionsがワークフローを実行
3. フロントエンドのビルド
4. 本番環境またはテスト環境へのデプロイ
5. Nginxがフロントエンドファイルを配信
6. APIリクエストはNode.jsサーバーに転送

## 8. トラブルシューティング

### 8.1 リダイレクトループが発生する場合

1. DNSレコードが正しく設定されているか確認
   ```bash
   dig teai.io && dig www.teai.io && dig manager.teai.io && dig staging.teai.io
   ```

2. リバースプロキシサーバーのNginx設定を確認
   ```bash
   sudo nginx -t
   ```

3. ブラウザのキャッシュをクリアするか、別のブラウザやプライベートモードでアクセス

### 8.2 APIが応答しない場合

1. APIサーバーが実行されているか確認
   ```bash
   sudo systemctl status openhands-api
   ```

2. ログを確認
   ```bash
   sudo journalctl -u openhands-api
   ```

3. 必要に応じてサービスを再起動
   ```bash
   sudo systemctl restart openhands-api
   ```

### 8.3 フロントエンドが表示されない場合

1. Nginxが実行されているか確認
   ```bash
   sudo systemctl status nginx
   ```

2. フロントエンドファイルが存在するか確認
   ```bash
   ls -la /var/www/manager
   ```

3. Nginxのエラーログを確認
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## 9. メンテナンス手順

### 9.1 フロントエンドの更新

1. ローカルで変更を加え、GitHubにプッシュ
2. GitHub Actionsが自動的にデプロイ

または手動で更新:

```bash
cd /path/to/openhands-ec2-manager
git pull
cd client
npm install
npm run build
sudo cp -r build/* /var/www/manager/
```

### 9.2 バックエンドの更新

1. ローカルで変更を加え、GitHubにプッシュ
2. サーバーにSSH接続

```bash
cd /home/ubuntu/openhands-ec2-manager/server
git pull
npm install
npm run build
sudo systemctl restart openhands-api
```

### 9.3 Nginx設定の更新

```bash
sudo nano /etc/nginx/sites-available/manager.teai.io
sudo nginx -t
sudo systemctl restart nginx
```

## 10. セキュリティ考慮事項

- すべてのサーバーでファイアウォールを適切に設定
- 定期的なセキュリティアップデートの適用
- APIエンドポイントでの適切な認証と認可
- ユーザーデータの暗号化
- バックアップの定期的な実施

---

このドキュメントは、OpenHandsクラウド環境のサーバーアーキテクチャを説明するものです。環境の変更があった場合は、このドキュメントを更新してください。