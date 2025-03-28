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
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // インスタンス一覧を取得
        const { Reservations } = yield ec2.describeInstances().promise();
        // インスタンス情報を整形
        const instances = (Reservations === null || Reservations === void 0 ? void 0 : Reservations.flatMap(reservation => {
            var _a;
            return ((_a = reservation.Instances) === null || _a === void 0 ? void 0 : _a.map(instance => {
                var _a, _b, _c;
                return ({
                    instanceId: instance.InstanceId,
                    name: ((_b = (_a = instance.Tags) === null || _a === void 0 ? void 0 : _a.find(tag => tag.Key === 'Name')) === null || _b === void 0 ? void 0 : _b.Value) || '',
                    state: (_c = instance.State) === null || _c === void 0 ? void 0 : _c.Name,
                    publicIp: instance.PublicIpAddress,
                    instanceType: instance.InstanceType,
                    launchTime: instance.LaunchTime
                });
            })) || [];
        })) || [];
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
    var _a, _b, _c, _d, _e;
    try {
        const userId = req.userId;
        const { imageId, instanceType = 't3.small', keyName, securityGroupIds, name = 'OpenHands-Server' } = req.body;
        // 入力検証
        if (!imageId || !keyName || !securityGroupIds) {
            return res.status(400).json({ message: 'すべての必須フィールドを入力してください' });
        }
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // OpenHandsのユーザーデータスクリプトを生成
        const userData = (0, awsService_1.generateOpenHandsUserData)();
        // インスタンスを起動
        const result = yield ec2.runInstances({
            ImageId: imageId,
            InstanceType: instanceType,
            KeyName: keyName,
            SecurityGroupIds: Array.isArray(securityGroupIds) ? securityGroupIds : [securityGroupIds],
            MinCount: 1,
            MaxCount: 1,
            UserData: userData,
            BlockDeviceMappings: [
                {
                    DeviceName: '/dev/sda1',
                    Ebs: {
                        VolumeSize: 20,
                        DeleteOnTermination: true
                    }
                }
            ],
            TagSpecifications: [
                {
                    ResourceType: 'instance',
                    Tags: [
                        {
                            Key: 'Name',
                            Value: name
                        }
                    ]
                }
            ]
        }).promise();
        // インスタンス情報を取得
        const instance = (_a = result.Instances) === null || _a === void 0 ? void 0 : _a[0];
        if (!instance) {
            return res.status(500).json({ message: 'インスタンスの起動に失敗しました' });
        }
        // データベースに保存
        const db = yield (0, db_1.getDatabase)();
        yield db.run('INSERT INTO instances (user_id, instance_id, name, region, status, instance_type) VALUES (?, ?, ?, ?, ?, ?)', [
            userId,
            instance.InstanceId,
            name,
            ((_c = (_b = instance.Placement) === null || _b === void 0 ? void 0 : _b.AvailabilityZone) === null || _c === void 0 ? void 0 : _c.slice(0, -1)) || 'unknown',
            (_d = instance.State) === null || _d === void 0 ? void 0 : _d.Name,
            instance.InstanceType
        ]);
        res.status(201).json({
            message: 'インスタンスが正常に起動されました',
            instance: {
                instanceId: instance.InstanceId,
                name,
                state: (_e = instance.State) === null || _e === void 0 ? void 0 : _e.Name,
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const userId = req.userId;
        const { instanceId } = req.params;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // インスタンス詳細を取得
        const { Reservations } = yield ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
        const instance = (_b = (_a = Reservations === null || Reservations === void 0 ? void 0 : Reservations[0]) === null || _a === void 0 ? void 0 : _a.Instances) === null || _b === void 0 ? void 0 : _b[0];
        if (!instance) {
            return res.status(404).json({ message: 'インスタンスが見つかりません' });
        }
        res.json({
            instance: {
                instanceId: instance.InstanceId,
                name: ((_d = (_c = instance.Tags) === null || _c === void 0 ? void 0 : _c.find(tag => tag.Key === 'Name')) === null || _d === void 0 ? void 0 : _d.Value) || '',
                state: (_e = instance.State) === null || _e === void 0 ? void 0 : _e.Name,
                publicIp: instance.PublicIpAddress,
                privateIp: instance.PrivateIpAddress,
                instanceType: instance.InstanceType,
                launchTime: instance.LaunchTime,
                availabilityZone: (_f = instance.Placement) === null || _f === void 0 ? void 0 : _f.AvailabilityZone,
                vpcId: instance.VpcId,
                subnetId: instance.SubnetId,
                securityGroups: (_g = instance.SecurityGroups) === null || _g === void 0 ? void 0 : _g.map(sg => ({
                    id: sg.GroupId,
                    name: sg.GroupName
                })),
                tags: (_h = instance.Tags) === null || _h === void 0 ? void 0 : _h.map(tag => ({
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
