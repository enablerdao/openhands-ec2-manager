#!/usr/bin/env python3
"""
GitHub Actionsを有効化するためのPythonスクリプト
使用方法: python enable_github_actions.py <github_token> [--repo REPO]
"""

import argparse
import json
import os
import sys
import requests

# カラー表示の設定
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'  # No Color

def enable_actions(repo_owner: str, repo_name: str, token: str) -> bool:
    """
    リポジトリのGitHub Actionsを有効化する
    """
    print(f"{YELLOW}GitHub Actionsを有効化しています...{NC}")
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/permissions"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "enabled": True,
        "allowed_actions": "all"
    }
    
    response = requests.put(url, headers=headers, json=data)
    
    if response.status_code == 204:
        print(f"{GREEN}GitHub Actionsが有効化されました。{NC}")
        return True
    else:
        print(f"{RED}GitHub Actionsの有効化に失敗しました: {response.status_code} {response.text}{NC}")
        return False

def create_workflow_dispatch(repo_owner: str, repo_name: str, workflow_id: str, branch: str, token: str) -> bool:
    """
    ワークフローを手動で実行する
    """
    print(f"{YELLOW}ワークフロー {workflow_id} を実行しています...{NC}")
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/workflows/{workflow_id}/dispatches"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "ref": branch
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 204:
        print(f"{GREEN}ワークフロー {workflow_id} の実行をトリガーしました。{NC}")
        return True
    else:
        print(f"{RED}ワークフロー {workflow_id} の実行トリガーに失敗しました: {response.status_code} {response.text}{NC}")
        return False

def list_workflows(repo_owner: str, repo_name: str, token: str) -> list:
    """
    リポジトリのワークフローを一覧表示する
    """
    print(f"{YELLOW}ワークフローを一覧表示しています...{NC}")
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/workflows"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        workflows = response.json()["workflows"]
        print(f"{GREEN}ワークフローの一覧を取得しました。{NC}")
        
        print("\n利用可能なワークフロー:")
        for workflow in workflows:
            print(f"- ID: {workflow['id']}, 名前: {workflow['name']}, ファイル: {workflow['path']}")
        
        return workflows
    else:
        print(f"{RED}ワークフローの一覧取得に失敗しました: {response.status_code} {response.text}{NC}")
        return []

def create_branch(repo_owner: str, repo_name: str, branch_name: str, base_branch: str, token: str) -> bool:
    """
    ブランチを作成する
    """
    print(f"{YELLOW}ブランチ {branch_name} を作成しています...{NC}")
    
    # ベースブランチのSHAを取得
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/git/refs/heads/{base_branch}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"{RED}ベースブランチの情報取得に失敗しました: {response.status_code} {response.text}{NC}")
        return False
    
    base_sha = response.json()["object"]["sha"]
    
    # 新しいブランチを作成
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/git/refs"
    data = {
        "ref": f"refs/heads/{branch_name}",
        "sha": base_sha
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        print(f"{GREEN}ブランチ {branch_name} を作成しました。{NC}")
        return True
    elif response.status_code == 422 and "Reference already exists" in response.text:
        print(f"{YELLOW}ブランチ {branch_name} は既に存在します。{NC}")
        return True
    else:
        print(f"{RED}ブランチの作成に失敗しました: {response.status_code} {response.text}{NC}")
        return False

def main():
    """
    メイン処理
    """
    parser = argparse.ArgumentParser(description='GitHub Actionsを有効化するスクリプト')
    parser.add_argument('token', help='GitHubパーソナルアクセストークン')
    parser.add_argument('--repo', help='リポジトリ名（形式: owner/name）', default='enablerdao/openhands-ec2-manager')
    parser.add_argument('--create-branches', action='store_true', help='必要なブランチを作成する')
    parser.add_argument('--run-workflow', help='指定したワークフローを実行する（ワークフローID）')
    parser.add_argument('--branch', help='ワークフロー実行時のブランチ名', default='main')
    parser.add_argument('--list-workflows', action='store_true', help='ワークフローを一覧表示する')
    args = parser.parse_args()
    
    # リポジトリ情報の解析
    repo_parts = args.repo.split('/')
    if len(repo_parts) != 2:
        print(f"{RED}リポジトリ名の形式が正しくありません。'owner/name'の形式で指定してください。{NC}")
        sys.exit(1)
    
    repo_owner, repo_name = repo_parts
    
    print(f"{YELLOW}GitHub Actions有効化ツール{NC}")
    print()
    
    # GitHub Actionsを有効化
    enable_actions(repo_owner, repo_name, args.token)
    
    # ブランチの作成
    if args.create_branches:
        print(f"{YELLOW}必要なブランチを作成しています...{NC}")
        create_branch(repo_owner, repo_name, "develop", "main", args.token)
        create_branch(repo_owner, repo_name, "staging", "main", args.token)
    
    # ワークフローの一覧表示
    if args.list_workflows:
        list_workflows(repo_owner, repo_name, args.token)
    
    # ワークフローの実行
    if args.run_workflow:
        create_workflow_dispatch(repo_owner, repo_name, args.run_workflow, args.branch, args.token)
    
    print(f"\n{GREEN}処理が完了しました！{NC}")

if __name__ == "__main__":
    main()