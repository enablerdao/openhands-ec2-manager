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
exports.getSecurityGroup = exports.createSecurityGroup = exports.getSecurityGroups = void 0;
const awsService_1 = require("../services/awsService");
// セキュリティグループ一覧を取得
const getSecurityGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // セキュリティグループ一覧を取得
        const { SecurityGroups } = yield ec2.describeSecurityGroups().promise();
        // セキュリティグループ情報を整形
        const securityGroups = (SecurityGroups === null || SecurityGroups === void 0 ? void 0 : SecurityGroups.map(sg => {
            var _a, _b, _c;
            return ({
                groupId: sg.GroupId,
                groupName: sg.GroupName,
                description: sg.Description,
                vpcId: sg.VpcId,
                inboundRules: (_a = sg.IpPermissions) === null || _a === void 0 ? void 0 : _a.map(perm => {
                    var _a;
                    return ({
                        protocol: perm.IpProtocol,
                        fromPort: perm.FromPort,
                        toPort: perm.ToPort,
                        ipRanges: (_a = perm.IpRanges) === null || _a === void 0 ? void 0 : _a.map(range => ({
                            cidrIp: range.CidrIp,
                            description: range.Description
                        }))
                    });
                }),
                outboundRules: (_b = sg.IpPermissionsEgress) === null || _b === void 0 ? void 0 : _b.map(perm => {
                    var _a;
                    return ({
                        protocol: perm.IpProtocol,
                        fromPort: perm.FromPort,
                        toPort: perm.ToPort,
                        ipRanges: (_a = perm.IpRanges) === null || _a === void 0 ? void 0 : _a.map(range => ({
                            cidrIp: range.CidrIp,
                            description: range.Description
                        }))
                    });
                }),
                tags: (_c = sg.Tags) === null || _c === void 0 ? void 0 : _c.map(tag => ({
                    key: tag.Key,
                    value: tag.Value
                }))
            });
        })) || [];
        res.json({
            securityGroups
        });
    }
    catch (error) {
        console.error('セキュリティグループ一覧取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getSecurityGroups = getSecurityGroups;
// セキュリティグループを作成
const createSecurityGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { groupName, description = 'Security group for OpenHands', vpcId, inboundRules = [] } = req.body;
        // 入力検証
        if (!groupName) {
            return res.status(400).json({ message: 'グループ名は必須です' });
        }
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // セキュリティグループを作成
        const { GroupId } = yield ec2.createSecurityGroup({
            GroupName: groupName,
            Description: description,
            VpcId: vpcId
        }).promise();
        if (!GroupId) {
            return res.status(500).json({ message: 'セキュリティグループの作成に失敗しました' });
        }
        // インバウンドルールを追加
        if (inboundRules.length > 0) {
            yield ec2.authorizeSecurityGroupIngress({
                GroupId,
                IpPermissions: inboundRules.map((rule) => ({
                    IpProtocol: rule.protocol,
                    FromPort: rule.fromPort,
                    ToPort: rule.toPort,
                    IpRanges: [
                        {
                            CidrIp: rule.cidrIp || '0.0.0.0/0',
                            Description: rule.description
                        }
                    ]
                }))
            }).promise();
        }
        else {
            // デフォルトのインバウンドルール（SSH + OpenHands）
            yield ec2.authorizeSecurityGroupIngress({
                GroupId,
                IpPermissions: [
                    {
                        IpProtocol: 'tcp',
                        FromPort: 22,
                        ToPort: 22,
                        IpRanges: [
                            {
                                CidrIp: '0.0.0.0/0',
                                Description: 'SSH access'
                            }
                        ]
                    },
                    {
                        IpProtocol: 'tcp',
                        FromPort: 3000,
                        ToPort: 3000,
                        IpRanges: [
                            {
                                CidrIp: '0.0.0.0/0',
                                Description: 'OpenHands access'
                            }
                        ]
                    }
                ]
            }).promise();
        }
        // タグを追加
        yield ec2.createTags({
            Resources: [GroupId],
            Tags: [
                {
                    Key: 'Name',
                    Value: groupName
                },
                {
                    Key: 'CreatedBy',
                    Value: 'OpenHandsEC2Manager'
                }
            ]
        }).promise();
        res.status(201).json({
            message: 'セキュリティグループが正常に作成されました',
            securityGroup: {
                groupId: GroupId,
                groupName,
                description
            }
        });
    }
    catch (error) {
        console.error('セキュリティグループ作成エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.createSecurityGroup = createSecurityGroup;
// セキュリティグループ詳細を取得
const getSecurityGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = req.userId;
        const { groupId } = req.params;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // セキュリティグループ詳細を取得
        const { SecurityGroups } = yield ec2.describeSecurityGroups({
            GroupIds: [groupId]
        }).promise();
        const securityGroup = SecurityGroups === null || SecurityGroups === void 0 ? void 0 : SecurityGroups[0];
        if (!securityGroup) {
            return res.status(404).json({ message: 'セキュリティグループが見つかりません' });
        }
        res.json({
            securityGroup: {
                groupId: securityGroup.GroupId,
                groupName: securityGroup.GroupName,
                description: securityGroup.Description,
                vpcId: securityGroup.VpcId,
                inboundRules: (_a = securityGroup.IpPermissions) === null || _a === void 0 ? void 0 : _a.map(perm => {
                    var _a;
                    return ({
                        protocol: perm.IpProtocol,
                        fromPort: perm.FromPort,
                        toPort: perm.ToPort,
                        ipRanges: (_a = perm.IpRanges) === null || _a === void 0 ? void 0 : _a.map(range => ({
                            cidrIp: range.CidrIp,
                            description: range.Description
                        }))
                    });
                }),
                outboundRules: (_b = securityGroup.IpPermissionsEgress) === null || _b === void 0 ? void 0 : _b.map(perm => {
                    var _a;
                    return ({
                        protocol: perm.IpProtocol,
                        fromPort: perm.FromPort,
                        toPort: perm.ToPort,
                        ipRanges: (_a = perm.IpRanges) === null || _a === void 0 ? void 0 : _a.map(range => ({
                            cidrIp: range.CidrIp,
                            description: range.Description
                        }))
                    });
                }),
                tags: (_c = securityGroup.Tags) === null || _c === void 0 ? void 0 : _c.map(tag => ({
                    key: tag.Key,
                    value: tag.Value
                }))
            }
        });
    }
    catch (error) {
        console.error('セキュリティグループ詳細取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getSecurityGroup = getSecurityGroup;
