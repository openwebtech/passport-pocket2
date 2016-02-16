'use strict';

/**
 * passport-pocketのバグ修正対応
 *
 * See: https://github.com/Siedrix/passport-pocket
 */
var request = require('request');
var passport = require('passport');
var util = require('util');

function OAuth(options) {
  this.options = options;
  this.authUrl = 'https://getpocket.com/auth/authorize?request_token={:requestToken}&redirect_uri={:redirectUri}';

  return this;
}

OAuth.prototype._formDataToJson = function(formData) {
  var json = {};

  formData.split('&').forEach(function(item) {
    var itemPair = item.split('=');
    json[itemPair[0]] = itemPair[1];
  });

  return json;
};

OAuth.prototype._formatAuthUrl = function(token, redirectUri) {
  return this.authUrl.replace('{:requestToken}', token)
    .replace('{:redirectUri}', redirectUri);
};

OAuth.prototype.getOAuthAccessToken = function(code, callback) {
  var oauth = this;

  request.post({
    'headers': {'content-type': 'application/x-www-form-urlencoded'},
    'url': oauth.options.authorizationURL,
    'form': {
      'consumer_key': oauth.options.consumerKey,
      'code': code
    }
  }, function(error, response, body) {
    if (error) { return callback(error, null);}
    if (response.statusCode !== 200) {
      var errorCode = response.headers['x-error-code'];
      var errorMsg = response.headers['x-error'];
      error = new Error(errorCode + ': ' + errorMsg);
      return callback(error, null);
    }

    var data = oauth._formDataToJson(body);

    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    callback(null, data.username, data.access_token);
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  });
};

OAuth.prototype.getOAuthRequestToken = function(callback) {
  var oauth = this;

  request.post({
    'headers': {'content-type': 'application/x-www-form-urlencoded'},
    'url': oauth.options.requestTokenURL,
    'form': {
      'consumer_key': oauth.options.consumerKey,
      'redirect_uri': oauth.options.callbackURL
    }
  }, function(error, response, body) {
    if (error) { return callback(error, null);}

    var data = oauth._formDataToJson(body);
    var url  = oauth._formatAuthUrl(data.code, oauth.options.callbackURL);

    callback(null, data.code, url);
  });
};

function Strategy(options, verify) {
  options = options || {};
  options.requestTokenURL = options.requestTokenURL || 'https://getpocket.com/v3/oauth/request';
  options.authorizationURL = options.userAuthorizationURL || 'https://getpocket.com/v3/oauth/authorize';
  options.sessionKey = options.sessionKey || 'oauth:pocket';

  // Api urls
  options.retrive = 'https://getpocket.com/v3/get';

  this._options = options;
  this._verity = verify;
  this._oauth = new OAuth(options);
  this._passReqToCallback = options.passReqToCallback;

  this.name = 'pocket';
}

util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function(req, options) {
  if (req.query && req.query.denied) {
    return this.fail();
  }

  options = options || {};
  if (!req.session) { return this.error(new Error('OAuth authentication requires session support')); }

  var self = this;

  var pocketCode = req.session && req.session.pocketCode;
  if (pocketCode) {
    delete req.session.pocketCode;
    var verified = function(err, user, info) {
      if (err) { return self.error(err); }
      if (!user) { return self.fail(info); }

      self.success(user, info);
    };

    this._oauth.getOAuthAccessToken(pocketCode, function(err, username, accessToken) {
      if (err || !username) { self.error(err); return; }
      var tokenSecret = null;
      var profile = {
        provider: 'pocket',
        username: username
      };
      if (self._passReqToCallback) {
        self._verity(req, accessToken, tokenSecret, profile, verified);
      } else {
        self._verity(accessToken, tokenSecret, profile, verified);
      }
    });
  } else {
    this._oauth.getOAuthRequestToken(function(err, code, authUrl) {
      if (err) { self.error(err);}

      req.session.pocketCode = code;

      self.redirect(authUrl);
    });
  }
};

Strategy.prototype.getUnreadItems = function(accessToken, callback) {
  var strategy = this;
  request.post({
    'headers': {'content-type': 'application/x-www-form-urlencoded'},
    'url': strategy._options.retrive,
    'form': {
      'consumer_key': strategy._options.consumerKey,
      'access_token': accessToken,
      'state': 'unread'
    }
  }, function(error, response, body) {
    try {
      var data;
      if (body) {
        data = JSON.parse(body);
      }
      callback(error, data);
    } catch (e) {
      e.cause = error;
      callback(e);
    }

  });
};

// http://getpocket.com/developer/docs/v3/modify
Strategy.prototype.modify = function(actions, accessToken, callback) {
  var strategy = this;

  request({
    method: 'POST',

    // querystring is used because when using 'form',
    // 'actions' are encoded incorrectly
    url: 'https://getpocket.com/v3/send?actions=' + encodeURIComponent(JSON.stringify(actions)) +
    '&access_token=' + accessToken + '&consumer_key=' + strategy._options.consumerKey
  }, function(error, response, body) {
    try {
      var data;
      if (body) {
        data = JSON.parse(body);
      }
      callback(error, data);
    } catch (e) {
      e.cause = error;
      callback(e);
    }
  });
};

/**
 * loopback-comporntnt-passport が Strategy オブジェクトを必須のため、
 * passport-pocketをラップする
 */
module.exports = {
  Strategy: Strategy
};
