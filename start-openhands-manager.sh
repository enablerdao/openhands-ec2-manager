#!/bin/bash

# OpenHands EC2マネージャーを起動するスクリプト

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}OpenHands EC2マネージャー起動スクリプト${NC}"
echo

# バックエンドの起動
echo -e "${YELLOW}バックエンドを起動しています...${NC}"
cd /workspace/openhands-ec2-manager/server
node dist/index.js &
BACKEND_PID=$!
echo -e "${GREEN}バックエンドが起動しました (PID: $BACKEND_PID)${NC}"
echo

# フロントエンドの起動
echo -e "${YELLOW}フロントエンドを起動しています...${NC}"
cd /workspace/openhands-ec2-manager/client
npm start &
FRONTEND_PID=$!
echo -e "${GREEN}フロントエンドが起動しました (PID: $FRONTEND_PID)${NC}"
echo

# 終了時の処理
function cleanup {
  echo -e "${YELLOW}アプリケーションを終了しています...${NC}"
  kill $BACKEND_PID
  kill $FRONTEND_PID
  echo -e "${GREEN}終了しました${NC}"
  exit 0
}

# Ctrl+Cで終了時にcleanup関数を実行
trap cleanup SIGINT

echo -e "${GREEN}OpenHands EC2マネージャーが起動しました！${NC}"
echo -e "バックエンド: http://localhost:5000"
echo -e "フロントエンド: http://localhost:3000"
echo
echo -e "${YELLOW}終了するには Ctrl+C を押してください${NC}"

# プロセスが終了するまで待機
wait