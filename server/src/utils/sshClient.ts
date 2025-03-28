import { Client } from 'ssh2';
import { promisify } from 'util';

interface SSHClientOptions {
  host: string;
  port?: number;
  username: string;
  privateKey: string;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
}

export class SSHClient {
  private client: Client;
  private options: SSHClientOptions;

  constructor(options: SSHClientOptions) {
    this.options = {
      port: 22,
      ...options
    };
    this.client = new Client();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        })
        .connect({
          host: this.options.host,
          port: this.options.port,
          username: this.options.username,
          privateKey: this.options.privateKey,
          readyTimeout: 30000
        });
    });
  }

  async execCommand(command: string): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        let stdout = '';
        let stderr = '';
        
        stream
          .on('close', (code: number | null, signal: string | null) => {
            resolve({ stdout, stderr, code, signal });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.client.end();
      resolve();
    });
  }
}