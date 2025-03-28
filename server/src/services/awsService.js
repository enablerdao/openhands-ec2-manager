"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpenHandsUserData = exports.createEC2Client = exports.getUserAwsCredentials = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const db_1 = require("../utils/db");
// ユーザーのAWS認証情報を取得
const getUserAwsCredentials = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const db = yield (0, db_1.getDatabase)();
    const credentials = yield db.get('SELECT access_key_id, secret_access_key, region FROM aws_credentials WHERE user_id = ?', [userId]);
    if (!credentials) {
        throw new Error('AWS認証情報が見つかりません');
    }
    return {
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
        region: credentials.region
    };
});
exports.getUserAwsCredentials = getUserAwsCredentials;
// EC2クライアントを作成
const createEC2Client = (userId, region) => __awaiter(void 0, void 0, void 0, function* () {
    const credentials = yield (0, exports.getUserAwsCredentials)(userId);
    return new aws_sdk_1.default.EC2({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: region || credentials.region
    });
});
exports.createEC2Client = createEC2Client;
// OpenHandsのユーザーデータスクリプトを生成
const generateOpenHandsUserData = () => {
    const userData = `#!/bin/bash

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
docker run -d --rm --pull=always \\
  -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik \\
  -e LOG_ALL_EVENTS=true \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v /home/ubuntu/.openhands-state:/.openhands-state \\
  -p 3000:3000 \\
  --add-host host.docker.internal:host-gateway \\
  --name openhands-app \\
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
echo "$(date): Log file is available at $LOGFILE"`;
    // Base64エンコード
    return Buffer.from(userData).toString('base64');
};
exports.generateOpenHandsUserData = generateOpenHandsUserData;
