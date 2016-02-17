'use strict';

const request = require('request');

function PocketApi(options) {
  this.options = options;
  options.add = options.add || 'https://getpocket.com/v3/add';
  options.retrive = options.retrive || 'https://getpocket.com/v3/get';
  options.modify = options.modify || 'https://getpocket.com/v3/send';
}

PocketApi.prototype._addKeys = function(query) {
  const options = this.options;
  query = query || {};
  query['consumer_key'] = options.consumerKey;
  query['access_token'] = options.accessToken;
  return query;
};

/**
 * get items
 *
 * See: https://getpocket.com/developer/docs/v3/retrieve
 */
PocketApi.prototype.get = function(query, callback) {
  const options = this.options;
  query = this._addKeys(query);
  const reqOptions = {
    url: options.retrive,
    body: JSON.stringify(query)
  };
  return requestPromise(reqOptions, callback);
};

/**
 * add items
 *
 * See: https://getpocket.com/developer/docs/v3/add
 */
PocketApi.prototype.add = function(query, callback) {
  const options = this.options;
  query = this._addKeys(query);
  if (Array.isArray(query.tags)) {
    query.tags = query.tags.join(',');
  }
  const reqOptions = {
    url: options.add,
    body: JSON.stringify(query)
  };
  return requestPromise(reqOptions, callback);
};

/**
 * modify item
 *
 * See: http://getpocket.com/developer/docs/v3/modify
 */
PocketApi.prototype.modify = function(actions, callback) {
  const options = this.options;
  actions = this._addKeys(actions);
  const reqOptions = {
    url: options.modify,
    body: JSON.stringify(actions)
  };
  return requestPromise(reqOptions, callback);
};

function requestPromise(reqOptions, callback) {
  reqOptions.method = reqOptions.method || 'post';
  reqOptions.headers = reqOptions.headers || {'content-type': 'application/json'};

  const Promise = PocketApi.Promise;
  return new Promise(function(resolve, reject) {
    function cb(err, data) {
      if (typeof callback === 'function') {
        callback(err, data);
      }
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    }
    request(reqOptions, function(error, response, body) {
      if (error) { return cb(error); }
      if (response.statusCode !== 200) {
        const errMsg = response.headers['x-error'];
        const errCode = response.headers['x-error-code'];
        const err = new Error(response.headers.status + ' - ' + errCode + ': ' + errMsg);
        err.keyLimit = response.headers['x-limit-key-limit'];
        err.keyRemaining = response.headers['x-limit-key-remaining'];
        err.keyReset = response.headers['x-limit-key-reset'];
        err.userLimit = response.headers['x-limit-user-limit'];
        err.userRemaining = response.headers['x-limit-user-remaining'];
        err.userReset = response.headers['x-limit-user-reset'];
        return cb(err);
      }
      try {
        let data;
        if (body) {
          data = JSON.parse(body);
        }
        cb(error, data);
      } catch (e) {
        e.cause = error;
        cb(e);
      }
    });
  });
}

PocketApi.Promise = Promise;
module.exports = PocketApi;
