import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');

// データベース接続を初期化
export const initializeDatabase = async (): Promise<Database> => {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // ユーザーテーブルの作成
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AWS認証情報テーブルの作成
  await db.exec(`
    CREATE TABLE IF NOT EXISTS aws_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      access_key_id TEXT NOT NULL,
      secret_access_key TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'us-east-1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // インスタンステーブルの作成
  await db.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      instance_id TEXT NOT NULL,
      name TEXT,
      region TEXT NOT NULL,
      public_ip TEXT,
      status TEXT,
      instance_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  return db;
};

// データベース接続のシングルトン
let db: Database | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
};