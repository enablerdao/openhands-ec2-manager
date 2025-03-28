# EC2インスタンスセットアップガイド

このガイドでは、OpenHands EC2マネージャーを実行するためのEC2インスタンスのセットアップ方法を説明します。

## 前提条件

- AWSアカウント
- EC2インスタンスの作成権限
- ドメイン名とDNS設定の権限

## EC2インスタンスの作成

1. AWSマネジメントコンソールにログインします。
2. EC2ダッシュボードに移動し、「インスタンスを起動」をクリックします。
3. 以下の設定でインスタンスを作成します：

   - **名前**: openhands-{環境名} (例: openhands-dev)
   - **AMI**: Ubuntu Server 22.04 LTS
   - **インスタンスタイプ**: t2.micro（最小要件）または t2.small（推奨）
   - **キーペア**: 新規作成または既存のものを選択
   - **ネットワーク設定**:
     - VPC: デフォルトまたは既存のVPC
     - サブネット: パブリックサブネット
     - 自動割り当てパブリックIP: 有効
     - セキュリティグループ:
       - SSH (ポート22): 管理用IPからのみ
       - HTTP (ポート80): すべてのIPから
       - HTTPS (ポート443): すべてのIPから
   - **ストレージ**: 8GB以上のgp2ボリューム

4. 「インスタンスを起動」をクリックします。

## DNSの設定

1. お使いのドメインのDNS設定にアクセスします。
2. 以下のAレコードを追加します：

   - **開発環境**: dev.teai.io → EC2インスタンスのパブリックIPアドレス
   - **テスト環境**: staging.teai.io → EC2インスタンスのパブリックIPアドレス
   - **本番環境**: teai.io → EC2インスタンスのパブリックIPアドレス

## インスタンスのセットアップ

1. EC2インスタンスにSSH接続します：

```bash
ssh -i /path/to/key.pem ubuntu@{EC2インスタンスのパブリックIPアドレス}
```

2. セットアップスクリプトをダウンロードします：

```bash
curl -o setup_ec2_instance.sh https://raw.githubusercontent.com/enablerdao/openhands-ec2-manager/add-github-actions-integration/setup_ec2_instance.sh
chmod +x setup_ec2_instance.sh
```

3. 環境に応じてセットアップスクリプトを実行します：

```bash
# 開発環境の場合
./setup_ec2_instance.sh dev

# テスト環境の場合
./setup_ec2_instance.sh staging

# 本番環境の場合
./setup_ec2_instance.sh production
```

このスクリプトは以下の設定を自動的に行います：

- システムのアップデート
- 必要なパッケージのインストール（Nginx, Node.js, PM2など）
- アプリケーションディレクトリの作成
- Nginxの設定
- SSL証明書の取得と設定
- PM2の設定
- ファイアウォールの設定

## SSH鍵の準備

GitHub Actionsでデプロイに使用するSSH鍵を準備します：

1. EC2インスタンスで新しいSSH鍵を生成します（オプション）：

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions
```

2. 公開鍵を認証済み鍵に追加します：

```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

3. 秘密鍵をダウンロードします（ローカルマシンで実行）：

```bash
scp -i /path/to/key.pem ubuntu@{EC2インスタンスのパブリックIPアドレス}:~/.ssh/github_actions /path/to/save/github_actions_key
```

この秘密鍵は、GitHub Secretsの設定時に使用します。

## 動作確認

セットアップが完了したら、以下のURLにアクセスして動作を確認します：

- **開発環境**: https://dev.teai.io
- **テスト環境**: https://staging.teai.io
- **本番環境**: https://teai.io

## トラブルシューティング

### Nginxの設定を確認する

```bash
sudo nginx -t
sudo systemctl status nginx
```

### SSL証明書の状態を確認する

```bash
sudo certbot certificates
```

### アプリケーションログを確認する

```bash
pm2 logs
```

### ファイアウォールの状態を確認する

```bash
sudo ufw status
```