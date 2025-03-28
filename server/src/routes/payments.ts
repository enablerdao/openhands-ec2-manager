import express, { Router } from 'express';
import { 
  createCheckoutSession,
  verifyPayment,
  handleWebhook,
  getPaymentHistory
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// Stripeウェブフック（認証不要）
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// 認証が必要なルート
router.use(authenticate);

// 決済セッションの作成
router.post('/checkout', createCheckoutSession);

// 決済の確認
router.post('/verify', verifyPayment);

// 決済履歴の取得
router.get('/history', getPaymentHistory);

export default router;