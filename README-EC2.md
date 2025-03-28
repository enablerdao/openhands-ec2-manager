# OpenHands EC2デプロイガイド

このガイドでは、OpenHandsをAWS EC2インスタンスに簡単にデプロイする方法を説明します。

## 概要

`deploy-openhands.sh`スクリプトを使用すると、以下の手順を自動的に実行できます：

1. AWSリージョンの選択
2. セキュリティグループの作成（SSH用ポート22とOpenHands用ポート3000を開放）
3. キーペアの作成
4. EC2インスタンスの起動（Ubuntu 22.04 LTS）
5. OpenHandsのセットアップスクリプトの実行
6. 接続情報の表示

## 前提条件

- AWS CLIがインストールされていること
- AWS認証情報が設定されていること（`aws configure`で設定）

## 使用方法

1. スクリプトを実行可能にする
```bash
chmod +x deploy-openhands.sh
```

2. スクリプトを実行
```bash
./deploy-openhands.sh
```

3. 画面の指示に従って設定を選択
   - AWSリージョン
   - インスタンスタイプ

4. デプロイが完了すると、以下の情報が表示されます
   - インスタンスID
   - パブリックIPアドレス
   - OpenHandsのURL
   - SSHでの接続方法

## セットアップの進行状況確認

OpenHandsのセットアップには5〜10分かかる場合があります。進行状況を確認するには：

```bash
ssh -i OpenHands-Key.pem ubuntu@<パブリックIP> 'sudo cat /var/log/openhands_setup.log'
```

## インスタンスの管理

### インスタンスの停止（再開可能）
```bash
aws ec2 stop-instances --region <リージョン> --instance-ids <インスタンスID>
```

### インスタンスの再開
```bash
aws ec2 start-instances --region <リージョン> --instance-ids <インスタンスID>
```

### インスタンスの終了（完全に削除）
```bash
aws ec2 terminate-instances --region <リージョン> --instance-ids <インスタンスID>
```

## トラブルシューティング

### OpenHandsにアクセスできない場合
- セットアップが完了するまで5〜10分待ってください
- セットアップログを確認してください
```bash
ssh -i OpenHands-Key.pem ubuntu@<パブリックIP> 'sudo cat /var/log/openhands_setup.log'
```

### Dockerコンテナの状態を確認
```bash
ssh -i OpenHands-Key.pem ubuntu@<パブリックIP> 'sudo docker ps'
```

### Dockerコンテナのログを確認
```bash
ssh -i OpenHands-Key.pem ubuntu@<パブリックIP> 'sudo docker logs openhands-app'
```

## 注意事項

- このスクリプトはt3.smallインスタンスをデフォルトで使用します（カスタマイズ可能）
- Ubuntu 22.04 LTSをAMIとして使用します
- インスタンスを使用しない場合は、コストを抑えるために必ず終了してください