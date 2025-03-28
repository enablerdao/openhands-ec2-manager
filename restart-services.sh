#!/bin/bash

# 現在のプロセスを停止
if [ -f ~/openhands-ec2-manager/server/server.pid ]; then
  kill $(cat ~/openhands-ec2-manager/server/server.pid) || true
  rm ~/openhands-ec2-manager/server/server.pid
fi

if [ -f ~/openhands-ec2-manager/client/client.pid ]; then
  kill $(cat ~/openhands-ec2-manager/client/client.pid) || true
  rm ~/openhands-ec2-manager/client/client.pid
fi

# サーバーを起動
cd ~/openhands-ec2-manager/server
PORT=5000 node dist/index.js > server.log 2>&1 &
echo $! > server.pid

# クライアントを起動
cd ~/openhands-ec2-manager/client
npx serve -s build -l 8080 > client.log 2>&1 &
echo $! > client.pid

echo "Services restarted successfully"