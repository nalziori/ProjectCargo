const fs = require('fs');
const path = require('path')
const express = require('express');
const router = express.Router();
const controller = require('../controllers/api');

const multer = require('multer');
const multerS3 = require('multer-s3');

// Engine
router.post('/image/new', multer().fields([{ name: 'images' }]), controller.imageNew);
router.post('/image/delete', controller.imageDelete);

router.post('/blockUser', controller.blockUser);

//push id
router.post('/catch', controller.catch);

// CKEditor5
router.post('/image/upload', multer().fields([{ name: 'image' }]), controller.imageUpload);

router.post('/userImage', multer().fields([{ name: 'userImage' }]), controller.userImage);

router.post('/idCheck', controller.idCheck);
router.post('/nickNameCheck', controller.nickNameCheck);
router.post('/emailCheck', controller.emailCheck);

router.post('/phoneVerify', controller.phoneVerify);
router.post('/phoneVerify/complete', controller.phoneVerifyComplete);

router.get('/getLink', controller.getLink);

router.get('/usePermissionImage', controller.usePermissionImage);

router.post('/getChat', controller.getChat);
router.post('/makeChatRoom', controller.makeChatRoom);
router.post('/getCategories', controller.getCategories);
router.post('/getUser', controller.getUser);
router.post('/getBoard', controller.getBoard);
router.post('/getUserGroupPermission', controller.getUserGroupPermission);
router.get('/getSetting', controller.getSetting);

router.post('/report', controller.report);

router.post('/blockWordsCheck', controller.checkBlockWords);

router.post('/like', controller.like);

router.post('/getContent', controller.getContent);
router.post('/getContentPage', controller.getContentPage);

router.post('/comment/get', controller.getComments);
router.post('/comment/new', controller.newComment);
router.post('/comment/reply', controller.replyComment);
router.post('/comment/edit', controller.editComment);
router.post('/comment/delete', controller.deleteComment);
router.post('/comment/like', controller.likeComment);
router.post('/comment/unlike', controller.unlikeComment);

// Offline
router.get('/offline/provinces', controller.getProvinces);
router.get('/offline/geolocation', controller.geolocation);
router.post('/offline/geolocation', controller.geolocation);

module.exports = router;