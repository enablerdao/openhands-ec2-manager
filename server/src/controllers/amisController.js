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
exports.getRecommendedAmis = exports.getAmis = void 0;
const awsService_1 = require("../services/awsService");
// AMI一覧を取得
const getAmis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { owner = 'self', filters } = req.query;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // AMI一覧を取得
        const params = {};
        if (owner === 'self') {
            params.Owners = ['self'];
        }
        else if (owner === 'amazon') {
            params.Owners = ['amazon'];
        }
        if (filters) {
            try {
                params.Filters = JSON.parse(filters);
            }
            catch (error) {
                return res.status(400).json({ message: 'フィルターの形式が無効です' });
            }
        }
        const { Images } = yield ec2.describeImages(params).promise();
        // AMI情報を整形
        const amis = (Images === null || Images === void 0 ? void 0 : Images.map(image => {
            var _a;
            return ({
                imageId: image.ImageId,
                name: image.Name,
                description: image.Description,
                state: image.State,
                creationDate: image.CreationDate,
                platform: image.Platform,
                architecture: image.Architecture,
                rootDeviceType: image.RootDeviceType,
                virtualizationType: image.VirtualizationType,
                tags: (_a = image.Tags) === null || _a === void 0 ? void 0 : _a.map(tag => ({
                    key: tag.Key,
                    value: tag.Value
                }))
            });
        })) || [];
        res.json({
            amis
        });
    }
    catch (error) {
        console.error('AMI一覧取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getAmis = getAmis;
// 推奨AMI一覧を取得
const getRecommendedAmis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // EC2クライアントを作成
        const ec2 = yield (0, awsService_1.createEC2Client)(userId);
        // Ubuntu 22.04 LTSの最新AMIを取得
        const ubuntuParams = {
            Owners: ['099720109477'], // Canonical
            Filters: [
                {
                    Name: 'name',
                    Values: ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*']
                },
                {
                    Name: 'state',
                    Values: ['available']
                }
            ]
        };
        const ubuntuResult = yield ec2.describeImages(ubuntuParams).promise();
        // Amazon Linux 2の最新AMIを取得
        const amazonLinuxParams = {
            Owners: ['amazon'],
            Filters: [
                {
                    Name: 'name',
                    Values: ['amzn2-ami-hvm-*-x86_64-gp2']
                },
                {
                    Name: 'state',
                    Values: ['available']
                }
            ]
        };
        const amazonLinuxResult = yield ec2.describeImages(amazonLinuxParams).promise();
        // Amazon Linux 2023の最新AMIを取得
        const amazonLinux2023Params = {
            Owners: ['amazon'],
            Filters: [
                {
                    Name: 'name',
                    Values: ['al2023-ami-*-x86_64']
                },
                {
                    Name: 'state',
                    Values: ['available']
                }
            ]
        };
        const amazonLinux2023Result = yield ec2.describeImages(amazonLinux2023Params).promise();
        // 結果を日付でソート
        const sortByCreationDate = (images = []) => {
            return [...images].sort((a, b) => {
                const dateA = a.CreationDate ? new Date(a.CreationDate).getTime() : 0;
                const dateB = b.CreationDate ? new Date(b.CreationDate).getTime() : 0;
                return dateB - dateA;
            });
        };
        const latestUbuntu = sortByCreationDate(ubuntuResult.Images)[0];
        const latestAmazonLinux = sortByCreationDate(amazonLinuxResult.Images)[0];
        const latestAmazonLinux2023 = sortByCreationDate(amazonLinux2023Result.Images)[0];
        // 推奨AMI一覧を作成
        const recommendedAmis = [
            latestUbuntu && {
                imageId: latestUbuntu.ImageId,
                name: latestUbuntu.Name,
                description: 'Ubuntu 22.04 LTS (推奨)',
                platform: 'Ubuntu',
                creationDate: latestUbuntu.CreationDate
            },
            latestAmazonLinux2023 && {
                imageId: latestAmazonLinux2023.ImageId,
                name: latestAmazonLinux2023.Name,
                description: 'Amazon Linux 2023',
                platform: 'Amazon Linux',
                creationDate: latestAmazonLinux2023.CreationDate
            },
            latestAmazonLinux && {
                imageId: latestAmazonLinux.ImageId,
                name: latestAmazonLinux.Name,
                description: 'Amazon Linux 2',
                platform: 'Amazon Linux',
                creationDate: latestAmazonLinux.CreationDate
            }
        ].filter(Boolean);
        res.json({
            recommendedAmis
        });
    }
    catch (error) {
        console.error('推奨AMI一覧取得エラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました', error: error.message });
    }
});
exports.getRecommendedAmis = getRecommendedAmis;
