"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegions = exports.updateCredentials = exports.getCredentials = exports.saveCredentials = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const db_1 = require("../utils/db");
// AWS認証情報を保存
const saveCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { accessKeyId, secretAccessKey, region } = req.body;
        // 入力検証
        if (!accessKeyId || !secretAccessKey) {
            return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
        }
        // AWS認証情報の検証
        try {
            const ec2 = new aws_sdk_1.default.EC2({
                accessKeyId,
                secretAccessKey,
                region: region || 'us-east-1'
            });
            // 認証情報のテスト（リージョン一覧を取得）
            yield ec2.describeRegions().promise();
        }
        catch (error) {
            return res.status(400).json({ message: 'AWS認証情報が無効です' });
        }
        const db = yield (0, db_1.getDatabase)();
        // 既存の認証情報を確認
        const existingCredentials = yield db.get('SELECT * FROM aws_credentials WHERE user_id = ?', [userId]);
        if (existingCredentials) {
            // 既存の認証情報を更新
            yield db.run('UPDATE aws_credentials SET access_key_id = ?, secret_access_key = ?, region = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [accessKeyId, secretAccessKey, region || 'us-east-1', userId]);
        }
        else {
            // 新しい認証情報を作成
            yield db.run('INSERT INTO aws_credentials (user_id, access_key_id, secret_access_key, region) VALUES (?, ?, ?, ?)', [userId, accessKeyId, secretAccessKey, region || 'us-east-1']);
        }
        res.status(201).json({
            message: 'AWS認証情報が正常に保存されました',
            credentials: {
                accessKeyId,
                region: region || 'us-east-1'
            }
        });
    }
    catch (error) {
        console.error('AWS認証情報保存エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.saveCredentials = saveCredentials;
// AWS認証情報を取得
const getCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const db = yield (0, db_1.getDatabase)();
        // 認証情報の取得
        const credentials = yield db.get('SELECT id, access_key_id, region, created_at, updated_at FROM aws_credentials WHERE user_id = ?', [userId]);
        if (!credentials) {
            return res.status(404).json({ message: 'AWS認証情報が見つかりません' });
        }
        res.json({
            credentials: {
                id: credentials.id,
                accessKeyId: credentials.access_key_id,
                region: credentials.region,
                createdAt: credentials.created_at,
                updatedAt: credentials.updated_at
            }
        });
    }
    catch (error) {
        console.error('AWS認証情報取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.getCredentials = getCredentials;
// AWS認証情報を更新
const updateCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { accessKeyId, secretAccessKey, region } = req.body;
        // 入力検証
        if (!accessKeyId || !secretAccessKey) {
            return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
        }
        // AWS認証情報の検証
        try {
            const ec2 = new aws_sdk_1.default.EC2({
                accessKeyId,
                secretAccessKey,
                region: region || 'us-east-1'
            });
            // 認証情報のテスト（リージョン一覧を取得）
            yield ec2.describeRegions().promise();
        }
        catch (error) {
            return res.status(400).json({ message: 'AWS認証情報が無効です' });
        }
        const db = yield (0, db_1.getDatabase)();
        // 既存の認証情報を確認
        const existingCredentials = yield db.get('SELECT * FROM aws_credentials WHERE user_id = ?', [userId]);
        if (!existingCredentials) {
            return res.status(404).json({ message: 'AWS認証情報が見つかりません' });
        }
        // 認証情報を更新
        yield db.run('UPDATE aws_credentials SET access_key_id = ?, secret_access_key = ?, region = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [accessKeyId, secretAccessKey, region || 'us-east-1', userId]);
        res.json({
            message: 'AWS認証情報が正常に更新されました',
            credentials: {
                accessKeyId,
                region: region || 'us-east-1'
            }
        });
    }
    catch (error) {
        console.error('AWS認証情報更新エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.updateCredentials = updateCredentials;
// AWSリージョン一覧を取得
const getRegions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const db = yield (0, db_1.getDatabase)();
        // 認証情報の取得
        const credentials = yield db.get('SELECT access_key_id, secret_access_key, region FROM aws_credentials WHERE user_id = ?', [userId]);
        if (!credentials) {
            return res.status(404).json({ message: 'AWS認証情報が見つかりません' });
        }
        // EC2クライアントの作成
        const ec2 = new aws_sdk_1.default.EC2({
            accessKeyId: credentials.access_key_id,
            secretAccessKey: credentials.secret_access_key,
            region: credentials.region
        });
        // リージョン一覧を取得
        const { Regions } = yield ec2.describeRegions().promise();
        const regions = (Regions === null || Regions === void 0 ? void 0 : Regions.map(region => ({
            regionName: region.RegionName,
            endpoint: region.Endpoint
        }))) || [];
        res.json({
            regions
        });
    }
    catch (error) {
        console.error('AWSリージョン取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});
exports.getRegions = getRegions;
