import express, { Router } from 'express';
import { 
  verifyEmail,
  resendVerificationEmail
} from '../controllers/emailVerificationController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// メールアドレスの確認
router.post('/verify', verifyEmail);

// 認証が必要なルート
router.use(authenticate);

// 確認メールの再送信
router.post('/resend', resendVerificationEmail);

export default router;