# TEAI.IO サーバーアーキテクチャ

## システム構成図

```
                                  +-------------------+
                                  |                   |
                                  |  Route 53 (DNS)   |
                                  |                   |
                                  +--------+----------+
                                           |
                                           | DNS解決
                                           | teai.io → 35.78.243.170
                                           v
+------------------+            +----------+-----------+
|                  |            |                      |
|  ブラウザ        +----------->+  EC2 インスタンス     |
|                  |            |  (t3.small)          |
+------------------+            |  Ubuntu 22.04        |
                                |                      |
                                +----------+-----------+
                                           |
                                           | ポート80 → 3000リダイレクト
                                           | (Nginx)
                                           v
                                +----------+-----------+
                                |                      |
                                |  Docker コンテナ      |
                                |  OpenHands           |
                                |  (ポート3000)        |
                                |                      |
                                +----------+-----------+
                                           |
                                           | API呼び出し
                                           v
                                +----------+-----------+
                                |                      |
                                |  Anthropic API       |
                                |  (Claude)            |
                                |                      |
                                +----------------------+
```

## デプロイフロー

```
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
|  開発者        +---->+  GitHub        +---->+  GitHub        |
|  (コード変更)   |     |  リポジトリ    |     |  Actions       |
|                |     |                |     |                |
+----------------+     +----------------+     +------+---------+
                                                     |
                                                     | 自動デプロイ
                                                     v
+----------------+     +----------------+     +------+---------+
|                |     |                |     |                |
|  EC2インスタンス+<----+  AWS           |     |  AWS           |
|  (OpenHands)   |     |  Route 53      |     |  Secrets       |
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
```

## コンポーネント詳細

### 1. AWS Route 53 (DNS)

- **ホストゾーンID**: Z07715391N7YX9WETYO74
- **ドメイン**: teai.io
- **主要レコード**:
  - A (teai.io) → 35.78.243.170
  - A (www.teai.io) → 35.78.243.170

### 2. EC2インスタンス

- **インスタンスID**: i-0b7300a534754389d
- **タイプ**: t3.small
- **OS**: Ubuntu 22.04 LTS
- **リージョン**: ap-northeast-1 (東京)
- **セキュリティグループ**: sg-0ff578709c103c88d (OpenHands-SG)
  - 開放ポート: 22, 80, 443, 3000, 5000, 5001, 8080

### 3. Nginx (Webサーバー)

- **役割**: HTTPリクエスト(ポート80)をOpenHandsアプリケーション(ポート3000)にプロキシ
- **設定ファイル**: /etc/nginx/sites-available/teai.io

### 4. Docker

- **コンテナ名**: openhands-app
- **イメージ**: docker.all-hands.dev/all-hands-ai/openhands:0.30
- **ポート**: 3000
- **環境変数**:
  - LLM_API_KEY: Anthropic APIキー
  - SANDBOX_RUNTIME_CONTAINER_IMAGE: docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik
  - LOG_ALL_EVENTS: true
- **ボリューム**:
  - /var/run/docker.sock:/var/run/docker.sock
  - /home/ubuntu/.openhands-state:/.openhands-state

### 5. GitHub Actions CI/CD

- **ワークフロー**:
  - deploy-production.yml: 本番環境デプロイ (mainブランチ)
  - deploy-staging.yml: ステージング環境デプロイ (stagingブランチ)
- **Secrets**:
  - AWS_ACCESS_KEY_ID: AWSアクセスキー
  - AWS_SECRET_ACCESS_KEY: AWSシークレットキー
  - ANTHROPIC_API_KEY: Anthropic APIキー
  - SSH_PRIVATE_KEY: SSHプライベートキー

## 通信フロー

1. ユーザーがブラウザでteai.ioにアクセス
2. Route 53がドメイン名をIPアドレス(35.78.243.170)に解決
3. リクエストがEC2インスタンスのポート80に到達
4. Nginxがリクエストをポート3000のOpenHandsアプリケーションにプロキシ
5. OpenHandsアプリケーションがリクエストを処理
6. 必要に応じてOpenHandsがAnthropic APIを呼び出し
7. レスポンスがユーザーに返される

## 管理方法

### 手動管理

- SSHでEC2インスタンスに接続
- Dockerコマンドでコンテナを管理
- Nginxの設定を更新

### 自動管理

- GitHubリポジトリにコードをプッシュ
- GitHub Actionsが自動的にデプロイを実行
- AWS Route 53でDNSレコードを管理