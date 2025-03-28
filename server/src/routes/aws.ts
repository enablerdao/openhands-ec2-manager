import express, { Router } from 'express';
import { saveCredentials, getCredentials, updateCredentials, getRegions } from '../controllers/awsController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// AWS認証情報を保存
router.post('/credentials', saveCredentials);

// AWS認証情報を取得
router.get('/credentials', getCredentials);

// AWS認証情報を更新
router.put('/credentials', updateCredentials);

// AWSリージョン一覧を取得
router.get('/regions', getRegions);

export default router;