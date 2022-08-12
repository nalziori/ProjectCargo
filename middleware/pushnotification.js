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

}







module.exports = pushmessage;


