import { Request, Response } from 'express';
import { getDatabase } from '../utils/db';

// ユーザーのポイント残高を取得
export const getPoints = (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }
    
    const db = getDatabase();
    
    // ユーザーのポイント残高を取得
    db.get('SELECT points FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ message: 'サーバーエラーが発生しました' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'ユーザーが見つかりません' });
      }
      
      // ポイント履歴を取得
      db.all(
        'SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [userId],
        (err, transactions) => {
          if (err) {
            console.error('ポイント履歴取得エラー:', err);
            return res.status(500).json({ message: 'サーバーエラーが発生しました' });
          }
          
          res.json({
            points: user.points,
            transactions: transactions || []
          });
        }
      );
    });
  } catch (error) {
    console.error('ポイント取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// ポイントを消費
export const consumePoints = (userId: number, points: number, actionType: string, description: string, relatedEntityId?: number) => {
  return new Promise<boolean>((resolve, reject) => {
    try {
      const db = getDatabase();
      
      // トランザクション開始
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // ユーザーのポイント残高を確認
        db.get('SELECT points FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) {
            console.error('ポイント残高確認エラー:', err);
            db.run('ROLLBACK');
            return resolve(false);
          }
          
          if (!user || user.points < points) {
            db.run('ROLLBACK');
            return resolve(false);
          }
          
          // ポイントを消費
          db.run('UPDATE users SET points = points - ? WHERE id = ?', [points, userId], (err) => {
            if (err) {
              console.error('ポイント消費エラー:', err);
              db.run('ROLLBACK');
              return resolve(false);
            }
            
            // ポイント履歴に記録
            db.run(
              'INSERT INTO point_transactions (user_id, points, action_type, description, related_entity_id) VALUES (?, ?, ?, ?, ?)',
              [userId, -points, actionType, description, relatedEntityId || null],
              (err) => {
                if (err) {
                  console.error('ポイント履歴記録エラー:', err);
                  db.run('ROLLBACK');
                  return resolve(false);
                }
                
                db.run('COMMIT');
                resolve(true);
              }
            );
          });
        });
      });
    } catch (error) {
      console.error('ポイント消費エラー:', error);
      resolve(false);
    }
  });
};

// ポイントを追加
export const addPoints = (userId: number, points: number, actionType: string, description: string, relatedEntityId?: number) => {
  return new Promise<boolean>((resolve, reject) => {
    try {
      const db = getDatabase();
      
      // トランザクション開始
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // ポイントを追加
        db.run('UPDATE users SET points = points + ? WHERE id = ?', [points, userId], (err) => {
          if (err) {
            console.error('ポイント追加エラー:', err);
            db.run('ROLLBACK');
            return resolve(false);
          }
          
          // ポイント履歴に記録
          db.run(
            'INSERT INTO point_transactions (user_id, points, action_type, description, related_entity_id) VALUES (?, ?, ?, ?, ?)',
            [userId, points, actionType, description, relatedEntityId || null],
            (err) => {
              if (err) {
                console.error('ポイント履歴記録エラー:', err);
                db.run('ROLLBACK');
                return resolve(false);
              }
              
              db.run('COMMIT');
              resolve(true);
            }
          );
        });
      });
    } catch (error) {
      console.error('ポイント追加エラー:', error);
      resolve(false);
    }
  });
};

// ポイント履歴を取得
export const getPointTransactions = (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '認証が必要です' });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const db = getDatabase();
    
    // ポイント履歴の総数を取得
    db.get(
      'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?',
      [userId],
      (err, result) => {
        if (err) {
          console.error('ポイント履歴カウントエラー:', err);
          return res.status(500).json({ message: 'サーバーエラーが発生しました' });
        }
        
        const total = result.total;
        
        // ポイント履歴を取得
        db.all(
          'SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [userId, limit, offset],
          (err, transactions) => {
            if (err) {
              console.error('ポイント履歴取得エラー:', err);
              return res.status(500).json({ message: 'サーバーエラーが発生しました' });
            }
            
            res.json({
              transactions: transactions || [],
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
    console.error('ポイント履歴取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};