"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
// 環境変数の設定
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
// サーバー起動
app_1.default.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
