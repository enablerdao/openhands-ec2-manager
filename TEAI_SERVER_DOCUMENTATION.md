# TEAI.IO サーバー構成ドキュメント

このドキュメントは、teai.ioドメインとOpenHandsアプリケーションのサーバー構成を説明するものです。

## 目次

1. [AWS構成概要](#aws構成概要)
2. [EC2インスタンス](#ec2インスタンス)
3. [DNS設定 (Route 53)](#dns設定-route-53)
4. [Dockerコンテナ](#dockerコンテナ)
5. [環境変数](#環境変数)
6. [GitHub Actions CI/CD](#github-actions-cicd)
7. [メンテナンス手順](#メンテナンス手順)
8. [トラブルシューティング](#トラブルシューティング)

## AWS構成概要

teai.ioのインフラストラクチャは、以下のAWSサービスで構成されています：

- **EC2**: OpenHandsアプリケーションを実行するサーバー
- **Route 53**: DNSレコード管理
- **SES**: メール送信（SPFレコードが設定されています）

すべてのリソースは東京リージョン（ap-northeast-1）にデプロイされています。

デプロイは主にGitHub Actionsを使用して自動化されています。

## EC2インスタンス

### 基本情報

- **インスタンスID**: i-0b7300a534754389d
- **インスタンスタイプ**: t3.small
- **AMI**: ami-0a332444d8ec3a4ab (Ubuntu 22.04 LTS)
- **起動日時**: 2025-03-28
- **キーペア**: OpenHands-Key
- **パブリックIP**: 35.78.243.170
- **名前タグ**: OpenHands-Server

### ネットワーク設定

- **VPC ID**: vpc-0125f9dd1b727a9d4
- **サブネット ID**: subnet-0f087e2442a1a64a5
- **セキュリティグループ**: sg-0ff578709c103c88d (OpenHands-SG)

### セキュリティグループ設定

以下のポートが開放されています：

- SSH (22): 0.0.0.0/0
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- OpenHands (3000): 0.0.0.0/0
- API (5000-5001): 0.0.0.0/0
- Web Server (8080): 0.0.0.0/0

### ディスク使用状況

```
Filesystem       Size  Used Avail Use% Mounted on
/dev/root        7.6G  5.2G  2.4G  69% /
```

**注意**: ディスク容量が69%使用されています。定期的に監視が必要です。

## DNS設定 (Route 53)

### ホストゾーン

teai.ioドメインには複数のホストゾーンが存在しますが、現在アクティブなのは以下のゾーンです：

- **ホストゾーンID**: Z07715391N7YX9WETYO74
- **名前**: teai.io.

### DNSレコード

主要なDNSレコード：

- **A (teai.io)**: 35.78.114.51 (TTL: 300秒) - **要更新**: 35.78.243.170に変更する必要があります
- **A (www.teai.io)**: 35.78.114.51 (TTL: 300秒) - **要更新**: 35.78.243.170に変更する必要があります
- **A (*.teai.io)**: 3.112.203.155 (TTL: 300秒)
- **A (api.teai.io)**: 3.112.203.155 (TTL: 300秒)
- **MX**: 10 feedback-smtp.ap-northeast-1.amazonses.com (TTL: 300秒)
- **TXT (SPF)**: "v=spf1 include:amazonses.com ~all" (TTL: 300秒)
- **TXT (_dmarc)**: "v=DMARC1; p=none;" (TTL: 300秒)

### ネームサーバー

```
ns-1694.awsdns-19.co.uk.
ns-1109.awsdns-10.org.
ns-563.awsdns-06.net.
ns-69.awsdns-08.com.
```

## Dockerコンテナ

### 実行中のコンテナ

```
CONTAINER ID   IMAGE                                              COMMAND                  CREATED          STATUS         PORTS                                       NAMES
5d44bd22ab1e   docker.all-hands.dev/all-hands-ai/openhands:0.30   "/app/entrypoint.sh …"   30 minutes ago   Up 2 minutes   0.0.0.0:3000->3000/tcp, :::3000->3000/tcp   openhands-app
```

### コンテナ設定

- **イメージ**: docker.all-hands.dev/all-hands-ai/openhands:0.30
- **ランタイムイメージ**: docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik
- **ポート**: 3000
- **再起動ポリシー**: always
- **ボリューム**:
  - /var/run/docker.sock:/var/run/docker.sock
  - /home/ubuntu/.openhands-state:/.openhands-state

## 環境変数

環境変数は `/home/ubuntu/.openhands.env` ファイルで管理されています：

```
LLM_API_KEY=sk-ant-your-actual-api-key-here
```

**注意**: 実際のAPIキーは安全に管理し、このドキュメントには記載しないでください。

## GitHub Actions CI/CD

OpenHandsのデプロイは、GitHub Actionsを使用して自動化されています。

### ワークフロー構成

2つの主要なワークフローがあります：

1. **本番環境デプロイ** (`deploy-production.yml`)
   - トリガー: `main`ブランチへのプッシュ
   - 環境: `production`
   - インスタンス名: `OpenHands-Production`
   - セキュリティグループ: `OpenHands-SG-Prod`
   - キーペア: `OpenHands-Key-Prod`

2. **ステージング環境デプロイ** (`deploy-staging.yml`)
   - トリガー: `staging`ブランチへのプッシュ
   - 環境: `staging`
   - インスタンス名: `OpenHands-Staging`
   - セキュリティグループ: `OpenHands-SG-Staging`
   - キーペア: `OpenHands-Key-Staging`

### 必要なGitHub Secrets

ワークフローの実行には、以下のGitHub Secretsが必要です：

- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWSシークレットアクセスキー
- `ANTHROPIC_API_KEY`: Anthropic APIキー（LLM_API_KEYとして使用）
- `SSH_PRIVATE_KEY`: SSHプライベートキー
- `SLACK_WEBHOOK_URL`: Slack通知用のWebhook URL（オプション）

### デプロイプロセス

1. コードのチェックアウト
2. AWS認証情報の設定
3. ユーザーデータスクリプトの作成
4. セキュリティグループの作成または取得
5. キーペアの作成または取得
6. 既存のインスタンスの確認
7. 必要に応じて新しいインスタンスを起動
8. 既存のインスタンスの更新（.envファイルの作成とDockerコンテナの再起動）
9. インスタンス情報の出力とSlack通知（設定されている場合）

## メンテナンス手順

### EC2インスタンスの再起動

```bash
aws ec2 reboot-instances --region ap-northeast-1 --instance-ids i-0b7300a534754389d
```

### OpenHandsコンテナの再起動

```bash
ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo docker stop openhands-app && sudo docker rm openhands-app && sudo docker run -d --restart=always --env-file /home/ubuntu/.openhands.env -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30"
```

### APIキーの更新

```bash
ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "echo 'LLM_API_KEY=新しいAPIキー' > /home/ubuntu/.openhands.env"
ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo docker restart openhands-app"
```

### DNSレコードの更新

Route 53コンソールで、teai.ioのAレコードを更新します：

1. AWS Route 53コンソールにログイン
2. ホストゾーン Z07715391N7YX9WETYO74 を選択
3. teai.io のAレコードを編集
4. 値を現在のEC2インスタンスのIPアドレス (35.78.243.170) に変更
5. 変更を保存

## トラブルシューティング

### サーバーに接続できない場合

1. EC2インスタンスの状態を確認：
   ```bash
   aws ec2 describe-instances --region ap-northeast-1 --instance-ids i-0b7300a534754389d --query "Reservations[0].Instances[0].State.Name"
   ```

2. セキュリティグループの設定を確認：
   ```bash
   aws ec2 describe-security-groups --region ap-northeast-1 --group-ids sg-0ff578709c103c88d
   ```

3. DNSレコードが正しいIPを指しているか確認：
   ```bash
   dig teai.io
   ```

### OpenHandsアプリケーションにアクセスできない場合

1. Dockerコンテナの状態を確認：
   ```bash
   ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo docker ps"
   ```

2. コンテナログを確認：
   ```bash
   ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo docker logs openhands-app"
   ```

3. 必要に応じてコンテナを再起動：
   ```bash
   ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo docker restart openhands-app"
   ```

### ディスク容量の問題

ログに「no space left on device」エラーが表示された場合：

1. ディスク使用状況を確認：
   ```bash
   ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "df -h"
   ```

2. 不要なDockerイメージを削除：
   ```bash
   ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo docker system prune -a"
   ```

3. ログファイルをクリーンアップ：
   ```bash
   ssh -i OpenHands-Key.pem ubuntu@35.78.243.170 "sudo find /var/log -type f -name '*.log' -exec truncate -s 0 {} \;"
   ```