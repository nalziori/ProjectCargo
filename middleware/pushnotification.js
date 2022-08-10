const axios = require('axios').default;
const queryString = require('query-string');
const { urlencoded } = require('express');
const { post } = require('request');
const doAsync = require('./doAsync');
const fetch = require("node-fetch");
//const onesignalsdk = require('../OneSignalSDKWorker');


class pushmessage {
    constructor() {
        this.API_KEY = null;
        this.ONESIGANL_APP_ID = null;
        this.BASE_URL = null;
    }
    config() {
        this.API_KEY = "ZWQ0NmY2NWEtZGZkYS00NzFkLWFhODAtZDQ5MTA5MjgxYTAw";
        this.ONESIGANL_APP_ID = "9f162dba-c3de-4265-b55b-0bb9d6eba346";
        this.BASE_URL = "https://onesignal.com/api/v1";
    }


    // async option_builder(method, path, body){
    //     try{
    //         return {
    //             method,
    //             url : `${this.BASE_URL}/${path}`,
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Basic ${this.API_KEY}`,
    //             },
    //             body: body ? JSON.stringify(body) : null
    //         };
    //     } catch(error){
    //         console.error(error);
    //         return error;
    //     }
    // }



    async createNotification(data_param, push_title, push_content, player_id_array, img_url) {
        const options = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: 'Basic ZWQ0NmY2NWEtZGZkYS00NzFkLWFhODAtZDQ5MTA5MjgxYTAw',
                'Content-Type': 'application/json'
              },
            data: JSON.stringify({
                "app_id": "9f162dba-c3de-4265-b55b-0bb9d6eba346",
                included_segments: ['Subscribed Users'],
                include_player_ids: player_id_array,
                headings: { "en": push_title },   //푸시 타이틀
                contents: { "en": push_content },   //푸시 내용
                data: data_param,   //이동 url
                large_icon: "icon_96", //표시 icon
                small_icon: "icon_48",  //상태바 표시 icon
                big_picture: img_url,   //안드로이드 푸시 이미지
                ios_attachments: { "id1": img_url },   //iOS 푸시 이미지
                ios_badgeType: "Increase",   //ios badge counter
                ios_badgeCount: 1,           //ios badge counter by 1
            }),
        };

        await fetch('https://onesignal.com/api/v1/notifications', options)
        .then(response => response.json())
        .then(response => console.log(response))
        .catch(err => console.error(err));
    }

    async composebody(data_param, push_title, push_content, player_id_array, img_url) {
        try {
            const body = {
                app_id: "9f162dba-c3de-4265-b55b-0bb9d6eba346",
                included_segments: ['Subscribed Users'],
                include_player_ids: player_id_array,
                headings: { "en": push_title },   //푸시 타이틀
                contents: { "en": push_content },   //푸시 내용
                data: data_param,   //이동 url
                large_icon: "icon_96", //표시 icon
                small_icon: "icon_48",  //상태바 표시 icon
                big_picture: img_url,   //안드로이드 푸시 이미지
                ios_attachments: { "id1": img_url },   //iOS 푸시 이미지
                ios_badgeType: "Increase",   //ios badge counter
                ios_badgeCount: 1,           //ios badge counter by 1
            }
            return body;
        } catch (error) {
            console.log(error);
        }
    }


}







module.exports = pushmessage;


