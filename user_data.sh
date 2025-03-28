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
