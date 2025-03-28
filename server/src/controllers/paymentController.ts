import { Request, Response } from 'express';
import { getDatabase } from '../utils/db';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { addPoints } from './pointsController';

dotenv.config();

// Stripeの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// 決済セッションの作成
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }
    
    const { amount } = req.body;
    
    // 金額の検証
    if (!amount || amount !== 5000) {
      return res.status(400).json({ message: '無効な金額です。現在は5000円のみ対応しています。' });
    }
    
    // ポイント数の計算（5000円で500ポイント）
    const pointsToAdd = 500;
    
    // ユーザー情報の取得
    const db = getDatabase();
    db.get('SELECT email FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'ユーザーが見つかりません' });
      }
      
      try {
        // Stripeチェックアウトセッションの作成
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'jpy',
                product_data: {
                  name: 'OpenHands ポイントチャージ',
                  description: `${pointsToAdd}ポイント`
                },
                unit_amount: amount
              },
              quantity: 1
            }
          ],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
          customer_email: user.email,
          metadata: {
            userId: userId.toString(),
            pointsToAdd: pointsToAdd.toString()
          }
        });
        
        res.json({
          sessionId: session.id,
          url: session.url
        });
      } catch (error) {
        console.error('Stripeセッション作成エラー:', error);
        res.status(500).json({ message: 'Stripe決済の初期化に失敗しました' });
      }
    });
  } catch (error) {
    console.error('決済セッション作成エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// 決済の確認
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'セッションIDが必要です' });
    }
    
    try {
      // セッション情報の取得
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: '決済が完了していません' });
      }
      
      const userId = parseInt(session.metadata?.userId || '0');
      const pointsToAdd = parseInt(session.metadata?.pointsToAdd || '0');
      
      if (!userId || !pointsToAdd) {
        return res.status(400).json({ message: '無効なセッションデータです' });
      }
      
      const db = getDatabase();
      
      // 既に処理済みかチェック
      db.get('SELECT * FROM payments WHERE stripe_payment_id = ?', [sessionId], async (err, payment) => {
        if (err) {
          console.error('データベースエラー:', err);
          return res.status(500).json({ message: 'サーバーエラーが発生しました' });
        }
        
        if (payment) {
          return res.json({
            success: true,
            message: '決済は既に処理済みです',
            pointsAdded: pointsToAdd
          });
        }
        
        // 決済情報を記録
        db.run(
          'INSERT INTO payments (user_id, amount, points_added, stripe_payment_id, status) VALUES (?, ?, ?, ?, ?)',
          [userId, session.amount_total, pointsToAdd, sessionId, 'completed'],
          async function(err) {
            if (err) {
              console.error('決済記録エラー:', err);
              return res.status(500).json({ message: 'サーバーエラーが発生しました' });
            }
            
            const paymentId = this.lastID;
            
            // ポイントを追加
            const added = await addPoints(
              userId,
              pointsToAdd,
              'PURCHASE',
              'ポイント購入',
              paymentId
            );
            
            if (!added) {
              return res.status(500).json({ message: 'ポイントの追加に失敗しました' });
            }
            
            res.json({
              success: true,
              message: '決済が完了し、ポイントが追加されました',
              pointsAdded: pointsToAdd
            });
          }
        );
      });
    } catch (error) {
      console.error('Stripe決済確認エラー:', error);
      res.status(500).json({ message: 'Stripe決済の確認に失敗しました' });
    }
  } catch (error) {
    console.error('決済確認エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Stripeウェブフック
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  
  if (!sig) {
    return res.status(400).json({ message: 'Stripe署名が見つかりません' });
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    
    // イベントタイプに応じた処理
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // セッションが支払い済みの場合
        if (session.payment_status === 'paid') {
          const userId = parseInt(session.metadata?.userId || '0');
          const pointsToAdd = parseInt(session.metadata?.pointsToAdd || '0');
          
          if (userId && pointsToAdd) {
            const db = getDatabase();
            
            // 既に処理済みかチェック
            db.get('SELECT * FROM payments WHERE stripe_payment_id = ?', [session.id], async (err, payment) => {
              if (err || payment) {
                // エラーまたは既に処理済みの場合は何もしない
                return;
              }
              
              // 決済情報を記録
              db.run(
                'INSERT INTO payments (user_id, amount, points_added, stripe_payment_id, status) VALUES (?, ?, ?, ?, ?)',
                [userId, session.amount_total, pointsToAdd, session.id, 'completed'],
                async function(err) {
                  if (err) {
                    console.error('決済記録エラー:', err);
                    return;
                  }
                  
                  const paymentId = this.lastID;
                  
                  // ポイントを追加
                  await addPoints(
                    userId,
                    pointsToAdd,
                    'PURCHASE',
                    'ポイント購入',
                    paymentId
                  );
                }
              );
            });
          }
        }
        break;
        
      default:
        // その他のイベントは無視
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Stripeウェブフックエラー:', error);
    res.status(400).json({ message: 'Webhookの処理に失敗しました' });
  }
};

// 決済履歴の取得
export const getPaymentHistory = (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const db = getDatabase();
    
    // 決済履歴の総数を取得
    db.get(
      'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
      [userId],
      (err, result) => {
        if (err) {
          console.error('決済履歴カウントエラー:', err);
          return res.status(500).json({ message: 'サーバーエラーが発生しました' });
        }
        
        const total = result.total;
        
        // 決済履歴を取得
        db.all(
          'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [userId, limit, offset],
          (err, payments) => {
            if (err) {
              console.error('決済履歴取得エラー:', err);
              return res.status(500).json({ message: 'サーバーエラーが発生しました' });
            }
            
            res.json({
              payments: payments || [],
              pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('決済履歴取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};