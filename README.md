# OpenHands EC2マネージャー

OpenHandsをEC2上で簡単に立ち上げたり管理するためのWebUIです。

## 機能

- ユーザー認証（登録・ログイン）
- AWS認証情報の管理
- EC2インスタンスの起動（OpenHandsセットアップスクリプト付き）
- 実行中のEC2インスタンスの一覧表示
- インスタンスの管理（起動/停止/終了）
- インスタンスの詳細情報表示
- OpenHandsへのアクセスリンク

## 技術スタック

### フロントエンド
- React.js + TypeScript
- Material-UI（UIコンポーネント）
- React Router（ルーティング）
- Redux Toolkit（状態管理）

### バックエンド
- Node.js + Express
- TypeScript
- AWS SDK for JavaScript
- JWT認証
- SQLite（データベース）

## 開発環境のセットアップ

### 前提条件
- Node.js (v14以上)
- npm (v6以上)
- AWS CLI (設定済み)

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/openhands-ec2-manager.git
cd openhands-ec2-manager
```

2. バックエンドの依存関係をインストール
```bash
cd server
npm install
```

3. フロントエンドの依存関係をインストール
```bash
cd ../client
npm install
```

4. 環境変数の設定
```bash
cd ../server
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定
```

### 開発サーバーの起動

1. バックエンドサーバーを起動
```bash
cd server
npm run dev
```

2. フロントエンドサーバーを起動
```bash
cd ../client
npm start
```

3. ブラウザで http://localhost:3000 にアクセス

## 本番環境へのデプロイ

### ビルド手順

1. フロントエンドをビルド
```bash
cd client
npm run build
```

2. バックエンドをビルド
```bash
cd ../server
npm run build
```

3. 本番環境にデプロイ
```bash
# 本番環境のサーバーにファイルをコピー
scp -r dist/* user@your-server:/path/to/deployment
```

## 使用方法

1. アカウントを作成またはログイン
2. AWS認証情報を設定
3. 新規インスタンスを起動
   - 推奨AMIを選択
   - インスタンスタイプを選択
   - セキュリティグループを設定
   - キーペアを選択または作成
4. インスタンスの起動後、OpenHandsにアクセス

## ライセンス

MIT

## 貢献

プルリクエストは大歓迎です。大きな変更を加える場合は、まずissueを作成して変更内容を議論してください。