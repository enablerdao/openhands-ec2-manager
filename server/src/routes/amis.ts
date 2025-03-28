import express from 'express';
import { getAmis, getRecommendedAmis } from '../controllers/amisController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// AMI一覧を取得
router.get('/', getAmis);

// 推奨AMI一覧を取得
router.get('/recommended', getRecommendedAmis);

export default router;