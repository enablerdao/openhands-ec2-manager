#!/bin/bash

# OpenHandsのセットアップ状況を確認するスクリプト

# カラー表示の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 1 ]; then
  echo -e "${RED}使用方法: $0 <パブリックIPアドレス> [キーペアファイル]${NC}"
  echo "例: $0 35.78.214.144 OpenHands-Key.pem"
  exit 1
fi

PUBLIC_IP=$1
KEY_FILE=${2:-"OpenHands-Key.pem"}

# キーファイルの存在確認
if [ ! -f "$KEY_FILE" ]; then
  echo -e "${RED}エラー: キーファイル '$KEY_FILE' が見つかりません。${NC}"
  exit 1
fi

echo -e "${YELLOW}OpenHandsセットアップ状況確認ツール${NC}"
echo "インスタンスIP: $PUBLIC_IP"
echo "キーファイル: $KEY_FILE"
echo

# SSHでの接続確認
echo -e "${YELLOW}SSHでの接続を確認しています...${NC}"
if ! ssh -i "$KEY_FILE" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP "echo 接続成功" &> /dev/null; then
  echo -e "${RED}SSHでの接続に失敗しました。インスタンスが起動中か、IPアドレスが正しいか確認してください。${NC}"
  exit 1
fi
echo -e "${GREEN}SSHでの接続に成功しました。${NC}"
echo

# セットアップログの確認
echo -e "${YELLOW}セットアップログを確認しています...${NC}"
SETUP_LOG=$(ssh -i "$KEY_FILE" ubuntu@$PUBLIC_IP 'sudo cat /var/log/openhands_setup.log 2>/dev/null || echo "ログファイルが見つかりません"')

if [[ "$SETUP_LOG" == *"ログファイルが見つかりません"* ]]; then
  echo -e "${RED}セットアップログが見つかりません。セットアップが開始されていない可能性があります。${NC}"
  exit 1
fi

# セットアップの進行状況を確認
if [[ "$SETUP_LOG" == *"Setup completed"* ]]; then
  echo -e "${GREEN}セットアップが完了しています！${NC}"
  SETUP_STATUS="完了"
elif [[ "$SETUP_LOG" == *"Pulling OpenHands Docker image"* ]]; then
  echo -e "${YELLOW}OpenHandsのDockerイメージをダウンロード中...${NC}"
  SETUP_STATUS="進行中"
elif [[ "$SETUP_LOG" == *"Updating system"* ]]; then
  echo -e "${YELLOW}システムを更新中...${NC}"
  SETUP_STATUS="進行中"
else
  echo -e "${YELLOW}セットアップが開始されたばかりです...${NC}"
  SETUP_STATUS="開始"
fi

# Dockerコンテナの状態を確認
echo -e "${YELLOW}Dockerコンテナの状態を確認しています...${NC}"
DOCKER_PS=$(ssh -i "$KEY_FILE" ubuntu@$PUBLIC_IP 'sudo docker ps 2>/dev/null || echo "Dockerコマンドが見つかりません"')

if [[ "$DOCKER_PS" == *"Dockerコマンドが見つかりません"* ]]; then
  echo -e "${RED}Dockerがインストールされていないか、コマンドが実行できません。${NC}"
elif [[ "$DOCKER_PS" == *"openhands-app"* ]]; then
  echo -e "${GREEN}OpenHandsコンテナが実行中です！${NC}"
  CONTAINER_STATUS="実行中"
else
  echo -e "${YELLOW}OpenHandsコンテナはまだ起動していません。${NC}"
  CONTAINER_STATUS="未起動"
fi

# OpenHandsへのアクセス確認
echo -e "${YELLOW}OpenHandsへのアクセスを確認しています...${NC}"
if curl -s --connect-timeout 5 http://$PUBLIC_IP:3000 > /dev/null; then
  echo -e "${GREEN}OpenHandsにアクセスできます！${NC}"
  ACCESS_STATUS="可能"
else
  echo -e "${YELLOW}OpenHandsにまだアクセスできません。セットアップが完了するまで待ってください。${NC}"
  ACCESS_STATUS="不可"
fi

# 結果のサマリーを表示
echo
echo -e "${YELLOW}=== セットアップ状況サマリー ===${NC}"
echo -e "セットアップ状態: ${GREEN}$SETUP_STATUS${NC}"
echo -e "コンテナ状態: ${CONTAINER_STATUS}"
echo -e "アクセス状態: ${ACCESS_STATUS}"
echo

# 次のステップを表示
if [[ "$ACCESS_STATUS" == "可能" ]]; then
  echo -e "${GREEN}OpenHandsの準備が完了しました！${NC}"
  echo -e "ブラウザで以下のURLにアクセスしてください: ${GREEN}http://$PUBLIC_IP:3000${NC}"
else
  echo -e "${YELLOW}OpenHandsのセットアップはまだ完了していません。${NC}"
  echo "セットアップには5〜10分かかる場合があります。"
  echo "このスクリプトを再度実行して進行状況を確認してください。"
  
  if [[ "$SETUP_STATUS" == "進行中" ]]; then
    echo
    echo -e "${YELLOW}セットアップログの最新部分:${NC}"
    ssh -i "$KEY_FILE" ubuntu@$PUBLIC_IP 'sudo cat /var/log/openhands_setup.log | tail -20'
  fi
fi