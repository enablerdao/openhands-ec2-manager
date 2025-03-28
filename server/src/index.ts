import app from './app';
import dotenv from 'dotenv';

// 環境変数の設定
dotenv.config();

const PORT = process.env.PORT || 5000;

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});