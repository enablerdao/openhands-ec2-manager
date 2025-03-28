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
const routes_1 = __importDefault(require("./routes"));
// 環境変数の設定
dotenv_1.default.config();
const app = (0, express_1.default)();
// ミドルウェア
app.use((0, cors_1.default)({
    origin: '*', // すべてのオリジンを許可
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// APIルート
app.use('/api', routes_1.default);
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
