import express from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// ユーザー登録
router.post('/register', register);

// ログイン
router.post('/login', login);

// 現在のユーザー情報を取得
router.get('/me', authenticate, getMe);

export default router;