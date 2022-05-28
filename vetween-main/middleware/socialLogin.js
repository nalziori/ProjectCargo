const { google } = require('googleapis');
const AppleAuth = require('apple-auth');
const oauth = require('oauth');
const jwt = require('jsonwebtoken');
const axios = require('axios').default;
const queryString = require('query-string');
const hashCreate = require('./hash');

class AppleLogin {
  constructor () {
    this.appleAuth = null;
  }
  getLoginUrl (socialAppleServiceId, socialAppleTeamId, socialAppleKeyId, socialAppleAuthKey, redirectUri) {
    const config = {
      client_id: socialAppleServiceId,
      team_id: socialAppleTeamId,
      key_id: socialAppleKeyId,
      redirect_uri: redirectUri,
      scope: 'name email',
    };
    this.appleAuth = new AppleAuth(config, socialAppleAuthKey, 'text');
    return this.appleAuth.loginURL();
  }
  async auth (code) {
    const response = await this.appleAuth.accessToken(code);
    const idToken = jwt.decode(response.id_token);
    let user = null;
    if (idToken) {
      user = {
        type: 'apple',
        id: idToken.sub,
        email: idToken.email,
      };
    }
    return user;
  }
}

class GoogleLogin {
  constructor () {
    this.oauth2Client = null;
  }
  getLoginUrl (googleClientId, googleClientSecret, googleRedirect) {
    this.oauth2Client = new google.auth.OAuth2(
      googleClientId,
      googleClientSecret,
      googleRedirect,
    );
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });
  }
  async auth (code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    const data = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`, {
      headers: {
        Authorization: `Bearer ${tokens.id_token}`,
      },
    })
    .then(res => res.data)
    .catch(error => {
      throw new Error(error.message);
    });
    let user = null;
    if (data) {
      user = {
        type: 'google',
        id: data.id,
        email: data.email,
      };
    }
    return user;
  }
}

class FacebookLogin {
  constructor () {
    this.socialFacebookAppId = null;
    this.socialFacebookAppSecret = null;
    this.socialFacebookRedirect = null;
  }
  getLoginUrl (socialFacebookAppId, socialFacebookAppSecret, socialFacebookRedirect) {
    this.socialFacebookAppId = socialFacebookAppId;
    this.socialFacebookAppSecret = socialFacebookAppSecret;
    this.socialFacebookRedirect = socialFacebookRedirect;

    const stringifiedParams = queryString.stringify({
      client_id: socialFacebookAppId,
      redirect_uri: socialFacebookRedirect,
      scope: ['email', 'user_friends'].join(','),
      response_type: 'code',
      auth_type: 'rerequest',
      display: 'popup',
    });

    const facebookLoginUrl = `https://www.facebook.com/v4.0/dialog/oauth?${stringifiedParams}`;
    return facebookLoginUrl;
  }
  async auth (code) {
    const accessToken = await this.getToken(code);
    const data = await this.getUser(accessToken);
    return data;
  }
  async getToken (code) {
    const { data } = await axios({
      method: 'GET',
      url: 'https://graph.facebook.com/v4.0/oauth/access_token',
      params: {
        client_id: this.socialFacebookAppId,
        client_secret: this.socialFacebookAppSecret,
        redirect_uri: this.socialFacebookRedirect,
        code,
      },
    });
    return data.access_token;
  }
  async getUser (accessToken) {
    const { data } = await axios({
      method: 'GET',
      url: 'https://graph.facebook.com/me',
      params: {
        fields: ['id', 'email', 'first_name', 'last_name'].join(','),
        access_token: accessToken,
      },
    });
    let user = null;
    if (data) {
      user = {
        type: 'facebook',
        id: data.id,
        email: data.email,
      };
    }
    return user;
  }
}

class TwitterLogin {
  constructor () {
    this.oauthConsumer = null;
    this.socialTwitterApiKey = null;
    this.socialTwitterApiSecret = null;
    this.socialTwitterRedirect = null;
    this.oauthRequestToken = null;
    this.oauthRequestTokenSecret = null;
  }
  async getLoginUrl (req, socialTwitterApiKey, socialTwitterApiSecret, socialTwitterRedirect) {
    this.socialTwitterApiKey = socialTwitterApiKey;
    this.socialTwitterApiSecret = socialTwitterApiSecret;
    this.socialTwitterRedirect = socialTwitterRedirect;
    this.oauthConsumer = new oauth.OAuth(
      'https://twitter.com/oauth/request_token',
      'https://twitter.com/oauth/access_token',
      this.socialTwitterApiKey,
      this.socialTwitterApiSecret,
      '1.0A',
      socialTwitterRedirect,
      'HMAC-SHA1',
    );
    const twitterLoginUrl = await this.getRequestToken(req);
    return twitterLoginUrl;
  }
  async auth (req, oauthVerifier) {
    let user = null;
    const token = await this.getAccessToken(req, oauthVerifier);
    if (token) {
      const userRaw = await this.getUser(token);
      if (userRaw) {
        user = {
          type: 'twitter',
          id: userRaw.id,
          email: userRaw.email || null,
        }
      }
    }
    return user;
  }
  async getRequestToken (req) {
    return new Promise((resolve, reject) => {
      this.oauthConsumer.getOAuthRequestToken((err, oauthToken, oauthTokenSecret, results) => {
        if (err) {
          console.error('Error getting OAuth request token');
          resolve(null);
        } else {
          req.session.oauthRequestToken = oauthToken;
          req.session.oauthRequestTokenSecret = oauthTokenSecret;
          resolve(`https://twitter.com/oauth/authorize?oauth_token=${req.session.oauthRequestToken}`);
        }
      });
    });
  }
  async getAccessToken (req, oauthVerifier) {
    return new Promise((resolve, reject) => {
      if (this.oauthConsumer) {
        this.oauthConsumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, oauthVerifier, (err, oauthAccessToken, oauthAccessTokenSecret, results) => {
          if (err) {
            console.error('Error getting OAuth request access token');
            resolve(null);
          } else {
            req.session.oauthAccessToken = oauthAccessToken;
            req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
            resolve({
              oauthAccessToken,
              oauthAccessTokenSecret,
            })
          }
        });
      } else {
        resolve(null);
      }
    });
  }
  async getUser (token) {
    return new Promise((resolve, reject) => {
      if (token) {
        const { oauthAccessToken, oauthAccessTokenSecret } = token;
        this.oauthConsumer.get('https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true', oauthAccessToken, oauthAccessTokenSecret, (err, data, response) => {
          if (err) {
            console.error('Error getting OAuth request user');
            resolve(null);
          } else {
            resolve(JSON.parse(data));
          }
        });
      } else {
        resolve(null);
      }
    });
  }
}

class NaverLogin {
  constructor () {
    this.socialNaverClientId = null;
    this.socialNaverClientSecret = null;
    this.socialNaverRedirect = null;
    this.state = null;
  }
  getLoginUrl (socialNaverClientId, socialNaverClientSecret, socialNaverRedirect) {
    this.socialNaverClientId = socialNaverClientId;
    this.socialNaverClientSecret = socialNaverClientSecret;
    this.socialNaverRedirect = socialNaverRedirect;
    this.state = hashCreate(6);
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${this.socialNaverClientId}&redirect_uri=${this.socialNaverRedirect}&state=${this.state}`;
    return naverLoginUrl;
  }
  async auth (code, state) {
    const token = await this.getToken(code, state);
    const user = await this.getUser(token);
    return user;
  }
  async getToken (code, state) {
    const token = await axios({
      method: 'GET',
      url: `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${this.socialNaverClientId}&client_secret=${this.socialNaverClientSecret}&redirect_uri=${this.socialNaverRedirect}&code=${code}&state=${state}`,
      headers: {
        'X-Naver-Client-Id': this.socialNaverClientId,
        'X-Naver-Client-Secret': this.socialNaverClientSecret,
      },
    }).then(res => res.data)
    .catch(e => console.error(e));

    return token;
  }
  async getUser (token) {
    const userRaw = await axios({
      method: 'POST',
      url: 'https://openapi.naver.com/v1/nid/me',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    }).then(res => res.data)
    .catch(e => console.error(e));
    
    let user = null;
    if (userRaw) {
      const data = userRaw.response;
      user = {
        type: 'naver',
        id: data.id,
        email: data.email,
      };
    }
    return user;
  }
}

class KakaoLogin {
  constructor () {
    this.socialKakaoClientId = null;
    this.socialKakaoClientSecret = null;
    this.socialKakaoRedirect = null;
  }
  getLoginUrl (socialKakaoClientId, socialKakaoClientSecret, socialKakaoRedirect) {
    this.socialKakaoClientId = socialKakaoClientId;
    this.socialKakaoClientSecret = socialKakaoClientSecret;
    this.socialKakaoRedirect = socialKakaoRedirect;

    const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${this.socialKakaoClientId}&redirect_uri=${this.socialKakaoRedirect}&response_type=code&scope=account_email`;
    return kakaoLoginUrl;
  }
  async auth (code) {
    const token = await this.getToken(code);
    const user = await this.getUser(token);
    return user;
  }
  async getToken (code) {
    const hash = hashCreate(6);
    const token = await axios({
      method: 'POST',
      url: 'https://kauth.kakao.com/oauth/token',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: queryString.stringify({
        grant_type: 'authorization_code',
        client_id: this.socialKakaoClientId,
        client_secret: this.socialKakaoClientSecret,
        redirectUri: this.socialKakaoRedirect,
        code,
      })
    }).then(res => res.data)
    .catch(e => console.error(e));
    return token;
  }
  async getUser (token) {
    const userRaw = await axios({
      method: 'GET',
      url: 'https://kapi.kakao.com/v2/user/me',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    }).then(res => res.data)
    .catch(e => console.error(e));
    let user = null;
    if (userRaw) {
      user = {
        type: 'kakao',
        id: userRaw.id,
        email: userRaw.kakao_account.email,
      };
    }
    return user;
  }
}

module.exports = {
  AppleLogin,
  GoogleLogin,
  FacebookLogin,
  TwitterLogin,
  NaverLogin,
  KakaoLogin,
};