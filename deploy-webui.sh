#!/bin/bash

# OpenHands EC2マネージャーのWebUIをEC2インスタンスにデプロイするスクリプト

# 変数の設定
EC2_IP="35.78.114.51"
KEY_FILE="OpenHands-Key.pem"
SERVER_PORT=5000
CLIENT_PORT=8080

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}OpenHands EC2マネージャーWebUIデプロイツール${NC}"
echo

# SSHでの接続確認
echo -e "${YELLOW}SSHでの接続を確認しています...${NC}"
if ! ssh -i $KEY_FILE -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$EC2_IP "echo 接続成功" &> /dev/null; then
  echo -e "${RED}SSHでの接続に失敗しました。インスタンスが起動中か、IPアドレスが正しいか確認してください。${NC}"
  exit 1
fi
echo -e "${GREEN}SSHでの接続に成功しました。${NC}"
echo

# 必要なディレクトリを作成
echo -e "${YELLOW}必要なディレクトリを作成しています...${NC}"
ssh -i $KEY_FILE ubuntu@$EC2_IP "mkdir -p ~/openhands-ec2-manager/server/dist ~/openhands-ec2-manager/client/build"
echo -e "${GREEN}ディレクトリを作成しました。${NC}"
echo

# サーバーファイルをコピー
echo -e "${YELLOW}サーバーファイルをコピーしています...${NC}"
scp -i $KEY_FILE -r /workspace/openhands-ec2-manager/server/dist/* ubuntu@$EC2_IP:~/openhands-ec2-manager/server/dist/
scp -i $KEY_FILE /workspace/openhands-ec2-manager/server/package.json ubuntu@$EC2_IP:~/openhands-ec2-manager/server/
echo -e "${GREEN}サーバーファイルをコピーしました。${NC}"
echo

# クライアントファイルをコピー
echo -e "${YELLOW}クライアントファイルをコピーしています...${NC}"
scp -i $KEY_FILE -r /workspace/openhands-ec2-manager/client/build/* ubuntu@$EC2_IP:~/openhands-ec2-manager/client/build/
echo -e "${GREEN}クライアントファイルをコピーしました。${NC}"
echo

# 依存関係をインストール
echo -e "${YELLOW}サーバーの依存関係をインストールしています...${NC}"
ssh -i $KEY_FILE ubuntu@$EC2_IP "cd ~/openhands-ec2-manager/server && npm install --production"
echo -e "${GREEN}サーバーの依存関係をインストールしました。${NC}"
echo

# サーバー起動スクリプトを作成
echo -e "${YELLOW}サーバー起動スクリプトを作成しています...${NC}"
cat > /tmp/start-server.sh << EOF
#!/bin/bash
cd ~/openhands-ec2-manager/server
PORT=$SERVER_PORT node dist/index.js > server.log 2>&1 &
echo \$! > server.pid
EOF

scp -i $KEY_FILE /tmp/start-server.sh ubuntu@$EC2_IP:~/openhands-ec2-manager/
ssh -i $KEY_FILE ubuntu@$EC2_IP "chmod +x ~/openhands-ec2-manager/start-server.sh"
echo -e "${GREEN}サーバー起動スクリプトを作成しました。${NC}"
echo

# クライアント起動スクリプトを作成
echo -e "${YELLOW}クライアント起動スクリプトを作成しています...${NC}"
cat > /tmp/start-client.sh << EOF
#!/bin/bash
cd ~/openhands-ec2-manager/client
npx serve -s build -l $CLIENT_PORT > client.log 2>&1 &
echo \$! > client.pid
EOF

scp -i $KEY_FILE /tmp/start-client.sh ubuntu@$EC2_IP:~/openhands-ec2-manager/
ssh -i $KEY_FILE ubuntu@$EC2_IP "chmod +x ~/openhands-ec2-manager/start-client.sh"
echo -e "${GREEN}クライアント起動スクリプトを作成しました。${NC}"
echo

# サーバーとクライアントを起動
echo -e "${YELLOW}サーバーとクライアントを起動しています...${NC}"
ssh -i $KEY_FILE ubuntu@$EC2_IP "cd ~/openhands-ec2-manager && npm install -g serve && ./start-server.sh && ./start-client.sh"
echo -e "${GREEN}サーバーとクライアントを起動しました。${NC}"
echo

# 起動確認
echo -e "${YELLOW}サーバーとクライアントの起動を確認しています...${NC}"
sleep 5
SERVER_PID=$(ssh -i $KEY_FILE ubuntu@$EC2_IP "cat ~/openhands-ec2-manager/server/server.pid 2>/dev/null || echo 'Not running'")
CLIENT_PID=$(ssh -i $KEY_FILE ubuntu@$EC2_IP "cat ~/openhands-ec2-manager/client/client.pid 2>/dev/null || echo 'Not running'")

if [[ "$SERVER_PID" != "Not running" ]]; then
  echo -e "${GREEN}サーバーが起動しています (PID: $SERVER_PID)${NC}"
else
  echo -e "${RED}サーバーの起動に失敗しました。${NC}"
fi

if [[ "$CLIENT_PID" != "Not running" ]]; then
  echo -e "${GREEN}クライアントが起動しています (PID: $CLIENT_PID)${NC}"
else
  echo -e "${RED}クライアントの起動に失敗しました。${NC}"
fi
echo

# アクセス情報の表示
echo -e "${YELLOW}OpenHands EC2マネージャーWebUIへのアクセス情報:${NC}"
echo -e "${GREEN}WebUI URL: http://$EC2_IP:$CLIENT_PORT${NC}"
echo -e "${GREEN}API URL: http://$EC2_IP:$SERVER_PORT${NC}"
echo
echo -e "${YELLOW}OpenHandsへのアクセス情報:${NC}"
echo -e "${GREEN}OpenHands URL: http://$EC2_IP:3000${NC}"
echo

# 終了メッセージ
echo -e "${GREEN}デプロイが完了しました！${NC}"
echo -e "WebUIにアクセスして、AWS認証情報を設定し、EC2インスタンスを管理できます。"
echo