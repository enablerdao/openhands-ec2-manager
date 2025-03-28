"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const keyPairsController_1 = require("../controllers/keyPairsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// すべてのルートで認証が必要
router.use(auth_1.authenticate);
// キーペア一覧を取得
router.get('/', keyPairsController_1.getKeyPairs);
// キーペアを作成
router.post('/', keyPairsController_1.createKeyPair);
// キーペアを削除
router.delete('/:keyName', keyPairsController_1.deleteKeyPair);
exports.default = router;
