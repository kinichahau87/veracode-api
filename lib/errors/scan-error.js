'use strict';

module.exports = function ScanError() {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = 'Scan failed. See output for details.';
	this.extra = 1094;
};

require('util').inherits(module.exports, Error);