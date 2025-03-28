# OpenHands EC2トラブルシューティングガイド

## 問題解決手順

以下は、OpenHandsのEC2インスタンスが応答しなくなった場合の対処方法です。

### 1. インスタンスの状態確認

```bash
# インスタンスIDとIPアドレスを確認
aws ec2 describe-instances --filters "Name=tag:Name,Values=OpenHands-Server" --query "Reservations[].Instances[].{ID:InstanceId,State:State.Name,IP:PublicIpAddress,Type:InstanceType}" --output json

# または特定のIPアドレスからインスタンスIDを確認
aws ec2 describe-instances --filters "Name=ip-address,Values=<IPアドレス>" --query "Reservations[].Instances[].{ID:InstanceId,State:State.Name,IP:PublicIpAddress,Type:InstanceType}" --output json

# インスタンスの詳細なステータスを確認
aws ec2 describe-instance-status --instance-ids <インスタンスID> --output json
```

### 2. インスタンスの再起動

インスタンスが応答しない場合は、再起動を試みます。

```bash
# インスタンスを停止
aws ec2 stop-instances --instance-ids <インスタンスID>

# インスタンスが停止するのを待つ
aws ec2 wait instance-stopped --instance-ids <インスタンスID>

# インスタンスを起動
aws ec2 start-instances --instance-ids <インスタンスID>

# インスタンスが起動するのを待つ
aws ec2 wait instance-running --instance-ids <インスタンスID>

# 新しいIPアドレスを確認
aws ec2 describe-instances --instance-ids <インスタンスID> --query "Reservations[].Instances[].PublicIpAddress" --output text
```

### 3. SSHでの接続確認

```bash
# SSHで接続
ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@<IPアドレス>

# 接続できない場合は、しばらく待ってから再試行
sleep 60 && ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@<IPアドレス>
```

### 4. Dockerコンテナの状態確認

```bash
# Dockerコンテナの状態を確認
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo docker ps -a'

# OpenHandsのセットアップログを確認
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo cat /var/log/openhands_setup.log'
```

### 5. OpenHandsコンテナの再起動

```bash
# 既存のコンテナを停止（存在する場合）
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo docker stop openhands-app || true'

# OpenHandsコンテナを起動
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo docker run -d --rm --pull=always \
  -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik \
  -e LOG_ALL_EVENTS=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/ubuntu/.openhands-state:/.openhands-state \
  -p 3000:3000 \
  --add-host host.docker.internal:host-gateway \
  --name openhands-app \
  docker.all-hands.dev/all-hands-ai/openhands:0.30'

# コンテナのログを確認
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo docker logs openhands-app'
```

### 6. ポートとファイアウォールの確認

```bash
# ポート3000が開放されているか確認
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo ss -tulpn | grep 3000'

# ファイアウォールの状態を確認
ssh -i OpenHands-Key.pem ubuntu@<IPアドレス> 'sudo ufw status'

# セキュリティグループの設定を確認
aws ec2 describe-security-groups --group-ids <セキュリティグループID> --query "SecurityGroups[0].IpPermissions[?FromPort==\`3000\`]" --output json
```

## 一発で起動する方法

OpenHandsを一発で起動するには、以下のスクリプトを使用します：

```bash
# リポジトリをクローン
git clone https://github.com/enablerdao/openhands-ec2-manager.git
cd openhands-ec2-manager

# デプロイスクリプトを実行
./deploy-openhands.sh
```

対話形式で必要な情報を入力すると、OpenHandsが設定されたEC2インスタンスが自動的に起動します。

## 自動化スクリプト

以下のスクリプトを使用すると、OpenHandsの起動と再起動を自動化できます。

### restart-openhands.sh

```bash
#!/bin/bash

# OpenHandsを再起動するスクリプト
# 使用方法: ./restart-openhands.sh <インスタンスID> <リージョン>

INSTANCE_ID=$1
REGION=${2:-"ap-northeast-1"}

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}OpenHands再起動ツール${NC}"
echo

# インスタンスIDの確認
if [ -z "$INSTANCE_ID" ]; then
  echo -e "${RED}インスタンスIDが指定されていません。${NC}"
  echo "使用方法: ./restart-openhands.sh <インスタンスID> [リージョン]"
  exit 1
fi

# インスタンスの状態を確認
echo -e "${YELLOW}インスタンスの状態を確認しています...${NC}"
INSTANCE_STATE=$(aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].State.Name" --output text)

if [ "$INSTANCE_STATE" == "running" ]; then
  echo -e "${GREEN}インスタンスは実行中です。${NC}"
  
  # IPアドレスを取得
  IP_ADDRESS=$(aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
  echo -e "${GREEN}パブリックIPアドレス: $IP_ADDRESS${NC}"
  
  # SSHで接続してDockerコンテナを再起動
  echo -e "${YELLOW}OpenHandsコンテナを再起動しています...${NC}"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS 'sudo docker stop openhands-app || true && sudo docker run -d --rm --pull=always -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik -e LOG_ALL_EVENTS=true -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30'
  
  echo -e "${GREEN}OpenHandsの再起動が完了しました。${NC}"
  echo -e "${GREEN}OpenHandsのURL: http://$IP_ADDRESS:3000${NC}"
  
else
  echo -e "${YELLOW}インスタンスは停止中です。起動します...${NC}"
  
  # インスタンスを起動
  aws ec2 start-instances --region $REGION --instance-ids $INSTANCE_ID
  
  echo -e "${YELLOW}インスタンスの起動を待機しています...${NC}"
  aws ec2 wait instance-running --region $REGION --instance-ids $INSTANCE_ID
  
  # IPアドレスを取得
  IP_ADDRESS=$(aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
  echo -e "${GREEN}パブリックIPアドレス: $IP_ADDRESS${NC}"
  
  # インスタンスの初期化を待機
  echo -e "${YELLOW}インスタンスの初期化を待機しています（60秒）...${NC}"
  sleep 60
  
  # SSHで接続してDockerコンテナを再起動
  echo -e "${YELLOW}OpenHandsコンテナを再起動しています...${NC}"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS 'sudo docker stop openhands-app || true && sudo docker run -d --rm --pull=always -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik -e LOG_ALL_EVENTS=true -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30'
  
  echo -e "${GREEN}OpenHandsの起動が完了しました。${NC}"
  echo -e "${GREEN}OpenHandsのURL: http://$IP_ADDRESS:3000${NC}"
fi
```

このスクリプトを保存して実行権限を付与します：

```bash
chmod +x restart-openhands.sh
```

使用方法：

```bash
./restart-openhands.sh <インスタンスID> [リージョン]
```

## 注意事項

- インスタンスを再起動すると、新しいIPアドレスが割り当てられる場合があります。
- インスタンスを再起動すると、以前の会話データが失われる可能性があります。
- セキュリティグループの設定が正しいことを確認してください（ポート22と3000が開放されていること）。