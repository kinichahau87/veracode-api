'use strict';

module.exports = function NoEnvError() {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = 'credentials/keys not found in environment. Add your keys to path.';
	this.extra = 1092;
};

require('util').inherits(module.exports, Error);