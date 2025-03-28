import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// ルートのインポート
import authRoutes from './routes/auth';
import awsRoutes from './routes/aws';
import instanceRoutes from './routes/instances';
import amiRoutes from './routes/amis';
import securityGroupRoutes from './routes/securityGroups';
import keyPairRoutes from './routes/keyPairs';

// 環境変数の設定
dotenv.config();

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// APIルート
app.use('/api/auth', authRoutes);
app.use('/api/aws', awsRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/amis', amiRoutes);
app.use('/api/security-groups', securityGroupRoutes);
app.use('/api/key-pairs', keyPairRoutes);

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