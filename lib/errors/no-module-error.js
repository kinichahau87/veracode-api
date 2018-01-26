'use strict';

module.exports = function NoModuleFoundError() {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = 'No modules found for this app. Make sure to upload files to project and run a prescan';
	this.extra = 1093;
};

require('util').inherits(module.exports, Error);