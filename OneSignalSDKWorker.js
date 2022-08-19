if('serviceWorker' in navigator) {
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('/OneSignalSDKWorker.js')
        .then((reg)=>{
            importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
            console.log('Service worker registered.', reg);
        })
        .catch(e => console.log(e));
    })
  }