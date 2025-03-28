import { Request, Response } from 'express';
import { createEC2Client } from '../services/awsService';

// キーペア一覧を取得
export const getKeyPairs = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // キーペア一覧を取得
    const { KeyPairs } = await ec2.describeKeyPairs().promise();
    
    // キーペア情報を整形
    const keyPairs = KeyPairs?.map(keyPair => ({
      keyName: keyPair.KeyName,
      keyPairId: keyPair.KeyPairId,
      keyFingerprint: keyPair.KeyFingerprint,
      tags: keyPair.Tags?.map(tag => ({
        key: tag.Key,
        value: tag.Value
      }))
    })) || [];
    
    res.json({
      keyPairs
    });
  } catch (error) {
    console.error('キーペア一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// キーペアを作成
export const createKeyPair = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { keyName } = req.body;
    
    // 入力検証
    if (!keyName) {
      return res.status(400).json({ message: 'キーペア名は必須です' });
    }
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // キーペアを作成
    const keyPair = await ec2.createKeyPair({
      KeyName: keyName,
      TagSpecifications: [
        {
          ResourceType: 'key-pair',
          Tags: [
            {
              Key: 'CreatedBy',
              Value: 'OpenHandsEC2Manager'
            }
          ]
        }
      ]
    }).promise();
    
    res.status(201).json({
      message: 'キーペアが正常に作成されました',
      keyPair: {
        keyName: keyPair.KeyName,
        keyPairId: keyPair.KeyPairId,
        keyFingerprint: keyPair.KeyFingerprint,
        keyMaterial: keyPair.KeyMaterial // 秘密鍵（この後クライアントでダウンロードする）
      }
    });
  } catch (error) {
    console.error('キーペア作成エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// キーペアを削除
export const deleteKeyPair = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { keyName } = req.params;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // キーペアを削除
    await ec2.deleteKeyPair({
      KeyName: keyName
    }).promise();
    
    res.json({
      message: 'キーペアが正常に削除されました',
      keyName
    });
  } catch (error) {
    console.error('キーペア削除エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};