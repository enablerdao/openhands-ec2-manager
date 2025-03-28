import express, { Router } from 'express';
import { 
  getEnvVariables,
  updateEnvVariables,
  restartContainer
} from '../controllers/envController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// インスタンスの環境変数を取得
router.get('/:instanceId', getEnvVariables);

// インスタンスの環境変数を更新
router.put('/:instanceId', updateEnvVariables);

// OpenHandsコンテナを再起動
router.post('/:instanceId/restart', restartContainer);

export default router;