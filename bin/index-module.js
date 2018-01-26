#!/usr/bin/env node

var veracode = require('../lib/index.js');

if (process.argv.length == 0) {
	console.log(`usage: \\path\\to\\zip app_name scantype:[prescan,scan]`);
	process.exit(1);
} else {
	veracode.veracode_api(process.argv[2], process.argv[3], process.argv[4]);
}
