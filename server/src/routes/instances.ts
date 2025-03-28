import express from 'express';
import { 
  getInstances, 
  launchInstance, 
  getInstance, 
  startInstance, 
  stopInstance, 
  terminateInstance 
} from '../controllers/instancesController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// インスタンス一覧を取得
router.get('/', getInstances);

// インスタンスを起動
router.post('/', launchInstance);

// インスタンス詳細を取得
router.get('/:instanceId', getInstance);

// インスタンスを起動（停止中のインスタンス）
router.post('/:instanceId/start', startInstance);

// インスタンスを停止
router.post('/:instanceId/stop', stopInstance);

// インスタンスを終了
router.delete('/:instanceId', terminateInstance);

export default router;