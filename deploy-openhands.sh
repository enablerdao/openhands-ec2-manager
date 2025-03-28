#!/bin/bash

# OpenHandsをEC2インスタンスにデプロイするスクリプト

# 変数の設定
AMI_ID="ami-0f415cc2783de6675"  # Ubuntu 22.04 LTS
INSTANCE_TYPE="t3.small"
KEY_NAME="OpenHands-Key"
SECURITY_GROUP_NAME="OpenHands-SG"
INSTANCE_NAME="OpenHands-Server"

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
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}AWSの認証情報が設定されていないか、無効です。${NC}"
  echo "aws configure コマンドを実行して認証情報を設定してください。"
  exit 1
fi
echo -e "${GREEN}AWSの認証情報が確認できました。${NC}"
echo

# リージョンの選択
echo -e "${YELLOW}AWSリージョンを選択してください:${NC}"
echo "1) ap-northeast-1 (東京)"
echo "2) us-east-1 (バージニア)"
echo "3) us-west-2 (オレゴン)"
echo "4) eu-west-1 (アイルランド)"
echo "5) その他（手動入力）"
read -p "選択してください (1-5): " REGION_CHOICE

case $REGION_CHOICE in
  1) REGION="ap-northeast-1" ;;
  2) REGION="us-east-1" ;;
  3) REGION="us-west-2" ;;
  4) REGION="eu-west-1" ;;
  5) read -p "リージョンを入力してください: " REGION ;;
  *) echo -e "${RED}無効な選択です。ap-northeast-1 (東京)を使用します。${NC}"; REGION="ap-northeast-1" ;;
esac

echo -e "${GREEN}選択されたリージョン: $REGION${NC}"
echo

# セキュリティグループの作成
echo -e "${YELLOW}セキュリティグループを作成しています...${NC}"
SG_EXISTS=$(aws ec2 describe-security-groups --region $REGION --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null)

if [ "$SG_EXISTS" == "None" ] || [ -z "$SG_EXISTS" ]; then
  echo "セキュリティグループ '$SECURITY_GROUP_NAME' を作成しています..."
  SG_ID=$(aws ec2 create-security-group --region $REGION --group-name $SECURITY_GROUP_NAME --description "Security group for OpenHands" --query "GroupId" --output text)
  
  echo "SSH (ポート22) のインバウンドルールを追加しています..."
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
  
  echo "OpenHands (ポート3000) のインバウンドルールを追加しています..."
  aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0
else
  SG_ID=$SG_EXISTS
  echo "既存のセキュリティグループ '$SECURITY_GROUP_NAME' ($SG_ID) を使用します。"
fi

echo -e "${GREEN}セキュリティグループID: $SG_ID${NC}"
echo

# キーペアの作成
echo -e "${YELLOW}キーペアを確認しています...${NC}"
KEY_EXISTS=$(aws ec2 describe-key-pairs --region $REGION --key-names $KEY_NAME --query "KeyPairs[0].KeyName" --output text 2>/dev/null)

if [ "$KEY_EXISTS" == "None" ] || [ -z "$KEY_EXISTS" ]; then
  echo "キーペア '$KEY_NAME' を作成しています..."
  aws ec2 create-key-pair --region $REGION --key-name $KEY_NAME --query "KeyMaterial" --output text > $KEY_NAME.pem
  chmod 400 $KEY_NAME.pem
  echo -e "${GREEN}キーペア '$KEY_NAME' を作成し、$KEY_NAME.pem として保存しました。${NC}"
else
  echo -e "${YELLOW}キーペア '$KEY_NAME' は既に存在します。${NC}"
  if [ ! -f "$KEY_NAME.pem" ]; then
    echo -e "${RED}警告: キーペアのプライベートキーファイル ($KEY_NAME.pem) が見つかりません。${NC}"
    echo "既存のキーペアを使用する場合は、プライベートキーファイルが必要です。"
    read -p "続行しますか？ (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
      echo "スクリプトを終了します。"
      exit 1
    fi
  fi
fi
echo

# ユーザーデータスクリプトの作成
echo -e "${YELLOW}ユーザーデータスクリプトを作成しています...${NC}"
cat > user_data.sh << 'EOF'
#!/bin/bash

# ログファイルを設定
LOGFILE="/var/log/openhands_setup.log"
exec > >(tee -a $LOGFILE) 2>&1

echo "$(date): Starting OpenHands setup script"

# システムを更新し、Dockerをインストール
echo "$(date): Updating system and installing Docker"
apt-get update
apt-get install -y docker.io

# Dockerサービスを開始
echo "$(date): Starting Docker service"
systemctl start docker
systemctl enable docker

# OpenHandsの状態を保存するディレクトリを作成
echo "$(date): Creating OpenHands state directory"
mkdir -p /home/ubuntu/.openhands-state
chown ubuntu:ubuntu /home/ubuntu/.openhands-state

# OpenHandsのDockerイメージをプル
echo "$(date): Pulling OpenHands Docker image"
docker pull docker.all-hands.dev/all-hands-ai/openhands:0.30

# ランタイムイメージをプル
echo "$(date): Pulling runtime Docker image"
docker pull docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik

# OpenHandsコンテナをデタッチモードで実行
echo "$(date): Running OpenHands container"
docker run -d --rm --pull=always \
  -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik \
  -e LOG_ALL_EVENTS=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/ubuntu/.openhands-state:/.openhands-state \
  -p 3000:3000 \
  --add-host host.docker.internal:host-gateway \
  --name openhands-app \
  docker.all-hands.dev/all-hands-ai/openhands:0.30

# Dockerコンテナの状態を確認
echo "$(date): Checking Docker container status"
docker ps -a >> $LOGFILE

# ステータスメッセージを作成
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "$(date): Setup completed. Access at http://${PUBLIC_IP}:3000"
echo "OpenHands setup completed. Access at http://${PUBLIC_IP}:3000" > /home/ubuntu/setup_complete.txt
chown ubuntu:ubuntu /home/ubuntu/setup_complete.txt

# ログファイルの場所を記録
echo "$(date): Log file is available at $LOGFILE"
EOF

echo -e "${GREEN}ユーザーデータスクリプトを作成しました。${NC}"
echo

# インスタンスタイプの選択
echo -e "${YELLOW}インスタンスタイプを選択してください:${NC}"
echo "1) t3.small (2 vCPU, 2 GiB RAM) - 低コスト"
echo "2) t3.medium (2 vCPU, 4 GiB RAM) - バランス"
echo "3) t3.large (2 vCPU, 8 GiB RAM) - 高性能"
echo "4) その他（手動入力）"
read -p "選択してください (1-4): " INSTANCE_TYPE_CHOICE

case $INSTANCE_TYPE_CHOICE in
  1) INSTANCE_TYPE="t3.small" ;;
  2) INSTANCE_TYPE="t3.medium" ;;
  3) INSTANCE_TYPE="t3.large" ;;
  4) read -p "インスタンスタイプを入力してください: " INSTANCE_TYPE ;;
  *) echo -e "${RED}無効な選択です。t3.small を使用します。${NC}"; INSTANCE_TYPE="t3.small" ;;
esac

echo -e "${GREEN}選択されたインスタンスタイプ: $INSTANCE_TYPE${NC}"
echo

# EC2インスタンスの起動
echo -e "${YELLOW}EC2インスタンスを起動しています...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
  --region $REGION \
  --image-id $AMI_ID \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":20,\"DeleteOnTermination\":true}}]" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --user-data file://user_data.sh \
  --query "Instances[0].InstanceId" \
  --output text)

echo -e "${GREEN}インスタンスID: $INSTANCE_ID${NC}"
echo

# インスタンスの状態を待機
echo -e "${YELLOW}インスタンスの起動を待機しています...${NC}"
aws ec2 wait instance-running --region $REGION --instance-ids $INSTANCE_ID
echo -e "${GREEN}インスタンスが起動しました。${NC}"
echo

# パブリックIPアドレスの取得
PUBLIC_IP=$(aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
echo -e "${GREEN}パブリックIPアドレス: $PUBLIC_IP${NC}"
echo

# 接続情報の表示
echo -e "${YELLOW}OpenHandsへのアクセス情報:${NC}"
echo -e "${GREEN}OpenHandsのURL: http://$PUBLIC_IP:3000${NC}"
echo "※インスタンスの初期化とOpenHandsのセットアップには5〜10分かかる場合があります。"
echo "  上記のURLにアクセスできない場合は、しばらく待ってから再試行してください。"
echo
echo -e "${YELLOW}SSHでの接続方法:${NC}"
echo -e "${GREEN}ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP${NC}"
echo

# 接続確認方法の表示
echo -e "${YELLOW}セットアップの進行状況を確認するには:${NC}"
echo -e "${GREEN}ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'sudo cat /var/log/openhands_setup.log'${NC}"
echo

# 終了メッセージ
echo -e "${GREEN}デプロイが完了しました！${NC}"
echo "インスタンスID: $INSTANCE_ID"
echo "パブリックIP: $PUBLIC_IP"
echo "OpenHandsのURL: http://$PUBLIC_IP:3000"
echo "SSHコマンド: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo
echo -e "${YELLOW}インスタンスを終了するには:${NC}"
echo -e "${RED}aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID${NC}"
echo

# 情報をファイルに保存
echo "# OpenHands EC2インスタンス情報" > openhands-instance-info.txt
echo "インスタンスID: $INSTANCE_ID" >> openhands-instance-info.txt
echo "リージョン: $REGION" >> openhands-instance-info.txt
echo "パブリックIP: $PUBLIC_IP" >> openhands-instance-info.txt
echo "OpenHandsのURL: http://$PUBLIC_IP:3000" >> openhands-instance-info.txt
echo "SSHコマンド: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP" >> openhands-instance-info.txt
echo "インスタンス終了コマンド: aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID" >> openhands-instance-info.txt

echo -e "${GREEN}インスタンス情報を openhands-instance-info.txt に保存しました。${NC}"