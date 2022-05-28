const path = require('path');
const express = require('express');
const router = express.Router();
const controller = require('../controllers/react');

// Waffle
router.get('/getMenus', controller.getMenus);


module.exports = router;