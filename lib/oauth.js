'use strict';

var request = require('request');

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

module.exports = OAuth;
