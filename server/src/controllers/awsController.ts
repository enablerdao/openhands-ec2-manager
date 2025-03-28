import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import { getDatabase } from '../utils/db';

// AWS認証情報を保存
export const saveCredentials = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { accessKeyId, secretAccessKey, region } = req.body;

    // 入力検証
    if (!accessKeyId || !secretAccessKey) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    // AWS認証情報の検証
    try {
      const ec2 = new AWS.EC2({
        accessKeyId,
        secretAccessKey,
        region: region || 'us-east-1'
      });

      // 認証情報のテスト（リージョン一覧を取得）
      await ec2.describeRegions().promise();
    } catch (error) {
      return res.status(400).json({ message: 'AWS認証情報が無効です' });
    }

    const db = await getDatabase();

    // 既存の認証情報を確認
    const existingCredentials = await db.get('SELECT * FROM aws_credentials WHERE user_id = ?', [userId]);

    if (existingCredentials) {
      // 既存の認証情報を更新
      await db.run(
        'UPDATE aws_credentials SET access_key_id = ?, secret_access_key = ?, region = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [accessKeyId, secretAccessKey, region || 'us-east-1', userId]
      );
    } else {
      // 新しい認証情報を作成
      await db.run(
        'INSERT INTO aws_credentials (user_id, access_key_id, secret_access_key, region) VALUES (?, ?, ?, ?)',
        [userId, accessKeyId, secretAccessKey, region || 'us-east-1']
      );
    }

    res.status(201).json({
      message: 'AWS認証情報が正常に保存されました',
      credentials: {
        accessKeyId,
        region: region || 'us-east-1'
      }
    });
  } catch (error) {
    console.error('AWS認証情報保存エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// AWS認証情報を取得
export const getCredentials = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    const db = await getDatabase();
    
    // 認証情報の取得
    const credentials = await db.get(
      'SELECT id, access_key_id, region, created_at, updated_at FROM aws_credentials WHERE user_id = ?',
      [userId]
    );
    
    if (!credentials) {
      return res.status(404).json({ message: 'AWS認証情報が見つかりません' });
    }

    res.json({
      credentials: {
        id: credentials.id,
        accessKeyId: credentials.access_key_id,
        region: credentials.region,
        createdAt: credentials.created_at,
        updatedAt: credentials.updated_at
      }
    });
  } catch (error) {
    console.error('AWS認証情報取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// AWS認証情報を更新
export const updateCredentials = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { accessKeyId, secretAccessKey, region } = req.body;

    // 入力検証
    if (!accessKeyId || !secretAccessKey) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    // AWS認証情報の検証
    try {
      const ec2 = new AWS.EC2({
        accessKeyId,
        secretAccessKey,
        region: region || 'us-east-1'
      });

      // 認証情報のテスト（リージョン一覧を取得）
      await ec2.describeRegions().promise();
    } catch (error) {
      return res.status(400).json({ message: 'AWS認証情報が無効です' });
    }

    const db = await getDatabase();

    // 既存の認証情報を確認
    const existingCredentials = await db.get('SELECT * FROM aws_credentials WHERE user_id = ?', [userId]);

    if (!existingCredentials) {
      return res.status(404).json({ message: 'AWS認証情報が見つかりません' });
    }

    // 認証情報を更新
    await db.run(
      'UPDATE aws_credentials SET access_key_id = ?, secret_access_key = ?, region = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [accessKeyId, secretAccessKey, region || 'us-east-1', userId]
    );

    res.json({
      message: 'AWS認証情報が正常に更新されました',
      credentials: {
        accessKeyId,
        region: region || 'us-east-1'
      }
    });
  } catch (error) {
    console.error('AWS認証情報更新エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// AWSリージョン一覧を取得
export const getRegions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    const db = await getDatabase();
    
    // 認証情報の取得
    const credentials = await db.get(
      'SELECT access_key_id, secret_access_key, region FROM aws_credentials WHERE user_id = ?',
      [userId]
    );
    
    if (!credentials) {
      return res.status(404).json({ message: 'AWS認証情報が見つかりません' });
    }

    // EC2クライアントの作成
    const ec2 = new AWS.EC2({
      accessKeyId: credentials.access_key_id,
      secretAccessKey: credentials.secret_access_key,
      region: credentials.region
    });

    // リージョン一覧を取得
    const { Regions } = await ec2.describeRegions().promise();
    
    const regions = Regions?.map(region => ({
      regionName: region.RegionName,
      endpoint: region.Endpoint
    })) || [];

    res.json({
      regions
    });
  } catch (error) {
    console.error('AWSリージョン取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};