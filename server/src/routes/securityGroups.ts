import express from 'express';
import { 
  getSecurityGroups, 
  createSecurityGroup, 
  getSecurityGroup 
} from '../controllers/securityGroupsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// セキュリティグループ一覧を取得
router.get('/', getSecurityGroups);

// セキュリティグループを作成
router.post('/', createSecurityGroup);

// セキュリティグループ詳細を取得
router.get('/:groupId', getSecurityGroup);

export default router;