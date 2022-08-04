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

OneSignal.push(function () {
    // Occurs when the user's subscription changes to a new value.
    OneSignal.on('subscriptionChange', function (isSubscribed) {
        if (isSubscribed) {
            OneSignal.getUserId(function (userId) {
                // (Output) OneSignal User ID: 270a35cd-4dda-4b3f-b04e-41d7463a2316
                location.href('https://vetween.kr/catch/' + userId);
            });
        }
    });
});

