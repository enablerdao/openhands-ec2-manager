"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const awsController_1 = require("../controllers/awsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// すべてのルートで認証が必要
router.use(auth_1.authenticate);
// AWS認証情報を保存
router.post('/credentials', awsController_1.saveCredentials);
// AWS認証情報を取得
router.get('/credentials', awsController_1.getCredentials);
// AWS認証情報を更新
router.put('/credentials', awsController_1.updateCredentials);
// AWSリージョン一覧を取得
router.get('/regions', awsController_1.getRegions);
exports.default = router;
