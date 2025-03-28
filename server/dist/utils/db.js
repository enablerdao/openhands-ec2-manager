"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = exports.initializeDatabase = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbPath = process.env.DB_PATH || path_1.default.join(__dirname, '../../database.sqlite');
// データベース接続を初期化
const initializeDatabase = () => {
    const db = new sqlite3_1.default.Database(dbPath);
    // ユーザーテーブルの作成
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // AWS認証情報テーブルの作成
    db.exec(`
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
    db.exec(`
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
exports.initializeDatabase = initializeDatabase;
// データベース接続のシングルトン
let db = null;
const getDatabase = () => {
    if (!db) {
        db = (0, exports.initializeDatabase)();
    }
    return db;
};
exports.getDatabase = getDatabase;
