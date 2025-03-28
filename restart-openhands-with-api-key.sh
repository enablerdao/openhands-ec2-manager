#!/bin/bash

# OpenHandsを再起動するスクリプト（APIキー対応版）
# 使用方法: ./restart-openhands-with-api-key.sh <インスタンスID> <リージョン>

INSTANCE_ID=$1
REGION=${2:-"ap-northeast-1"}

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}OpenHands再起動ツール（APIキー対応版）${NC}"
echo

# インスタンスIDの確認
if [ -z "$INSTANCE_ID" ]; then
  echo -e "${RED}インスタンスIDが指定されていません。${NC}"
  echo "使用方法: ./restart-openhands-with-api-key.sh <インスタンスID> [リージョン]"
  exit 1
fi

# APIキーの確認
echo -e "${YELLOW}Anthropic APIキーを入力してください:${NC}"
read -s ANTHROPIC_API_KEY
echo

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo -e "${RED}APIキーが入力されていません。${NC}"
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
  
  # .envファイルを作成
  echo -e "${YELLOW}.envファイルを作成しています...${NC}"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "echo 'LLM_API_KEY=$ANTHROPIC_API_KEY' > /home/ubuntu/.openhands.env"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "echo 'SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik' >> /home/ubuntu/.openhands.env"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "echo 'LOG_ALL_EVENTS=true' >> /home/ubuntu/.openhands.env"
  
  # SSHで接続してDockerコンテナを再起動
  echo -e "${YELLOW}OpenHandsコンテナを再起動しています...${NC}"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "sudo docker stop openhands-app || true && sudo docker run -d --rm --pull=always --env-file /home/ubuntu/.openhands.env -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30"
  
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
  
  # .envファイルを作成
  echo -e "${YELLOW}.envファイルを作成しています...${NC}"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "echo 'LLM_API_KEY=$ANTHROPIC_API_KEY' > /home/ubuntu/.openhands.env"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "echo 'SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik' >> /home/ubuntu/.openhands.env"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "echo 'LOG_ALL_EVENTS=true' >> /home/ubuntu/.openhands.env"
  
  # SSHで接続してDockerコンテナを再起動
  echo -e "${YELLOW}OpenHandsコンテナを再起動しています...${NC}"
  ssh -i OpenHands-Key.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$IP_ADDRESS "sudo docker stop openhands-app || true && sudo docker run -d --rm --pull=always --env-file /home/ubuntu/.openhands.env -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30"
  
  echo -e "${GREEN}OpenHandsの起動が完了しました。${NC}"
  echo -e "${GREEN}OpenHandsのURL: http://$IP_ADDRESS:3000${NC}"
fi