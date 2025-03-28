"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const amisController_1 = require("../controllers/amisController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// すべてのルートで認証が必要
router.use(auth_1.authenticate);
// AMI一覧を取得
router.get('/', amisController_1.getAmis);
// 推奨AMI一覧を取得
router.get('/recommended', amisController_1.getRecommendedAmis);
exports.default = router;
