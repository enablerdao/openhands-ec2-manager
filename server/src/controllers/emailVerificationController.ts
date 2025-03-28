import { Request, Response } from 'express';
import { getDatabase } from '../utils/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// メール送信の設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

// 確認メールの送信
export const sendVerificationEmail = async (userId: number, email: string, username: string) => {
  try {
    // トークンの生成
    const token = crypto.randomBytes(32).toString('hex');
    
    // データベースにトークンを保存
    const db = getDatabase();
    db.run('UPDATE users SET verification_token = ? WHERE id = ?', [token, userId]);
    
    // 確認用URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    // メールの内容
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@openhands.com',
      to: email,
      subject: 'OpenHands EC2マネージャー - メールアドレスの確認',
      html: `
        <h1>OpenHands EC2マネージャー</h1>
        <p>こんにちは、${username}さん</p>
        <p>OpenHands EC2マネージャーへのご登録ありがとうございます。</p>
        <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">メールアドレスを確認</a>
        <p>このリンクは24時間有効です。</p>
        <p>このメールに心当たりがない場合は、無視してください。</p>
      `
    };
    
    // メールの送信
    await transporter.sendMail(mailOptions);
    
    return true;
  } catch (error) {
    console.error('確認メール送信エラー:', error);
    return false;
  }
};

// メールアドレスの確認
export const verifyEmail = (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'トークンが必要です' });
    }
    
    const db = getDatabase();
    
    // トークンでユーザーを検索
    db.get('SELECT * FROM users WHERE verification_token = ?', [token], (err, user) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (!user) {
        return res.status(400).json({ message: '無効なトークンです' });
      }
      
      // メール確認済みに更新
      db.run('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?', [user.id], (err) => {
        if (err) {
          console.error('データベース更新エラー:', err);
          return res.status(500).json({ message: 'サーバーエラーが発生しました' });
        }
        
        // ポイント履歴に記録
        db.run(
          'INSERT INTO point_transactions (user_id, points, action_type, description) VALUES (?, ?, ?, ?)',
          [user.id, 100, 'SIGNUP_BONUS', 'メール認証完了ボーナス'],
          (err) => {
            if (err) {
              console.error('ポイント履歴記録エラー:', err);
              // エラーがあっても処理は続行
            }
          }
        );
        
        res.json({
          message: 'メールアドレスが確認されました',
          verified: true
        });
      });
    });
  } catch (error) {
    console.error('メール確認エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 確認メールの再送信
export const resendVerificationEmail = (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }
    
    const db = getDatabase();
    
    // ユーザー情報の取得
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'ユーザーが見つかりません' });
      }
      
      if (user.email_verified) {
        return res.status(400).json({ message: 'メールアドレスは既に確認済みです' });
      }
      
      // 確認メールの送信
      const sent = await sendVerificationEmail(user.id, user.email, user.username);
      
      if (sent) {
        res.json({ message: '確認メールを再送信しました' });
      } else {
        res.status(500).json({ message: 'メールの送信に失敗しました' });
      }
    });
  } catch (error) {
    console.error('確認メール再送信エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};