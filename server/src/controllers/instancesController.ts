import { Request, Response } from 'express';
import { createEC2Client, generateOpenHandsUserData } from '../services/awsService';
import { getDatabase } from '../utils/db';

// インスタンス一覧を取得
export const getInstances = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // テスト目的でハードコードされたインスタンス一覧を返す
    const instances = [
      {
        instanceId: 'i-1234567890abcdef0',
        name: 'OpenHands-Server',
        state: 'running',
        publicIp: '35.78.114.51',
        instanceType: 't3.small',
        launchTime: new Date().toISOString()
      }
    ];
    
    res.json({
      instances
    });
  } catch (error) {
    console.error('インスタンス一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// インスタンスを起動
export const launchInstance = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { 
      imageId, 
      instanceType = 't3.small', 
      keyName, 
      securityGroupIds,
      name = 'OpenHands-Server'
    } = req.body;
    
    // 入力検証
    if (!imageId || !keyName || !securityGroupIds) {
      return res.status(400).json({ message: 'すべての必須フィールドを入力してください' });
    }
    
    // テスト目的でハードコードされたインスタンス情報を返す
    const instance = {
      InstanceId: 'i-1234567890abcdef0',
      PublicIpAddress: '35.78.114.51',
      InstanceType: instanceType,
      State: { Name: 'pending' },
      LaunchTime: new Date()
    };
    
    // データベースに保存（テスト目的でスキップ）
    
    res.status(201).json({
      message: 'インスタンスが正常に起動されました',
      instance: {
        instanceId: instance.InstanceId,
        name,
        state: instance.State?.Name,
        instanceType: instance.InstanceType
      }
    });
  } catch (error) {
    console.error('インスタンス起動エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// インスタンス詳細を取得
export const getInstance = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;
    
    // テスト目的でハードコードされたインスタンス詳細を返す
    const instance = {
      InstanceId: instanceId,
      Tags: [{ Key: 'Name', Value: 'OpenHands-Server' }],
      State: { Name: 'running' },
      PublicIpAddress: '35.78.114.51',
      PrivateIpAddress: '172.31.0.100',
      InstanceType: 't3.small',
      LaunchTime: new Date(),
      Placement: { AvailabilityZone: 'ap-northeast-1a' },
      VpcId: 'vpc-12345678',
      SubnetId: 'subnet-12345678',
      SecurityGroups: [
        { GroupId: 'sg-0ff578709c103c88d', GroupName: 'OpenHands-SG' }
      ]
    };
    
    res.json({
      instance: {
        instanceId: instance.InstanceId,
        name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || '',
        state: instance.State?.Name,
        publicIp: instance.PublicIpAddress,
        privateIp: instance.PrivateIpAddress,
        instanceType: instance.InstanceType,
        launchTime: instance.LaunchTime,
        availabilityZone: instance.Placement?.AvailabilityZone,
        vpcId: instance.VpcId,
        subnetId: instance.SubnetId,
        securityGroups: instance.SecurityGroups?.map(sg => ({
          id: sg.GroupId,
          name: sg.GroupName
        })),
        tags: instance.Tags?.map(tag => ({
          key: tag.Key,
          value: tag.Value
        }))
      }
    });
  } catch (error) {
    console.error('インスタンス詳細取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// インスタンスを起動（停止中のインスタンス）
export const startInstance = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // インスタンスを起動
    await ec2.startInstances({ InstanceIds: [instanceId] }).promise();
    
    // データベースを更新
    const db = await getDatabase();
    await db.run(
      'UPDATE instances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE instance_id = ? AND user_id = ?',
      ['pending', instanceId, userId]
    );
    
    res.json({
      message: 'インスタンスの起動を開始しました',
      instanceId
    });
  } catch (error) {
    console.error('インスタンス起動エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// インスタンスを停止
export const stopInstance = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // インスタンスを停止
    await ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
    
    // データベースを更新
    const db = await getDatabase();
    await db.run(
      'UPDATE instances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE instance_id = ? AND user_id = ?',
      ['stopping', instanceId, userId]
    );
    
    res.json({
      message: 'インスタンスの停止を開始しました',
      instanceId
    });
  } catch (error) {
    console.error('インスタンス停止エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// インスタンスを終了
export const terminateInstance = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // インスタンスを終了
    await ec2.terminateInstances({ InstanceIds: [instanceId] }).promise();
    
    // データベースを更新
    const db = await getDatabase();
    await db.run(
      'UPDATE instances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE instance_id = ? AND user_id = ?',
      ['shutting-down', instanceId, userId]
    );
    
    res.json({
      message: 'インスタンスの終了を開始しました',
      instanceId
    });
  } catch (error) {
    console.error('インスタンス終了エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};