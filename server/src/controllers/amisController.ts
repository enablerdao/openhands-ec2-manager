import { Request, Response } from 'express';
import { createEC2Client } from '../services/awsService';

// AMI一覧を取得
export const getAmis = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { owner = 'self', filters } = req.query;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // AMI一覧を取得
    const params: AWS.EC2.DescribeImagesRequest = {};
    
    if (owner === 'self') {
      params.Owners = ['self'];
    } else if (owner === 'amazon') {
      params.Owners = ['amazon'];
    }
    
    if (filters) {
      try {
        params.Filters = JSON.parse(filters as string);
      } catch (error) {
        return res.status(400).json({ message: 'フィルターの形式が無効です' });
      }
    }
    
    const { Images } = await ec2.describeImages(params).promise();
    
    // AMI情報を整形
    const amis = Images?.map(image => ({
      imageId: image.ImageId,
      name: image.Name,
      description: image.Description,
      state: image.State,
      creationDate: image.CreationDate,
      platform: image.Platform,
      architecture: image.Architecture,
      rootDeviceType: image.RootDeviceType,
      virtualizationType: image.VirtualizationType,
      tags: image.Tags?.map(tag => ({
        key: tag.Key,
        value: tag.Value
      }))
    })) || [];
    
    res.json({
      amis
    });
  } catch (error) {
    console.error('AMI一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};

// 推奨AMI一覧を取得
export const getRecommendedAmis = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    // EC2クライアントを作成
    const ec2 = await createEC2Client(userId);
    
    // Ubuntu 22.04 LTSの最新AMIを取得
    const ubuntuParams: AWS.EC2.DescribeImagesRequest = {
      Owners: ['099720109477'], // Canonical
      Filters: [
        {
          Name: 'name',
          Values: ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*']
        },
        {
          Name: 'state',
          Values: ['available']
        }
      ]
    };
    
    const ubuntuResult = await ec2.describeImages(ubuntuParams).promise();
    
    // Amazon Linux 2の最新AMIを取得
    const amazonLinuxParams: AWS.EC2.DescribeImagesRequest = {
      Owners: ['amazon'],
      Filters: [
        {
          Name: 'name',
          Values: ['amzn2-ami-hvm-*-x86_64-gp2']
        },
        {
          Name: 'state',
          Values: ['available']
        }
      ]
    };
    
    const amazonLinuxResult = await ec2.describeImages(amazonLinuxParams).promise();
    
    // Amazon Linux 2023の最新AMIを取得
    const amazonLinux2023Params: AWS.EC2.DescribeImagesRequest = {
      Owners: ['amazon'],
      Filters: [
        {
          Name: 'name',
          Values: ['al2023-ami-*-x86_64']
        },
        {
          Name: 'state',
          Values: ['available']
        }
      ]
    };
    
    const amazonLinux2023Result = await ec2.describeImages(amazonLinux2023Params).promise();
    
    // 結果を日付でソート
    const sortByCreationDate = (images: AWS.EC2.Image[] = []) => {
      return [...images].sort((a, b) => {
        const dateA = a.CreationDate ? new Date(a.CreationDate).getTime() : 0;
        const dateB = b.CreationDate ? new Date(b.CreationDate).getTime() : 0;
        return dateB - dateA;
      });
    };
    
    const latestUbuntu = sortByCreationDate(ubuntuResult.Images)[0];
    const latestAmazonLinux = sortByCreationDate(amazonLinuxResult.Images)[0];
    const latestAmazonLinux2023 = sortByCreationDate(amazonLinux2023Result.Images)[0];
    
    // 推奨AMI一覧を作成
    const recommendedAmis = [
      latestUbuntu && {
        imageId: latestUbuntu.ImageId,
        name: latestUbuntu.Name,
        description: 'Ubuntu 22.04 LTS (推奨)',
        platform: 'Ubuntu',
        creationDate: latestUbuntu.CreationDate
      },
      latestAmazonLinux2023 && {
        imageId: latestAmazonLinux2023.ImageId,
        name: latestAmazonLinux2023.Name,
        description: 'Amazon Linux 2023',
        platform: 'Amazon Linux',
        creationDate: latestAmazonLinux2023.CreationDate
      },
      latestAmazonLinux && {
        imageId: latestAmazonLinux.ImageId,
        name: latestAmazonLinux.Name,
        description: 'Amazon Linux 2',
        platform: 'Amazon Linux',
        creationDate: latestAmazonLinux.CreationDate
      }
    ].filter(Boolean);
    
    res.json({
      recommendedAmis
    });
  } catch (error) {
    console.error('推奨AMI一覧取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました', error: (error as Error).message });
  }
};