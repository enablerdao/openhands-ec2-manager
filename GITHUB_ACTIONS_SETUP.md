# GitHub Actions CI/CD セットアップガイド

このガイドでは、OpenHands EC2マネージャーのCI/CD（継続的インテグレーション/継続的デリバリー）パイプラインを設定する方法を説明します。

## 概要

GitHub Actionsを使用して、以下の環境に自動デプロイを行います：

- **開発環境 (Development)**: `dev.teai.io`
- **テスト環境 (Staging)**: `staging.teai.io`
- **本番環境 (Production)**: `teai.io`

## 前提条件

- GitHubアカウント
- GitHubパーソナルアクセストークン（リポジトリの権限を持つもの）
- 各環境のEC2インスタンス
- 各環境のSSH秘密鍵

## GitHub Secretsの設定

GitHub Actionsワークフローでは、以下のSecretsを使用します：

- `DEV_SERVER_IP`: 開発環境のサーバーIPアドレス
- `DEV_SSH_PRIVATE_KEY`: 開発環境のSSH秘密鍵
- `STAGING_SERVER_IP`: テスト環境のサーバーIPアドレス
- `STAGING_SSH_PRIVATE_KEY`: テスト環境のSSH秘密鍵
- `PROD_SERVER_IP`: 本番環境のサーバーIPアドレス
- `PROD_SSH_PRIVATE_KEY`: 本番環境のSSH秘密鍵

これらのSecretsを設定するには、以下の2つの方法があります：

### 方法1: 対話形式でSecretsを設定する

```bash
# GitHubパーソナルアクセストークンを使用して実行
node setup-github-secrets.js YOUR_GITHUB_TOKEN
```

このスクリプトは、対話形式で各環境の設定を入力するよう促します。

### 方法2: JSONファイルを使用してSecretsを設定する

1. 設定ファイルを作成します（サンプル: `deploy-config-sample.json`）：

```json
{
  "environments": {
    "dev": {
      "server_ip": "dev-server-ip",
      "ssh_key_path": "/path/to/dev-ssh-key.pem"
    },
    "staging": {
      "server_ip": "staging-server-ip",
      "ssh_key_path": "/path/to/staging-ssh-key.pem"
    },
    "production": {
      "server_ip": "production-server-ip",
      "ssh_key_path": "/path/to/prod-ssh-key.pem"
    }
  }
}
```

2. スクリプトを実行します：

```bash
# GitHubパーソナルアクセストークンと設定ファイルを指定して実行
node setup-github-secrets-from-json.js YOUR_GITHUB_TOKEN deploy-config.json
```

## ワークフローの説明

### 開発環境へのデプロイ (`deploy-dev.yml`)

`develop`ブランチへのプッシュ時に自動的に開発環境にデプロイされます。

### テスト環境へのデプロイ (`deploy-staging.yml`)

`staging`ブランチへのプッシュ時に自動的にテスト環境にデプロイされます。

### 本番環境へのデプロイ (`deploy-production.yml`)

`main`ブランチへのプッシュ時に、承認プロセスを経て本番環境にデプロイされます。

### プルリクエスト時のチェック (`pull-request.yml`)

プルリクエスト作成時に、テストとリントチェックが実行されます。

### セキュリティスキャン (`security-scan.yml`)

定期的に依存パッケージの脆弱性スキャンが実行されます。

## サーバー側の設定

各環境のサーバーでは、以下の設定が必要です：

1. Nginxのインストールと設定
2. SSL証明書の設定
3. アプリケーションの実行環境の設定

これらの設定を自動化するために、以下のスクリプトを用意しています：

- `setup-ssl.sh`: SSL証明書の設定
- `restart-services.sh`: サービスの再起動

## トラブルシューティング

### GitHub Secretsの設定に失敗する場合

- GitHubパーソナルアクセストークンが正しいか確認してください
- トークンに`repo`スコープが付与されているか確認してください

### デプロイに失敗する場合

- サーバーのIPアドレスが正しいか確認してください
- SSH秘密鍵が正しいか確認してください
- サーバーのファイアウォール設定を確認してください