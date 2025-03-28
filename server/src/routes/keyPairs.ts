import express, { Router } from 'express';
import { getKeyPairs, createKeyPair, deleteKeyPair } from '../controllers/keyPairsController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// すべてのルートで認証が必要
router.use(authenticate);

// キーペア一覧を取得
router.get('/', getKeyPairs);

// キーペアを作成
router.post('/', createKeyPair);

// キーペアを削除
router.delete('/:keyName', deleteKeyPair);

export default router;