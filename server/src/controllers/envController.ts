import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { SSHClient } from '../utils/sshClient';

/**
 * 環境変数の一覧を取得
 */
export const getEnvVariables = async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    
    // インスタンスの詳細を取得
    const ec2 = new AWS.EC2();
    const instance = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    if (!instance.Reservations || !instance.Reservations[0].Instances || !instance.Reservations[0].Instances[0]) {
      return res.status(404).json({ message: 'インスタンスが見つかりません' });
    }
    
    const publicIp = instance.Reservations[0].Instances[0].PublicIpAddress;
    if (!publicIp) {
      return res.status(400).json({ message: 'インスタンスにパブリックIPアドレスがありません' });
    }
    
    // SSHクライアントの設定
    const keyPath = path.resolve(__dirname, '../../../OpenHands-Key.pem');
    if (!fs.existsSync(keyPath)) {
      return res.status(500).json({ message: 'SSHキーが見つかりません' });
    }
    
    const ssh = new SSHClient({
      host: publicIp,
      username: 'ubuntu',
      privateKey: fs.readFileSync(keyPath, 'utf8')
    });
    
    // .envファイルの内容を取得
    await ssh.connect();
    const { stdout } = await ssh.execCommand('cat /home/ubuntu/.openhands.env');
    await ssh.disconnect();
    
    // 環境変数をパース
    const envVars: Record<string, string> = {};
    stdout.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envVars[key] = value;
      }
    });
    
    // APIキーの値をマスク
    if (envVars.LLM_API_KEY) {
      const apiKey = envVars.LLM_API_KEY;
      if (apiKey.length > 8) {
        envVars.LLM_API_KEY = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
      } else {
        envVars.LLM_API_KEY = '********';
      }
    }
    
    return res.json({
      instanceId,
      publicIp,
      envVariables: envVars
    });
  } catch (error) {
    console.error('環境変数の取得中にエラーが発生しました:', error);
    return res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
  }
};

/**
 * 環境変数を更新
 */
export const updateEnvVariables = async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const { llmApiKey, sandboxRuntimeImage, logAllEvents } = req.body;
    
    if (!llmApiKey) {
      return res.status(400).json({ message: 'LLM APIキーは必須です' });
    }
    
    // インスタンスの詳細を取得
    const ec2 = new AWS.EC2();
    const instance = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    if (!instance.Reservations || !instance.Reservations[0].Instances || !instance.Reservations[0].Instances[0]) {
      return res.status(404).json({ message: 'インスタンスが見つかりません' });
    }
    
    const publicIp = instance.Reservations[0].Instances[0].PublicIpAddress;
    if (!publicIp) {
      return res.status(400).json({ message: 'インスタンスにパブリックIPアドレスがありません' });
    }
    
    // SSHクライアントの設定
    const keyPath = path.resolve(__dirname, '../../../OpenHands-Key.pem');
    if (!fs.existsSync(keyPath)) {
      return res.status(500).json({ message: 'SSHキーが見つかりません' });
    }
    
    const ssh = new SSHClient({
      host: publicIp,
      username: 'ubuntu',
      privateKey: fs.readFileSync(keyPath, 'utf8')
    });
    
    // .envファイルの内容を更新
    await ssh.connect();
    
    // 新しい.envファイルの内容を作成
    const envContent = [
      `LLM_API_KEY=${llmApiKey}`,
      `SANDBOX_RUNTIME_CONTAINER_IMAGE=${sandboxRuntimeImage || 'docker.all-hands.dev/all-hands-ai/runtime:0.30-nikolaik'}`,
      `LOG_ALL_EVENTS=${logAllEvents || 'true'}`
    ].join('\n');
    
    // .envファイルを更新
    await ssh.execCommand(`echo '${envContent}' > /home/ubuntu/.openhands.env`);
    
    // Dockerコンテナを再起動
    await ssh.execCommand('sudo docker stop openhands-app || true');
    await ssh.execCommand('sudo docker rm openhands-app || true');
    await ssh.execCommand('sudo docker run -d --restart=always --env-file /home/ubuntu/.openhands.env -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30');
    
    await ssh.disconnect();
    
    return res.json({
      instanceId,
      publicIp,
      message: '環境変数を更新し、コンテナを再起動しました',
      url: `http://${publicIp}:3000`
    });
  } catch (error) {
    console.error('環境変数の更新中にエラーが発生しました:', error);
    return res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
  }
};

/**
 * OpenHandsコンテナを再起動
 */
export const restartContainer = async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    
    // インスタンスの詳細を取得
    const ec2 = new AWS.EC2();
    const instance = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    if (!instance.Reservations || !instance.Reservations[0].Instances || !instance.Reservations[0].Instances[0]) {
      return res.status(404).json({ message: 'インスタンスが見つかりません' });
    }
    
    const publicIp = instance.Reservations[0].Instances[0].PublicIpAddress;
    if (!publicIp) {
      return res.status(400).json({ message: 'インスタンスにパブリックIPアドレスがありません' });
    }
    
    // SSHクライアントの設定
    const keyPath = path.resolve(__dirname, '../../../OpenHands-Key.pem');
    if (!fs.existsSync(keyPath)) {
      return res.status(500).json({ message: 'SSHキーが見つかりません' });
    }
    
    const ssh = new SSHClient({
      host: publicIp,
      username: 'ubuntu',
      privateKey: fs.readFileSync(keyPath, 'utf8')
    });
    
    // Dockerコンテナを再起動
    await ssh.connect();
    await ssh.execCommand('sudo docker stop openhands-app || true');
    await ssh.execCommand('sudo docker rm openhands-app || true');
    await ssh.execCommand('sudo docker run -d --restart=always --env-file /home/ubuntu/.openhands.env -v /var/run/docker.sock:/var/run/docker.sock -v /home/ubuntu/.openhands-state:/.openhands-state -p 3000:3000 --add-host host.docker.internal:host-gateway --name openhands-app docker.all-hands.dev/all-hands-ai/openhands:0.30');
    await ssh.disconnect();
    
    return res.json({
      instanceId,
      publicIp,
      message: 'OpenHandsコンテナを再起動しました',
      url: `http://${publicIp}:3000`
    });
  } catch (error) {
    console.error('コンテナの再起動中にエラーが発生しました:', error);
    return res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
  }
};