#!/usr/bin/env python3
"""
GitHub Secretsを設定するためのPythonスクリプト
使用方法: python setup_github_secrets.py <github_token> [--config CONFIG_FILE]
"""

import argparse
import base64
import json
import os
import sys
from getpass import getpass
import requests
from nacl import encoding, public

# カラー表示の設定
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'  # No Color

def encrypt_secret(public_key: str, secret_value: str) -> str:
    """
    公開鍵を使用してシークレット値を暗号化する
    """
    public_key = public.PublicKey(public_key.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def set_secret(repo_owner: str, repo_name: str, secret_name: str, secret_value: str, public_key_id: str, encrypted_value: str, token: str) -> bool:
    """
    GitHub Secretを設定する
    """
    print(f"{YELLOW}{secret_name}を設定しています...{NC}")
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/secrets/{secret_name}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "encrypted_value": encrypted_value,
        "key_id": public_key_id
    }
    
    response = requests.put(url, headers=headers, json=data)
    
    if response.status_code in [201, 204]:
        print(f"{GREEN}{secret_name}の設定が完了しました。{NC}")
        return True
    else:
        print(f"{RED}{secret_name}の設定に失敗しました: {response.status_code} {response.text}{NC}")
        return False

def get_public_key(repo_owner: str, repo_name: str, token: str) -> tuple:
    """
    リポジトリの公開鍵を取得する
    """
    print(f"{YELLOW}リポジトリの公開鍵を取得しています...{NC}")
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/secrets/public-key"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"{GREEN}公開鍵を取得しました。{NC}")
        return data["key"], data["key_id"]
    else:
        print(f"{RED}公開鍵の取得に失敗しました: {response.status_code} {response.text}{NC}")
        sys.exit(1)

def read_file(file_path: str) -> str:
    """
    ファイルを読み込む
    """
    try:
        with open(os.path.expanduser(file_path), 'r') as f:
            return f.read()
    except Exception as e:
        print(f"{RED}ファイルの読み込みに失敗しました: {str(e)}{NC}")
        return None

def interactive_setup(repo_owner: str, repo_name: str, token: str) -> None:
    """
    対話形式でGitHub Secretsを設定する
    """
    # 公開鍵の取得
    public_key, public_key_id = get_public_key(repo_owner, repo_name, token)
    print()
    
    # 開発環境の設定
    print(f"{YELLOW}開発環境の設定を行います。{NC}")
    
    dev_server_ip = input("開発環境のサーバーIPアドレスを入力してください: ")
    dev_ssh_key_path = input("開発環境のSSH秘密鍵のパスを入力してください: ")
    dev_ssh_private_key = read_file(dev_ssh_key_path)
    
    if not dev_ssh_private_key:
        print(f"{RED}SSH秘密鍵の読み込みに失敗しました。{NC}")
        sys.exit(1)
    
    # 暗号化と設定
    encrypted_dev_server_ip = encrypt_secret(public_key, dev_server_ip)
    encrypted_dev_ssh_private_key = encrypt_secret(public_key, dev_ssh_private_key)
    
    set_secret(repo_owner, repo_name, "DEV_SERVER_IP", dev_server_ip, public_key_id, encrypted_dev_server_ip, token)
    set_secret(repo_owner, repo_name, "DEV_SSH_PRIVATE_KEY", dev_ssh_private_key, public_key_id, encrypted_dev_ssh_private_key, token)
    
    print(f"{GREEN}開発環境の設定が完了しました。{NC}")
    print()
    
    # テスト環境の設定
    print(f"{YELLOW}テスト環境の設定を行います。{NC}")
    
    staging_server_ip = input("テスト環境のサーバーIPアドレスを入力してください: ")
    staging_ssh_key_path = input("テスト環境のSSH秘密鍵のパスを入力してください: ")
    staging_ssh_private_key = read_file(staging_ssh_key_path)
    
    if not staging_ssh_private_key:
        print(f"{RED}SSH秘密鍵の読み込みに失敗しました。{NC}")
        sys.exit(1)
    
    # 暗号化と設定
    encrypted_staging_server_ip = encrypt_secret(public_key, staging_server_ip)
    encrypted_staging_ssh_private_key = encrypt_secret(public_key, staging_ssh_private_key)
    
    set_secret(repo_owner, repo_name, "STAGING_SERVER_IP", staging_server_ip, public_key_id, encrypted_staging_server_ip, token)
    set_secret(repo_owner, repo_name, "STAGING_SSH_PRIVATE_KEY", staging_ssh_private_key, public_key_id, encrypted_staging_ssh_private_key, token)
    
    print(f"{GREEN}テスト環境の設定が完了しました。{NC}")
    print()
    
    # 本番環境の設定
    print(f"{YELLOW}本番環境の設定を行います。{NC}")
    
    prod_server_ip = input("本番環境のサーバーIPアドレスを入力してください: ")
    prod_ssh_key_path = input("本番環境のSSH秘密鍵のパスを入力してください: ")
    prod_ssh_private_key = read_file(prod_ssh_key_path)
    
    if not prod_ssh_private_key:
        print(f"{RED}SSH秘密鍵の読み込みに失敗しました。{NC}")
        sys.exit(1)
    
    # 暗号化と設定
    encrypted_prod_server_ip = encrypt_secret(public_key, prod_server_ip)
    encrypted_prod_ssh_private_key = encrypt_secret(public_key, prod_ssh_private_key)
    
    set_secret(repo_owner, repo_name, "PROD_SERVER_IP", prod_server_ip, public_key_id, encrypted_prod_server_ip, token)
    set_secret(repo_owner, repo_name, "PROD_SSH_PRIVATE_KEY", prod_ssh_private_key, public_key_id, encrypted_prod_ssh_private_key, token)
    
    print(f"{GREEN}本番環境の設定が完了しました。{NC}")
    print()

def config_file_setup(config_file: str, repo_owner: str, repo_name: str, token: str) -> None:
    """
    設定ファイルからGitHub Secretsを設定する
    """
    # 設定ファイルの読み込み
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print(f"{RED}設定ファイルの読み込みに失敗しました: {str(e)}{NC}")
        sys.exit(1)
    
    # 公開鍵の取得
    public_key, public_key_id = get_public_key(repo_owner, repo_name, token)
    print()
    
    # 開発環境の設定
    print(f"{YELLOW}開発環境の設定を行います。{NC}")
    
    dev_server_ip = config["environments"]["dev"]["server_ip"]
    dev_ssh_key_path = config["environments"]["dev"]["ssh_key_path"]
    dev_ssh_private_key = read_file(dev_ssh_key_path)
    
    if not dev_ssh_private_key:
        print(f"{RED}SSH秘密鍵の読み込みに失敗しました。{NC}")
        sys.exit(1)
    
    # 暗号化と設定
    encrypted_dev_server_ip = encrypt_secret(public_key, dev_server_ip)
    encrypted_dev_ssh_private_key = encrypt_secret(public_key, dev_ssh_private_key)
    
    set_secret(repo_owner, repo_name, "DEV_SERVER_IP", dev_server_ip, public_key_id, encrypted_dev_server_ip, token)
    set_secret(repo_owner, repo_name, "DEV_SSH_PRIVATE_KEY", dev_ssh_private_key, public_key_id, encrypted_dev_ssh_private_key, token)
    
    print(f"{GREEN}開発環境の設定が完了しました。{NC}")
    print()
    
    # テスト環境の設定
    print(f"{YELLOW}テスト環境の設定を行います。{NC}")
    
    staging_server_ip = config["environments"]["staging"]["server_ip"]
    staging_ssh_key_path = config["environments"]["staging"]["ssh_key_path"]
    staging_ssh_private_key = read_file(staging_ssh_key_path)
    
    if not staging_ssh_private_key:
        print(f"{RED}SSH秘密鍵の読み込みに失敗しました。{NC}")
        sys.exit(1)
    
    # 暗号化と設定
    encrypted_staging_server_ip = encrypt_secret(public_key, staging_server_ip)
    encrypted_staging_ssh_private_key = encrypt_secret(public_key, staging_ssh_private_key)
    
    set_secret(repo_owner, repo_name, "STAGING_SERVER_IP", staging_server_ip, public_key_id, encrypted_staging_server_ip, token)
    set_secret(repo_owner, repo_name, "STAGING_SSH_PRIVATE_KEY", staging_ssh_private_key, public_key_id, encrypted_staging_ssh_private_key, token)
    
    print(f"{GREEN}テスト環境の設定が完了しました。{NC}")
    print()
    
    # 本番環境の設定
    print(f"{YELLOW}本番環境の設定を行います。{NC}")
    
    prod_server_ip = config["environments"]["production"]["server_ip"]
    prod_ssh_key_path = config["environments"]["production"]["ssh_key_path"]
    prod_ssh_private_key = read_file(prod_ssh_key_path)
    
    if not prod_ssh_private_key:
        print(f"{RED}SSH秘密鍵の読み込みに失敗しました。{NC}")
        sys.exit(1)
    
    # 暗号化と設定
    encrypted_prod_server_ip = encrypt_secret(public_key, prod_server_ip)
    encrypted_prod_ssh_private_key = encrypt_secret(public_key, prod_ssh_private_key)
    
    set_secret(repo_owner, repo_name, "PROD_SERVER_IP", prod_server_ip, public_key_id, encrypted_prod_server_ip, token)
    set_secret(repo_owner, repo_name, "PROD_SSH_PRIVATE_KEY", prod_ssh_private_key, public_key_id, encrypted_prod_ssh_private_key, token)
    
    print(f"{GREEN}本番環境の設定が完了しました。{NC}")
    print()

def main():
    """
    メイン処理
    """
    parser = argparse.ArgumentParser(description='GitHub Secretsを設定するスクリプト')
    parser.add_argument('token', help='GitHubパーソナルアクセストークン')
    parser.add_argument('--config', help='設定ファイルのパス')
    parser.add_argument('--repo', help='リポジトリ名（形式: owner/name）', default='enablerdao/openhands-ec2-manager')
    args = parser.parse_args()
    
    # リポジトリ情報の解析
    repo_parts = args.repo.split('/')
    if len(repo_parts) != 2:
        print(f"{RED}リポジトリ名の形式が正しくありません。'owner/name'の形式で指定してください。{NC}")
        sys.exit(1)
    
    repo_owner, repo_name = repo_parts
    
    print(f"{YELLOW}GitHub Secrets設定ツール{NC}")
    print()
    
    # 必要なパッケージのインストール確認
    try:
        import nacl
    except ImportError:
        print(f"{YELLOW}必要なパッケージをインストールしています...{NC}")
        os.system("pip install pynacl requests")
        print(f"{GREEN}パッケージのインストールが完了しました。{NC}")
        print()
        # モジュールを再インポート
        import nacl
    
    # 設定方法の選択
    if args.config:
        config_file_setup(args.config, repo_owner, repo_name, args.token)
    else:
        interactive_setup(repo_owner, repo_name, args.token)
    
    # 完了メッセージ
    print(f"{GREEN}GitHub Secretsの設定が完了しました！{NC}")
    print("以下のSecretsが設定されました:")
    print("- DEV_SERVER_IP")
    print("- DEV_SSH_PRIVATE_KEY")
    print("- STAGING_SERVER_IP")
    print("- STAGING_SSH_PRIVATE_KEY")
    print("- PROD_SERVER_IP")
    print("- PROD_SSH_PRIVATE_KEY")
    print()
    print("これらのSecretsはGitHub Actionsのワークフローで使用されます。")

if __name__ == "__main__":
    main()