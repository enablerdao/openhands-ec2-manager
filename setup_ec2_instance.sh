#!/bin/bash

# OpenHands EC2インスタンスセットアップスクリプト
# 使用方法: ./setup_ec2_instance.sh [環境名]

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -ne 1 ]; then
  echo -e "${YELLOW}使用方法: ./setup_ec2_instance.sh [環境名]${NC}"
  echo "環境名: dev, staging, production"
  exit 1
fi

ENV=$1

# 環境名の検証
if [[ "$ENV" != "dev" && "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo -e "${RED}無効な環境名です。dev, staging, productionのいずれかを指定してください。${NC}"
  exit 1
fi

# ドメイン名の設定
if [ "$ENV" == "dev" ]; then
  DOMAIN="dev.teai.io"
elif [ "$ENV" == "staging" ]; then
  DOMAIN="staging.teai.io"
else
  DOMAIN="teai.io"
fi

echo -e "${YELLOW}OpenHands EC2インスタンスセットアップツール - $ENV 環境${NC}"
echo "ドメイン: $DOMAIN"
echo

# システムアップデート
echo -e "${YELLOW}システムをアップデートしています...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}システムのアップデートが完了しました。${NC}"
echo

# 必要なパッケージのインストール
echo -e "${YELLOW}必要なパッケージをインストールしています...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm git
echo -e "${GREEN}パッケージのインストールが完了しました。${NC}"
echo

# Node.jsのバージョン確認と更新
NODE_VERSION=$(node -v)
echo -e "現在のNode.jsバージョン: ${YELLOW}$NODE_VERSION${NC}"

# Node.js 18以上が必要
if [[ "$NODE_VERSION" < "v18" ]]; then
  echo -e "${YELLOW}Node.jsをバージョン18にアップデートしています...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  echo -e "${GREEN}Node.jsのアップデートが完了しました: $(node -v)${NC}"
fi
echo

# アプリケーションディレクトリの作成
echo -e "${YELLOW}アプリケーションディレクトリを作成しています...${NC}"
mkdir -p ~/openhands-ec2-manager/server/dist ~/openhands-ec2-manager/client/build
echo -e "${GREEN}ディレクトリの作成が完了しました。${NC}"
echo

# Nginxの設定
echo -e "${YELLOW}Nginxの設定を行っています...${NC}"
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        root /home/ubuntu/openhands-ec2-manager/client/build;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
echo -e "${GREEN}Nginxの設定が完了しました。${NC}"
echo

# SSL証明書の設定
echo -e "${YELLOW}SSL証明書を設定しています...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@teai.io
echo -e "${GREEN}SSL証明書の設定が完了しました。${NC}"
echo

# PM2のインストール
echo -e "${YELLOW}PM2をインストールしています...${NC}"
sudo npm install -g pm2
echo -e "${GREEN}PM2のインストールが完了しました。${NC}"
echo

# PM2の起動スクリプトの作成
echo -e "${YELLOW}PM2の起動スクリプトを作成しています...${NC}"
cat > ~/openhands-ec2-manager/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'openhands-server',
    script: 'server/dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: '$ENV',
      PORT: 3000
    }
  }]
};
EOF
echo -e "${GREEN}PM2の起動スクリプトの作成が完了しました。${NC}"
echo

# サービス再起動スクリプトのコピー
echo -e "${YELLOW}サービス再起動スクリプトをコピーしています...${NC}"
cat > ~/openhands-ec2-manager/restart-services.sh << EOF
#!/bin/bash

# サービス再起動スクリプト

# PM2を使用してサーバーを再起動
cd ~/openhands-ec2-manager
pm2 reload ecosystem.config.js

# Nginxを再起動
sudo systemctl restart nginx

echo "サービスの再起動が完了しました。"
EOF

chmod +x ~/openhands-ec2-manager/restart-services.sh
echo -e "${GREEN}サービス再起動スクリプトのコピーが完了しました。${NC}"
echo

# 自動起動の設定
echo -e "${YELLOW}PM2の自動起動を設定しています...${NC}"
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
echo -e "${GREEN}PM2の自動起動の設定が完了しました。${NC}"
echo

# ファイアウォールの設定
echo -e "${YELLOW}ファイアウォールを設定しています...${NC}"
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
echo -e "${GREEN}ファイアウォールの設定が完了しました。${NC}"
echo

# 完了メッセージ
echo -e "${GREEN}EC2インスタンスのセットアップが完了しました！${NC}"
echo "ドメイン: $DOMAIN"
echo
echo "次のステップ:"
echo "1. GitHub Actionsのワークフローを設定してください。"
echo "2. GitHub Secretsを設定してください。"
echo "3. アプリケーションをデプロイしてください。"
echo
echo "詳細は GITHUB_ACTIONS_SETUP.md を参照してください。"