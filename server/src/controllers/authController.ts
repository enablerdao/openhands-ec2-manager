import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../utils/db';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { sendVerificationEmail } from './emailVerificationController';

dotenv.config();

// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ユーザー登録
export const register = (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // 入力検証
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    const db = getDatabase();

    // ユーザー名とメールアドレスの重複チェック
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, existingUser) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }

      if (existingUser) {
        return res.status(400).json({ message: 'ユーザー名またはメールアドレスが既に使用されています' });
      }

      try {
        // パスワードのハッシュ化
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ユーザーの作成
        db.run('INSERT INTO users (username, email, password, points, email_verified) VALUES (?, ?, ?, ?, ?)', 
          [username, email, hashedPassword, 0, 0], 
          async function(err) {
            if (err) {
              console.error('ユーザー作成エラー:', err);
              return res.status(500).json({ message: 'サーバーエラーが発生しました' });
            }

            // JWTトークンの生成
            const userId = this.lastID;
            const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });

            // 確認メールの送信
            try {
              await sendVerificationEmail(userId, email, username);
            } catch (error) {
              console.error('確認メール送信エラー:', error);
              // メール送信エラーでも処理は続行
            }

            res.status(201).json({
              message: 'ユーザーが正常に登録されました。メールアドレスの確認を行ってください。',
              token,
              user: {
                id: userId,
                username,
                email,
                points: 0,
                email_verified: false
              }
            });
        });
      } catch (error) {
        console.error('パスワードハッシュ化エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
    });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ログイン
export const login = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 入力検証
    if (!email || !password) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    const db = getDatabase();

    // ユーザーの検索
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }

      if (!user) {
        return res.status(400).json({ message: 'メールアドレスまたはパスワードが無効です' });
      }

      try {
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
            email: user.email,
            points: user.points,
            email_verified: user.email_verified === 1
          }
        });
      } catch (error) {
        console.error('パスワード検証エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
    });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 現在のユーザー情報を取得
export const getMe = (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const db = getDatabase();
    
    // ユーザー情報の取得
    db.get('SELECT id, username, email, points, email_verified, created_at FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'ユーザーが見つかりません' });
      }

      res.json({
        user
      });
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};