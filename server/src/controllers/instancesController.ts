import { Request, Response } from 'express';
import { createEC2Client, generateOpenHandsUserData } from '../services/awsService';
import { getDatabase } from '../utils/db';

// インスタンス一覧を取得
export const getInstances = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // インスタンス一覧を取得
    const { Reservations } = await ec2.describeInstances().promise();
    
    // インスタンス情報を整形
    const instances = Reservations?.flatMap(reservation => 
      reservation.Instances?.map(instance => ({
        instanceId: instance.InstanceId,
        name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || '',
        state: instance.State?.Name,
        publicIp: instance.PublicIpAddress,
        instanceType: instance.InstanceType,
        launchTime: instance.LaunchTime
      })) || []
    ) || [];
    
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
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // OpenHandsのユーザーデータスクリプトを生成
    const userData = generateOpenHandsUserData();
    
    // インスタンスを起動
    const result = await ec2.runInstances({
      ImageId: imageId,
      InstanceType: instanceType,
      KeyName: keyName,
      SecurityGroupIds: Array.isArray(securityGroupIds) ? securityGroupIds : [securityGroupIds],
      MinCount: 1,
      MaxCount: 1,
      UserData: userData,
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 20,
            DeleteOnTermination: true
          }
        }
      ],
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            {
              Key: 'Name',
              Value: name
            }
          ]
        }
      ]
    }).promise();
    
    // インスタンス情報を取得
    const instance = result.Instances?.[0];
    
    if (!instance) {
      return res.status(500).json({ message: 'インスタンスの起動に失敗しました' });
    }
    
    // データベースに保存
    const db = await getDatabase();
    await db.run(
      'INSERT INTO instances (user_id, instance_id, name, region, status, instance_type) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId, 
        instance.InstanceId, 
        name, 
        instance.Placement?.AvailabilityZone?.slice(0, -1) || 'unknown', 
        instance.State?.Name, 
        instance.InstanceType
      ]
    );
    
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
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // インスタンス詳細を取得
    const { Reservations } = await ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
    
    const instance = Reservations?.[0]?.Instances?.[0];
    
    if (!instance) {
      return res.status(404).json({ message: 'インスタンスが見つかりません' });
    }
    
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