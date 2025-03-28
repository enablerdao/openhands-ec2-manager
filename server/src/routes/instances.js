"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const instancesController_1 = require("../controllers/instancesController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// すべてのルートで認証が必要
router.use(auth_1.authenticate);
// インスタンス一覧を取得
router.get('/', instancesController_1.getInstances);
// インスタンスを起動
router.post('/', instancesController_1.launchInstance);
// インスタンス詳細を取得
router.get('/:instanceId', instancesController_1.getInstance);
// インスタンスを起動（停止中のインスタンス）
router.post('/:instanceId/start', instancesController_1.startInstance);
// インスタンスを停止
router.post('/:instanceId/stop', instancesController_1.stopInstance);
// インスタンスを終了
router.delete('/:instanceId', instancesController_1.terminateInstance);
exports.default = router;
