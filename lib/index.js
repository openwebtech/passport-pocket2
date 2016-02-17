/**
 * Module dependencies.
 */
var Strategy = require('./strategy');
var Api = require('./pocket-api');

/**
 * Expose `Strategy` directly from package.
 */
exports = module.exports = Strategy;

/**
 * Export constructors.
 */
exports.Strategy = Strategy;

exports.Api = Api;
