#!/bin/bash

# OpenHandsをAWS EC2にデプロイするスクリプト（APIキー対応版）
# 使用方法: ./deploy-openhands-with-api-key.sh

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}OpenHands EC2デプロイツール${NC}"
echo "このスクリプトはOpenHandsをAWS EC2インスタンスにデプロイします。"
echo

# AWSの認証情報を確認
echo -e "${YELLOW}AWSの認証情報を確認しています...${NC}"
aws sts get-caller-identity > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}AWSの認証情報が見つかりません。${NC}"
  echo "AWS CLIの設定を行ってください。"
  exit 1
fi
echo -e "${GREEN}AWSの認証情報が確認できました。${NC}"
echo

# APIキーの確認
echo -e "${YELLOW}Anthropic APIキーを入力してください:${NC}"
read -s ANTHROPIC_API_KEY
echo

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo -e "${RED}APIキーが入力されていません。${NC}"
  exit 1
fi

# AWSリージョンの選択
echo -e "${YELLOW}AWSリージョンを選択してください:${NC}"
echo "1) ap-northeast-1 (東京)"
echo "2) us-east-1 (バージニア)"
echo "3) us-west-2 (オレゴン)"
echo "4) eu-west-1 (アイルランド)"
echo "5) その他（手動入力）"
read -p "選択してください (1-5): " region_choice

case $region_choice in
  1) REGION="ap-northeast-1" ;;
  2) REGION="us-east-1" ;;
  3) REGION="us-west-2" ;;
  4) REGION="eu-west-1" ;;
  5) 
    read -p "リージョンを入力してください: " REGION
    ;;
  *) 
    echo -e "${RED}無効な選択です。デフォルトのap-northeast-1を使用します。${NC}"
    REGION="ap-northeast-1"
    ;;
esac

echo "選択されたリージョン: $REGION"
echo

# セキュリティグループの作成
echo -e "${YELLOW}セキュリティグループを作成しています...${NC}"
SG_ID=$(aws ec2 describe-security-groups --region $REGION --filters "Name=group-name,Values=OpenHands-SG" --query "SecurityGroups[0].GroupId" --output text)

if [ "$SG_ID" == "None" ] || [ -z "$SG_ID" ]; then
  echo "セキュリティグループ 'OpenHands-SG' を作成します..."
  SG_ID=$(aws ec2 create-security-group --region $REGION --group-name OpenHands-SG --description "Security group for OpenHands" --vpc-id $(aws ec2 describe-vpcs --region $REGION --query "Vpcs[0].VpcId" --output text) --output text)
  
  # SSHポートを開放
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
  
  # HTTPポートを開放
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
  
  # HTTPSポートを開放
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
  
  # OpenHandsポートを開放
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0
  
  # APIポートを開放
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 5000 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 5001 --cidr 0.0.0.0/0
  
  # Webサーバーポートを開放
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 8080 --cidr 0.0.0.0/0
else
  echo "既存のセキュリティグループ 'OpenHands-SG' ($SG_ID) を使用します。"
fi

echo "セキュリティグループID: $SG_ID"
echo

# キーペアの確認
echo -e "${YELLOW}キーペアを確認しています...${NC}"
KEY_NAME="OpenHands-Key"
KEY_FILE="$KEY_NAME.pem"

if ! aws ec2 describe-key-pairs --region $REGION --key-names $KEY_NAME > /dev/null 2>&1; then
  echo "キーペア '$KEY_NAME' を作成します..."
  aws ec2 create-key-pair --region $REGION --key-name $KEY_NAME --query "KeyMaterial" --output text > $KEY_FILE
  chmod 400 $KEY_FILE
else
  echo "キーペア '$KEY_NAME' は既に存在します。"
  if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}警告: キーペアファイル '$KEY_FILE' が見つかりません。${NC}"
    echo "既存のキーペアファイルを使用するか、キーペアを削除して再作成してください。"
  fi
fi
echo

# ユーザーデータスクリプトの作成
echo -e "${YELLOW}ユーザーデータスクリプトを作成しています...${NC}"
cat > user-data.sh << 'EOF'
#!/bin/bash

# ログファイルの設定
LOG_FILE="/var/log/openhands_setup.log"
exec > >(tee -a $LOG_FILE) 2>&1

echo "$(date): Starting OpenHands setup script"

# システムの更新とDockerのインストール
echo "$(date): Updating system and installing Docker"
apt-get update
apt-get install -y docker.io

# Dockerサービスの起動
echo "$(date): Starting Docker service"
systemctl start docker
systemctl enable docker

# OpenHandsの状態ディレクトリを作成
echo "$(date): Creating OpenHands state directory"
mkdir -p /home/ubuntu/.openhands-state
chown -R ubuntu:ubuntu /home/ubuntu/.openhands-state

# OpenHandsのDockerイメージを取得
echo "$(date): Pulling OpenHands Docker image"
docker pull docker.all-hands.dev/all-hands-ai/openhands:0.30

# ランタイムのDockerイメージを取得
echo "$(date): Pulling runtime Docker image"
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik

# OpenHandsコンテナの実行
echo "$(date): Running OpenHands container"
docker run -d --restart=always \
  -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik \
  -e LOG_ALL_EVENTS=true \
  -e LLM_API_KEY="ANTHROPIC_API_KEY_PLACEHOLDER" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/ubuntu/.openhands-state:/.openhands-state \
  -p 3000:3000 \
  --add-host host.docker.internal:host-gateway \
  --name openhands-app \
  docker.all-hands.dev/all-hands-ai/openhands:0.30

# Dockerコンテナの状態を確認
echo "$(date): Checking Docker container status"
docker ps

# セットアップ完了メッセージ
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "$(date): Setup completed. Access at http://$PUBLIC_IP:3000"
echo "$(date): Log file is available at $LOG_FILE"
EOF

# APIキーをユーザーデータスクリプトに挿入
sed -i "s/ANTHROPIC_API_KEY_PLACEHOLDER/$ANTHROPIC_API_KEY/g" user-data.sh

echo "ユーザーデータスクリプトを作成しました。"
echo

# インスタンスタイプの選択
echo -e "${YELLOW}インスタンスタイプを選択してください:${NC}"
echo "1) t3.small (2 vCPU, 2 GiB RAM) - 低コスト"
echo "2) t3.medium (2 vCPU, 4 GiB RAM) - バランス"
echo "3) t3.large (2 vCPU, 8 GiB RAM) - 高性能"
echo "4) その他（手動入力）"
read -p "選択してください (1-4): " instance_choice

case $instance_choice in
  1) INSTANCE_TYPE="t3.small" ;;
  2) INSTANCE_TYPE="t3.medium" ;;
  3) INSTANCE_TYPE="t3.large" ;;
  4) 
    read -p "インスタンスタイプを入力してください: " INSTANCE_TYPE
    ;;
  *) 
    echo -e "${RED}無効な選択です。デフォルトのt3.smallを使用します。${NC}"
    INSTANCE_TYPE="t3.small"
    ;;
esac

echo "選択されたインスタンスタイプ: $INSTANCE_TYPE"
echo

# EC2インスタンスの起動
echo -e "${YELLOW}EC2インスタンスを起動しています...${NC}"
INSTANCE_ID=$(aws ec2 run-instances --region $REGION \
  --image-id $(aws ec2 describe-images --region $REGION --owners amazon --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text) \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --user-data file://user-data.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=OpenHands-Server}]" \
  --query "Instances[0].InstanceId" \
  --output text)

echo "インスタンスID: $INSTANCE_ID"
echo

# インスタンスの起動を待機
echo -e "${YELLOW}インスタンスの起動を待機しています...${NC}"
aws ec2 wait instance-running --region $REGION --instance-ids $INSTANCE_ID

# パブリックIPアドレスの取得
PUBLIC_IP=$(aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)

echo -e "${GREEN}インスタンスが起動しました。${NC}"
echo
echo "パブリックIPアドレス: $PUBLIC_IP"
echo

# OpenHandsへのアクセス情報
echo -e "${YELLOW}OpenHandsへのアクセス情報:${NC}"
echo "OpenHandsのURL: http://$PUBLIC_IP:3000"
echo "※インスタンスの初期化とOpenHandsのセットアップには5〜10分かかる場合があります。"
echo "  上記のURLにアクセスできない場合は、しばらく待ってから再試行してください。"
echo
echo -e "${YELLOW}SSHでの接続方法:${NC}"
echo "ssh -i $KEY_FILE ubuntu@$PUBLIC_IP"
echo
echo -e "${YELLOW}セットアップの進行状況を確認するには:${NC}"
echo "ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo cat /var/log/openhands_setup.log'"
echo

# インスタンス情報の保存
echo -e "インスタンスID: $INSTANCE_ID\nパブリックIP: $PUBLIC_IP\nOpenHandsのURL: http://$PUBLIC_IP:3000\nSSHコマンド: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP" > openhands-instance-info.txt

echo -e "${GREEN}デプロイが完了しました！${NC}"
echo "インスタンスID: $INSTANCE_ID"
echo "パブリックIP: $PUBLIC_IP"
echo "OpenHandsのURL: http://$PUBLIC_IP:3000"
echo "SSHコマンド: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP"
echo
echo -e "${YELLOW}インスタンスを終了するには:${NC}"
echo "aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID"
echo
echo "インスタンス情報を openhands-instance-info.txt に保存しました。"