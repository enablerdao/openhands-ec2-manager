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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteKeyPair = exports.createKeyPair = exports.getKeyPairs = void 0;
const awsService_1 = require("../services/awsService");
// キーペア一覧を取得
const getKeyPairs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // キーペア一覧を取得
        const { KeyPairs } = yield ec2.describeKeyPairs().promise();
        // キーペア情報を整形
        const keyPairs = (KeyPairs === null || KeyPairs === void 0 ? void 0 : KeyPairs.map(keyPair => {
            var _a;
            return ({
                keyName: keyPair.KeyName,
                keyPairId: keyPair.KeyPairId,
                keyFingerprint: keyPair.KeyFingerprint,
                tags: (_a = keyPair.Tags) === null || _a === void 0 ? void 0 : _a.map(tag => ({
                    key: tag.Key,
                    value: tag.Value
                }))
            });
        })) || [];
        res.json({
            keyPairs
        });
    }
    catch (error) {
        console.error('キーペア一覧取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getKeyPairs = getKeyPairs;
// キーペアを作成
const createKeyPair = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { keyName } = req.body;
        // 入力検証
        if (!keyName) {
            return res.status(400).json({ message: 'キーペア名は必須です' });
        }
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // キーペアを作成
        const keyPair = yield ec2.createKeyPair({
            KeyName: keyName,
            TagSpecifications: [
                {
                    ResourceType: 'key-pair',
                    Tags: [
                        {
                            Key: 'CreatedBy',
                            Value: 'OpenHandsEC2Manager'
                        }
                    ]
                }
            ]
        }).promise();
        res.status(201).json({
            message: 'キーペアが正常に作成されました',
            keyPair: {
                keyName: keyPair.KeyName,
                keyPairId: keyPair.KeyPairId,
                keyFingerprint: keyPair.KeyFingerprint,
                keyMaterial: keyPair.KeyMaterial // 秘密鍵（この後クライアントでダウンロードする）
            }
        });
    }
    catch (error) {
        console.error('キーペア作成エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.createKeyPair = createKeyPair;
// キーペアを削除
const deleteKeyPair = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { keyName } = req.params;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // キーペアを削除
        yield ec2.deleteKeyPair({
            KeyName: keyName
        }).promise();
        res.json({
            message: 'キーペアが正常に削除されました',
            keyName
        });
    }
    catch (error) {
        console.error('キーペア削除エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.deleteKeyPair = deleteKeyPair;
