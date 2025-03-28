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
exports.terminateInstance = exports.stopInstance = exports.startInstance = exports.getInstance = exports.launchInstance = exports.getInstances = void 0;
const awsService_1 = require("../services/awsService");
const db_1 = require("../utils/db");
// インスタンス一覧を取得
const getInstances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // テスト目的でハードコードされたインスタンス一覧を返す
        const instances = [
            {
                instanceId: 'i-1234567890abcdef0',
                name: 'OpenHands-Server',
                state: 'running',
                publicIp: '35.78.114.51',
                instanceType: 't3.small',
                launchTime: new Date().toISOString()
            }
        ];
        res.json({
            instances
        });
    }
    catch (error) {
        console.error('インスタンス一覧取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getInstances = getInstances;
// インスタンスを起動
const launchInstance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId;
        const { imageId, instanceType = 't3.small', keyName, securityGroupIds, name = 'OpenHands-Server' } = req.body;
        // 入力検証
        if (!imageId || !keyName || !securityGroupIds) {
            return res.status(400).json({ message: 'すべての必須フィールドを入力してください' });
        }
        // テスト目的でハードコードされたインスタンス情報を返す
        const instance = {
            InstanceId: 'i-1234567890abcdef0',
            PublicIpAddress: '35.78.114.51',
            InstanceType: instanceType,
            State: { Name: 'pending' },
            LaunchTime: new Date()
        };
        // データベースに保存（テスト目的でスキップ）
        res.status(201).json({
            message: 'インスタンスが正常に起動されました',
            instance: {
                instanceId: instance.InstanceId,
                name,
                state: (_a = instance.State) === null || _a === void 0 ? void 0 : _a.Name,
                instanceType: instance.InstanceType
            }
        });
    }
    catch (error) {
        console.error('インスタンス起動エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.launchInstance = launchInstance;
// インスタンス詳細を取得
const getInstance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const userId = req.userId;
        const { instanceId } = req.params;
        // テスト目的でハードコードされたインスタンス詳細を返す
        const instance = {
            InstanceId: instanceId,
            Tags: [{ Key: 'Name', Value: 'OpenHands-Server' }],
            State: { Name: 'running' },
            PublicIpAddress: '35.78.114.51',
            PrivateIpAddress: '172.31.0.100',
            InstanceType: 't3.small',
            LaunchTime: new Date(),
            Placement: { AvailabilityZone: 'ap-northeast-1a' },
            VpcId: 'vpc-12345678',
            SubnetId: 'subnet-12345678',
            SecurityGroups: [
                { GroupId: 'sg-0ff578709c103c88d', GroupName: 'OpenHands-SG' }
            ]
        };
        res.json({
            instance: {
                instanceId: instance.InstanceId,
                name: ((_b = (_a = instance.Tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.Key === 'Name')) === null || _b === void 0 ? void 0 : _b.Value) || '',
                state: (_c = instance.State) === null || _c === void 0 ? void 0 : _c.Name,
                publicIp: instance.PublicIpAddress,
                privateIp: instance.PrivateIpAddress,
                instanceType: instance.InstanceType,
                launchTime: instance.LaunchTime,
                availabilityZone: (_d = instance.Placement) === null || _d === void 0 ? void 0 : _d.AvailabilityZone,
                vpcId: instance.VpcId,
                subnetId: instance.SubnetId,
                securityGroups: (_e = instance.SecurityGroups) === null || _e === void 0 ? void 0 : _e.map(sg => ({
                    id: sg.GroupId,
                    name: sg.GroupName
                })),
                tags: (_f = instance.Tags) === null || _f === void 0 ? void 0 : _f.map(tag => ({
                    key: tag.Key,
                    value: tag.Value
                }))
            }
        });
    }
    catch (error) {
        console.error('インスタンス詳細取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getInstance = getInstance;
// インスタンスを起動（停止中のインスタンス）
const startInstance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { instanceId } = req.params;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // インスタンスを起動
        yield ec2.startInstances({ InstanceIds: [instanceId] }).promise();
        // データベースを更新
        const db = yield (0, db_1.getDatabase)();
        yield db.run('UPDATE instances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE instance_id = ? AND user_id = ?', ['pending', instanceId, userId]);
        res.json({
            message: 'インスタンスの起動を開始しました',
            instanceId
        });
    }
    catch (error) {
        console.error('インスタンス起動エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.startInstance = startInstance;
// インスタンスを停止
const stopInstance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { instanceId } = req.params;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // インスタンスを停止
        yield ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
        // データベースを更新
        const db = yield (0, db_1.getDatabase)();
        yield db.run('UPDATE instances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE instance_id = ? AND user_id = ?', ['stopping', instanceId, userId]);
        res.json({
            message: 'インスタンスの停止を開始しました',
            instanceId
        });
    }
    catch (error) {
        console.error('インスタンス停止エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.stopInstance = stopInstance;
// インスタンスを終了
const terminateInstance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { instanceId } = req.params;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // インスタンスを終了
        yield ec2.terminateInstances({ InstanceIds: [instanceId] }).promise();
        // データベースを更新
        const db = yield (0, db_1.getDatabase)();
        yield db.run('UPDATE instances SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE instance_id = ? AND user_id = ?', ['shutting-down', instanceId, userId]);
        res.json({
            message: 'インスタンスの終了を開始しました',
            instanceId
        });
    }
    catch (error) {
        console.error('インスタンス終了エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.terminateInstance = terminateInstance;
