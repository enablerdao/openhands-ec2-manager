import express from 'express';
import authRoutes from './auth';
import awsRoutes from './aws';
import instancesRoutes from './instances';
import amisRoutes from './amis';
import securityGroupsRoutes from './securityGroups';
import keyPairsRoutes from './keyPairs';
import envRoutes from './env';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/aws', awsRoutes);
router.use('/instances', instancesRoutes);
router.use('/amis', amisRoutes);
router.use('/security-groups', securityGroupsRoutes);
router.use('/key-pairs', keyPairsRoutes);
router.use('/env', envRoutes);

export default router;