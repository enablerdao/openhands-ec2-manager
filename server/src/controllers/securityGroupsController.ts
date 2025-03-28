import { Request, Response } from 'express';
import { createEC2Client } from '../services/awsService';

// セキュリティグループ一覧を取得
export const getSecurityGroups = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // セキュリティグループ一覧を取得
    const { SecurityGroups } = await ec2.describeSecurityGroups().promise();
    
    // セキュリティグループ情報を整形
    const securityGroups = SecurityGroups?.map(sg => ({
      groupId: sg.GroupId,
      groupName: sg.GroupName,
      description: sg.Description,
      vpcId: sg.VpcId,
      inboundRules: sg.IpPermissions?.map(perm => ({
        protocol: perm.IpProtocol,
        fromPort: perm.FromPort,
        toPort: perm.ToPort,
        ipRanges: perm.IpRanges?.map(range => ({
          cidrIp: range.CidrIp,
          description: range.Description
        }))
      })),
      outboundRules: sg.IpPermissionsEgress?.map(perm => ({
        protocol: perm.IpProtocol,
        fromPort: perm.FromPort,
        toPort: perm.ToPort,
        ipRanges: perm.IpRanges?.map(range => ({
          cidrIp: range.CidrIp,
          description: range.Description
        }))
      })),
      tags: sg.Tags?.map(tag => ({
        key: tag.Key,
        value: tag.Value
      }))
    })) || [];
    
    res.json({
      securityGroups
    });
  } catch (error) {
    console.error('セキュリティグループ一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// セキュリティグループを作成
export const createSecurityGroup = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { 
      groupName, 
      description = 'Security group for OpenHands', 
      vpcId,
      inboundRules = []
    } = req.body;
    
    // 入力検証
    if (!groupName) {
      return res.status(400).json({ message: 'グループ名は必須です' });
    }
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // セキュリティグループを作成
    const { GroupId } = await ec2.createSecurityGroup({
      GroupName: groupName,
      Description: description,
      VpcId: vpcId
    }).promise();
    
    if (!GroupId) {
      return res.status(500).json({ message: 'セキュリティグループの作成に失敗しました' });
    }
    
    // インバウンドルールを追加
    if (inboundRules.length > 0) {
      await ec2.authorizeSecurityGroupIngress({
        GroupId,
        IpPermissions: inboundRules.map((rule: any) => ({
          IpProtocol: rule.protocol,
          FromPort: rule.fromPort,
          ToPort: rule.toPort,
          IpRanges: [
            {
              CidrIp: rule.cidrIp || '0.0.0.0/0',
              Description: rule.description
            }
          ]
        }))
      }).promise();
    } else {
      // デフォルトのインバウンドルール（SSH + OpenHands）
      await ec2.authorizeSecurityGroupIngress({
        GroupId,
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            IpRanges: [
              {
                CidrIp: '0.0.0.0/0',
                Description: 'SSH access'
              }
            ]
          },
          {
            IpProtocol: 'tcp',
            FromPort: 3000,
            ToPort: 3000,
            IpRanges: [
              {
                CidrIp: '0.0.0.0/0',
                Description: 'OpenHands access'
              }
            ]
          }
        ]
      }).promise();
    }
    
    // タグを追加
    await ec2.createTags({
      Resources: [GroupId],
      Tags: [
        {
          Key: 'Name',
          Value: groupName
        },
        {
          Key: 'CreatedBy',
          Value: 'OpenHandsEC2Manager'
        }
      ]
    }).promise();
    
    res.status(201).json({
      message: 'セキュリティグループが正常に作成されました',
      securityGroup: {
        groupId: GroupId,
        groupName,
        description
      }
    });
  } catch (error) {
    console.error('セキュリティグループ作成エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// セキュリティグループ詳細を取得
export const getSecurityGroup = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // セキュリティグループ詳細を取得
    const { SecurityGroups } = await ec2.describeSecurityGroups({
      GroupIds: [groupId]
    }).promise();
    
    const securityGroup = SecurityGroups?.[0];
    
    if (!securityGroup) {
      return res.status(404).json({ message: 'セキュリティグループが見つかりません' });
    }
    
    res.json({
      securityGroup: {
        groupId: securityGroup.GroupId,
        groupName: securityGroup.GroupName,
        description: securityGroup.Description,
        vpcId: securityGroup.VpcId,
        inboundRules: securityGroup.IpPermissions?.map(perm => ({
          protocol: perm.IpProtocol,
          fromPort: perm.FromPort,
          toPort: perm.ToPort,
          ipRanges: perm.IpRanges?.map(range => ({
            cidrIp: range.CidrIp,
            description: range.Description
          }))
        })),
        outboundRules: securityGroup.IpPermissionsEgress?.map(perm => ({
          protocol: perm.IpProtocol,
          fromPort: perm.FromPort,
          toPort: perm.ToPort,
          ipRanges: perm.IpRanges?.map(range => ({
            cidrIp: range.CidrIp,
            description: range.Description
          }))
        })),
        tags: securityGroup.Tags?.map(tag => ({
          key: tag.Key,
          value: tag.Value
        }))
      }
    });
  } catch (error) {
    console.error('セキュリティグループ詳細取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};