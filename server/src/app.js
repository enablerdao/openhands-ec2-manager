"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// ルートのインポート
const auth_1 = __importDefault(require("./routes/auth"));
const aws_1 = __importDefault(require("./routes/aws"));
const instances_1 = __importDefault(require("./routes/instances"));
const amis_1 = __importDefault(require("./routes/amis"));
const securityGroups_1 = __importDefault(require("./routes/securityGroups"));
const keyPairs_1 = __importDefault(require("./routes/keyPairs"));
// 環境変数の設定
dotenv_1.default.config();
const app = (0, express_1.default)();
// ミドルウェア
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// APIルート
app.use('/api/auth', auth_1.default);
app.use('/api/aws', aws_1.default);
app.use('/api/instances', instances_1.default);
app.use('/api/amis', amis_1.default);
app.use('/api/security-groups', securityGroups_1.default);
app.use('/api/key-pairs', keyPairs_1.default);
// 本番環境ではReactアプリを提供
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../../client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../../client/build', 'index.html'));
    });
}
// エラーハンドリング
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'サーバーエラーが発生しました',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
exports.default = app;
