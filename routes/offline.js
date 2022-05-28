const express = require('express');
const router = express.Router();
const controller = require('../controllers/offline');

router.get('/', controller.index);
router.get('/around', controller.around);
router.get('/location', controller.location);
router.get('/store/:storeId', controller.store);
router.get('/store/:storeId/like', controller.storeLike);
router.post('/store/:storeId/review/new', controller.storeReviewNew);
router.post('/store/:storeId/review/edit/:reviewId', controller.storeReviewEdit);

module.exports = router;