import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// ルートのインポート
import apiRoutes from './routes';

// 環境変数の設定
dotenv.config();

const app = express();

// ミドルウェア
app.use(cors({
  origin: '*', // すべてのオリジンを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// APIルート
app.use('/api', apiRoutes);

// 本番環境ではReactアプリを提供
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'サーバーエラーが発生しました',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;