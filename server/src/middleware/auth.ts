import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// リクエストにユーザーIDを追加するための型拡張
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// 認証ミドルウェア
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // ヘッダーからトークンを取得
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: '認証トークンがありません' });
    return;
  }

  try {
    // トークンを検証
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ message: '無効なトークンです' });
    return;
  }
};