var OneSignal = window.OneSignal || [];
var initConfig = {
    appId: "9f162dba-c3de-4265-b55b-0bb9d6eba346",
    notifyButton: {
        enable: true
    },
};
OneSignal.push(function () {
    OneSignal.init(initConfig);
});

function once(fn, context){
    var result;
    return function(){
        if(fn){
            result = fn.apply(context || this, arguments);
            fn=null;
        }
        return result;
    }
}

OneSignal.isPushNotificationsEnabled(function(isEnabled) {
    if (isEnabled) {  
        OneSignal.push(function(){
            once(OneSignal.getUserId(function(userId){
                location.href('https://vetween.kr/catch/'+userId);
                var mytime = setTimeout(function(){
                    location.href('https://vetween.kr/catch/'+userId);
                }, 1000);
                clearTimeout(mytime);
            }))
        })
    }
});    

