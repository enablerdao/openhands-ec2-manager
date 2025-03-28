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

## セットアップ手順

### 1. GitHub Actionsを有効化する

以下のPythonスクリプトを使用して、GitHub Actionsを有効化し、必要なブランチを作成します：

```bash
# 必要なパッケージをインストール
pip install requests

# GitHub Actionsを有効化
python enable_github_actions.py YOUR_GITHUB_TOKEN --create-branches

# 利用可能なワークフローを一覧表示
python enable_github_actions.py YOUR_GITHUB_TOKEN --list-workflows

# 特定のワークフローを手動で実行（オプション）
python enable_github_actions.py YOUR_GITHUB_TOKEN --run-workflow WORKFLOW_ID --branch BRANCH_NAME
```

### 2. GitHub Secretsを設定する

GitHub Actionsワークフローでは、以下のSecretsを使用します：

- `DEV_SERVER_IP`: 開発環境のサーバーIPアドレス
- `DEV_SSH_PRIVATE_KEY`: 開発環境のSSH秘密鍵
- `STAGING_SERVER_IP`: テスト環境のサーバーIPアドレス
- `STAGING_SSH_PRIVATE_KEY`: テスト環境のSSH秘密鍵
- `PROD_SERVER_IP`: 本番環境のサーバーIPアドレス
- `PROD_SSH_PRIVATE_KEY`: 本番環境のSSH秘密鍵

これらのSecretsを設定するには、以下の方法があります：

#### 方法1: Pythonスクリプトを使用する（推奨）

```bash
# 必要なパッケージをインストール
pip install pynacl requests

# 対話形式でSecretsを設定
python setup_github_secrets.py YOUR_GITHUB_TOKEN

# または設定ファイルを使用
python setup_github_secrets.py YOUR_GITHUB_TOKEN --config deploy-config.json

# 別のリポジトリを指定する場合
python setup_github_secrets.py YOUR_GITHUB_TOKEN --repo owner/repo-name
```

#### 方法2: Node.jsスクリプトを使用する

```bash
# 対話形式でSecretsを設定
node setup-github-secrets.js YOUR_GITHUB_TOKEN

# または設定ファイルを使用
node setup-github-secrets-from-json.js YOUR_GITHUB_TOKEN deploy-config.json
```

#### 設定ファイルの例（`deploy-config.json`）

```json
{
  "environments": {
    "dev": {
      "server_ip": "35.78.114.51",
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

### 3. サーバー側の設定

各環境のサーバーでは、以下の設定が必要です：

1. Nginxのインストールと設定
2. SSL証明書の設定
3. アプリケーションの実行環境の設定

これらの設定を自動化するために、以下のスクリプトを用意しています：

```bash
# SSL証明書の設定
./setup-ssl.sh

# サービスの再起動
./restart-services.sh
```

## ワークフローの説明

### 開発環境へのデプロイ (`deploy-dev.yml`)

`develop`ブランチへのプッシュ時に自動的に開発環境にデプロイされます。

```bash
# 開発環境へのデプロイをトリガーする
git checkout develop
git push origin develop
```

### テスト環境へのデプロイ (`deploy-staging.yml`)

`staging`ブランチへのプッシュ時に自動的にテスト環境にデプロイされます。

```bash
# テスト環境へのデプロイをトリガーする
git checkout staging
git merge develop
git push origin staging
```

### 本番環境へのデプロイ (`deploy-production.yml`)

`main`ブランチへのプッシュ時に、承認プロセスを経て本番環境にデプロイされます。

```bash
# 本番環境へのデプロイをトリガーする
git checkout main
git merge staging
git push origin main
```

### プルリクエスト時のチェック (`pull-request.yml`)

プルリクエスト作成時に、テストとリントチェックが実行されます。

### セキュリティスキャン (`security-scan.yml`)

定期的に依存パッケージの脆弱性スキャンが実行されます。

## トラブルシューティング

### GitHub Actionsの有効化に失敗する場合

- GitHubパーソナルアクセストークンが正しいか確認してください
- トークンに`repo`と`workflow`スコープが付与されているか確認してください
- リポジトリの設定でGitHub Actionsが有効になっているか確認してください

### GitHub Secretsの設定に失敗する場合

- GitHubパーソナルアクセストークンが正しいか確認してください
- トークンに`repo`スコープが付与されているか確認してください
- SSH秘密鍵のファイルパスが正しいか確認してください

### デプロイに失敗する場合

- サーバーのIPアドレスが正しいか確認してください
- SSH秘密鍵が正しいか確認してください
- サーバーのファイアウォール設定を確認してください
- サーバー上の必要なディレクトリが存在するか確認してください

### ワークフローの実行状況を確認する方法

GitHubリポジトリの「Actions」タブで、ワークフローの実行状況を確認できます。

```
https://github.com/enablerdao/openhands-ec2-manager/actions
```