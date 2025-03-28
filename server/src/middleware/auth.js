"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
// 認証ミドルウェア
const authenticate = (req, res, next) => {
    // ヘッダーからトークンを取得
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '認証トークンがありません' });
    }
    try {
        // トークンを検証
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        return res.status(403).json({ message: '無効なトークンです' });
    }
};
exports.authenticate = authenticate;
