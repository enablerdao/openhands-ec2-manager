import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../utils/db';
import dotenv from 'dotenv';

dotenv.config();

// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ユーザー登録
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // 入力検証
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    const db = await getDatabase();

    // ユーザー名とメールアドレスの重複チェック
    const existingUser = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ message: 'ユーザー名またはメールアドレスが既に使用されています' });
    }

    // パスワードのハッシュ化
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ユーザーの作成
    const result = await db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // JWTトークンの生成
    const token = jwt.sign({ userId: result.lastID }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'ユーザーが正常に登録されました',
      token,
      user: {
        id: result.lastID,
        username,
        email
      }
    });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ログイン
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 入力検証
    if (!email || !password) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    const db = await getDatabase();

    // ユーザーの検索
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ message: 'メールアドレスまたはパスワードが無効です' });
    }

    // パスワードの検証
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'メールアドレスまたはパスワードが無効です' });
    }

    // JWTトークンの生成
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'ログインに成功しました',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 現在のユーザー情報を取得
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const db = await getDatabase();
    
    // ユーザー情報の取得
    const user = await db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};