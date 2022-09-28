exports.worker = ()=>{
    if('undefined' === typeof window) {
        importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
    }
}

