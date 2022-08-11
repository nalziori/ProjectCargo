const axios = require('axios').default;
const queryString = require('query-string');
const { urlencoded } = require('express');
const { post } = require('request');
const doAsync = require('./doAsync');
const fetch = require("node-fetch");
//const onesignalsdk = require('../OneSignalSDKWorker');


class pushmessage {
    config() {
        this.API_KEY = "ZWQ0NmY2NWEtZGZkYS00NzFkLWFhODAtZDQ5MTA5MjgxYTAw";
        this.ONESIGANL_APP_ID = "9f162dba-c3de-4265-b55b-0bb9d6eba346";
        this.BASE_URL = "https://onesignal.com/api/v1";
    }
    sendNotification(data){
        var headers = {
          "Content-Type": "application/json; charset=utf-8"
        };
        
        var options = {
          host: "onesignal.com",
          port: 443,
          path: "/api/v1/notifications",
          method: "POST",
          headers: headers
        };
        
        var https = require('https');
        var req = https.request(options, function(res) {  
          res.on('data', function(data) {
            console.log("Response:");
            console.log(JSON.parse(data));
          });
        });
        
        req.on('error', function(e) {
          console.log("ERROR:");
          console.log(e);
        });
        
        req.write(JSON.stringify(data));
        req.end();

        
      };
      
      
      
    // async createNotification() {
    //     const options = {
    //         method: 'POST',
    //         headers: {
    //             Accept: 'application/json',
    //             Authorization: 'Basic ZWQ0NmY2NWEtZGZkYS00NzFkLWFhODAtZDQ5MTA5MjgxYTAw',
    //             'Content-Type' : 'application/json; charset=utf-8'
    //           },
    //         data: JSON.stringify({
    //             app_id: "9f162dba-c3de-4265-b55b-0bb9d6eba346",
    //             //included_segments: ['Subscribed Users'],
    //             include_player_ids: ["cf250570-0c69-4f87-a16b-4fb9a5323225"],
    //             headings: { "en": "test" },   //푸시 타이틀
    //             contents: { "en": "test" },   //푸시 내용
    //             data: "https://vetween.kr/",   //이동 url
    //             /*
    //             large_icon: "icon_96", //표시 icon
    //             small_icon: "icon_48",  //상태바 표시 icon
    //             big_picture: img_url,   //안드로이드 푸시 이미지
    //             ios_attachments: { "id1": img_url },   //iOS 푸시 이미지
    //             ios_badgeType: "Increase",   //ios badge counter
    //             ios_badgeCount: 1,           //ios badge counter by 1*/
    //         }),
    //     };

    //     await fetch('https://onesignal.com/api/v1/notifications', options)
    //     .then(response => response.json())
    //     .then(response => console.log(response))
    //     .catch(err => console.error(err));
    // }

}







module.exports = pushmessage;


