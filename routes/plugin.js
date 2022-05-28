const path = require('path');
const express = require('express');
const router = express.Router();
const controller = require('../controllers/plugin');
const { isLogin } = require('../middleware/permission');

// Seo
router.get('/dashboard', isLogin, controller.seoDashboard);
router.get('/deposit', isLogin, controller.seoDeposit);
router.post('/deposit', isLogin, controller.seoDeposit);
router.get('/order', isLogin, controller.seoOrder);
router.get('/order/:serviceId', isLogin, controller.seoOrderService);
router.post('/order/:serviceId', isLogin, controller.seoOrderService);
router.get('/history', isLogin, controller.seoHistory);

// Waffle
router.get('/ranking', controller.waffleRanking);

// Bitcoin
router.get('/calculator', controller.calculator);

module.exports = router;