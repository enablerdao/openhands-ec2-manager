"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../utils/db");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
// ユーザー登録
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        // 入力検証
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
        }
        const db = yield (0, db_1.getDatabase)();
        // ユーザー名とメールアドレスの重複チェック
        const existingUser = yield db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(400).json({ message: 'ユーザー名またはメールアドレスが既に使用されています' });
        }
        // パスワードのハッシュ化
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(password, salt);
        // ユーザーの作成
        const result = yield db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        // JWTトークンの生成
        const token = jsonwebtoken_1.default.sign({ userId: result.lastID }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({
            message: 'ユーザーが正常に登録されました',
            token,
            user: {
                id: result.lastID,
                username,
                email
            }
        });
    }
    catch (error) {
        console.error('ユーザー登録エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.register = register;
// ログイン
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // 入力検証
        if (!email || !password) {
            return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
        }
        const db = yield (0, db_1.getDatabase)();
        // ユーザーの検索
        const user = yield db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(400).json({ message: 'メールアドレスまたはパスワードが無効です' });
        }
        // パスワードの検証
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'メールアドレスまたはパスワードが無効です' });
        }
        // JWTトークンの生成
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            message: 'ログインに成功しました',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('ログインエラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.login = login;
// 現在のユーザー情報を取得
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: '認証が必要です' });
        }
        const db = yield (0, db_1.getDatabase)();
        // ユーザー情報の取得
        const user = yield db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ message: 'ユーザーが見つかりません' });
        }
        res.json({
            user
        });
    }
    catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.getMe = getMe;
