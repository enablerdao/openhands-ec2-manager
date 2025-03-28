"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const securityGroupsController_1 = require("../controllers/securityGroupsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// すべてのルートで認証が必要
router.use(auth_1.authenticate);
// セキュリティグループ一覧を取得
router.get('/', securityGroupsController_1.getSecurityGroups);
// セキュリティグループを作成
router.post('/', securityGroupsController_1.createSecurityGroup);
// セキュリティグループ詳細を取得
router.get('/:groupId', securityGroupsController_1.getSecurityGroup);
exports.default = router;
