const express = require('express');
const router = express.Router();
const controller = require('../controllers/landing');

router.get('/', controller.index);

module.exports = router;