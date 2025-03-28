#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const sodium = require('tweetsodium');

// 引数チェック
if (process.argv.length !== 3) {
  console.log('使用方法: node setup-github-secrets.js <github_token>');
  process.exit(1);
}

const GITHUB_TOKEN = process.argv[2];
const REPO_OWNER = 'enablerdao';
const REPO_NAME = 'openhands-ec2-manager';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets`;

// カラー表示の設定
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No Color

console.log(`${YELLOW}GitHub Secrets設定ツール${NC}`);
console.log();

// 公開鍵の取得
console.log(`${YELLOW}リポジトリの公開鍵を取得しています...${NC}`);

let publicKeyResponse;
try {
  publicKeyResponse = JSON.parse(
    execSync(
      `curl -s -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key"`
    ).toString()
  );
} catch (error) {
  console.error(`${RED}公開鍵の取得に失敗しました: ${error.message}${NC}`);
  process.exit(1);
}

const publicKeyId = publicKeyResponse.key_id;
const publicKey = publicKeyResponse.key;

if (!publicKeyId || publicKeyId === 'null') {
  console.error(`${RED}公開鍵の取得に失敗しました。GitHub Tokenが正しいか確認してください。${NC}`);
  process.exit(1);
}

console.log(`${GREEN}公開鍵を取得しました。${NC}`);
console.log();

// 値を暗号化する関数
function encryptSecret(secret, key) {
  // Convert the public key to a Buffer
  const keyBuffer = Buffer.from(key, 'base64');
  // Convert the secret to a Buffer
  const secretBuffer = Buffer.from(secret);
  // Encrypt the secret using libsodium
  const encryptedBytes = sodium.seal(secretBuffer, keyBuffer);
  // Convert the encrypted value to base64
  return Buffer.from(encryptedBytes).toString('base64');
}

// Secretを設定する関数
async function setSecret(name, value) {
  console.log(`${YELLOW}${name}を設定しています...${NC}`);
  
  try {
    const encryptedValue = encryptSecret(value, publicKey);
    
    const response = execSync(
      `curl -X PUT -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github.v3+json" -d '{"encrypted_value":"${encryptedValue}","key_id":"${publicKeyId}"}' "${API_URL}/${name}"`
    ).toString();
    
    console.log(`${GREEN}${name}の設定が完了しました。${NC}`);
    return true;
  } catch (error) {
    console.error(`${RED}${name}の設定に失敗しました: ${error.message}${NC}`);
    return false;
  }
}

// ユーザー入力を取得する関数
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// ファイルから読み込む関数
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`${RED}ファイルの読み込みに失敗しました: ${error.message}${NC}`);
    return null;
  }
}

// メイン処理
async function main() {
  // 開発環境の設定
  console.log(`${YELLOW}開発環境の設定を行います。${NC}`);
  
  const devServerIp = await prompt('開発環境のサーバーIPアドレスを入力してください: ');
  const devSshKeyPath = await prompt('開発環境のSSH秘密鍵のパスを入力してください: ');
  const devSshPrivateKey = readFile(devSshKeyPath);
  
  if (!devSshPrivateKey) {
    console.error(`${RED}SSH秘密鍵の読み込みに失敗しました。${NC}`);
    process.exit(1);
  }
  
  await setSecret('DEV_SERVER_IP', devServerIp);
  await setSecret('DEV_SSH_PRIVATE_KEY', devSshPrivateKey);
  
  console.log(`${GREEN}開発環境の設定が完了しました。${NC}`);
  console.log();
  
  // テスト環境の設定
  console.log(`${YELLOW}テスト環境の設定を行います。${NC}`);
  
  const stagingServerIp = await prompt('テスト環境のサーバーIPアドレスを入力してください: ');
  const stagingSshKeyPath = await prompt('テスト環境のSSH秘密鍵のパスを入力してください: ');
  const stagingSshPrivateKey = readFile(stagingSshKeyPath);
  
  if (!stagingSshPrivateKey) {
    console.error(`${RED}SSH秘密鍵の読み込みに失敗しました。${NC}`);
    process.exit(1);
  }
  
  await setSecret('STAGING_SERVER_IP', stagingServerIp);
  await setSecret('STAGING_SSH_PRIVATE_KEY', stagingSshPrivateKey);
  
  console.log(`${GREEN}テスト環境の設定が完了しました。${NC}`);
  console.log();
  
  // 本番環境の設定
  console.log(`${YELLOW}本番環境の設定を行います。${NC}`);
  
  const prodServerIp = await prompt('本番環境のサーバーIPアドレスを入力してください: ');
  const prodSshKeyPath = await prompt('本番環境のSSH秘密鍵のパスを入力してください: ');
  const prodSshPrivateKey = readFile(prodSshKeyPath);
  
  if (!prodSshPrivateKey) {
    console.error(`${RED}SSH秘密鍵の読み込みに失敗しました。${NC}`);
    process.exit(1);
  }
  
  await setSecret('PROD_SERVER_IP', prodServerIp);
  await setSecret('PROD_SSH_PRIVATE_KEY', prodSshPrivateKey);
  
  console.log(`${GREEN}本番環境の設定が完了しました。${NC}`);
  console.log();
  
  // 完了メッセージ
  console.log(`${GREEN}GitHub Secretsの設定が完了しました！${NC}`);
  console.log('以下のSecretsが設定されました:');
  console.log('- DEV_SERVER_IP');
  console.log('- DEV_SSH_PRIVATE_KEY');
  console.log('- STAGING_SERVER_IP');
  console.log('- STAGING_SSH_PRIVATE_KEY');
  console.log('- PROD_SERVER_IP');
  console.log('- PROD_SSH_PRIVATE_KEY');
  console.log();
  console.log('これらのSecretsはGitHub Actionsのワークフローで使用されます。');
}

// 必要なパッケージをインストール
try {
  console.log(`${YELLOW}必要なパッケージをインストールしています...${NC}`);
  execSync('npm install tweetsodium --no-save');
  console.log(`${GREEN}パッケージのインストールが完了しました。${NC}`);
  console.log();
  
  // メイン処理を実行
  main().catch(error => {
    console.error(`${RED}エラーが発生しました: ${error.message}${NC}`);
    process.exit(1);
  });
} catch (error) {
  console.error(`${RED}パッケージのインストールに失敗しました: ${error.message}${NC}`);
  process.exit(1);
}