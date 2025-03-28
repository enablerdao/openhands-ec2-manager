import express, { Router } from 'express';
import { 
  getPoints,
  getPointTransactions
} from '../controllers/pointsController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// 認証が必要なルート
router.use(authenticate);

// ポイント残高の取得
router.get('/', getPoints);

// ポイント履歴の取得
router.get('/transactions', getPointTransactions);

export default router;