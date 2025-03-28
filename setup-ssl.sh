#!/bin/bash

# 環境に応じてドメイン名を設定
# 開発環境の場合
DOMAIN="dev.teai.io"
# テスト環境の場合
# DOMAIN="staging.teai.io"
# 本番環境の場合
# DOMAIN="teai.io"

# メールアドレスを設定
EMAIL="admin@teai.io"

# Certbotのインストール
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Nginxの設定
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Nginxの設定ファイルを作成
cat > /tmp/nginx-config << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:8080;  # クライアントアプリのポート
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:5000;  # サーバーAPIのポート
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo mv /tmp/nginx-config /etc/nginx/sites-available/$DOMAIN
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL証明書の取得
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# 証明書の自動更新を確認
sudo certbot renew --dry-run