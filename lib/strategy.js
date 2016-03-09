'use strict';

const passport = require('passport-strategy');
const util = require('util');
const OAuth = require('./oauth');
const PocketApi = require('./pocket-api');

function Strategy(options, verify) {
  options = options || {};
  options.requestTokenURL = options.requestTokenURL || 'https://getpocket.com/v3/oauth/request';
  options.authorizationURL = options.userAuthorizationURL || 'https://getpocket.com/v3/oauth/authorize';
  options.sessionKey = options.sessionKey || 'oauth:pocket';

  passport.Strategy.call(this);
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
        id: username,
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

Strategy.prototype.getApi = function(credentials) {
  return new PocketApi({
    consumerKey: this._options.consumerKey,
    accessToken: credentials.token
  });
};

module.exports = Strategy;
