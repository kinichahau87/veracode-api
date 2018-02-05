var __request = require('request');

var __fs = require('fs');
var __promise = require('promise');
var NoEnvError = require('./errors/no-env-error');
var NoModuleError = require('./errors/no-module-error');
var ScanError = require('./errors/scan-error');
var __colors = require('colors/safe');
var __xmlParser = require('xml2js').parseString;
var __debug = require('debug')('main');


var veracode_api_func = function(aPathToZip, aAppName, aAction) {
	const api_prefix = 'https://analysiscenter.veracode.com/api/5.0/';
	const api_action_upload = 'uploadfile.do';
	const api_action_list = 'getapplist.do';
	const api_action_scan = 'beginscan.do';
	const api_action_prescando = 'beginprescan.do';
	const api_action_prescan = 'getprescanresults.do';
	var lZipFile = aPathToZip;
	var lAppName = aAppName;
	var lPreScan = aAction == 'prescan' ? true : false;

	function getLogTimestamp() {
		let now = new Date();
		return '[' + now.toUTCString() + ']';
	}

	function logInfo(aMessage) {
		__debug(__colors.gray(getLogTimestamp()) + __colors.magenta(' INFO: ' + aMessage));
	}

	function logOK(aMessage) {
		__debug(__colors.gray(getLogTimestamp()) + __colors.green(' OK: ' + aMessage));
	}

	function logError(aMessage) {
		__debug(__colors.gray(getLogTimestamp()) + __colors.red(' ERROR: ' + aMessage));
	}

	function parseXML(xmlString) {
		return new __promise(function(resolve, reject) {
			__xmlParser(xmlString, (err, results) => {
				if (err) {
					reject(err);
				}

				resolve(results);
			});
		});
	}

	function lookForErrors(chunk) {
		if (chunk.toString().includes('<error>')) {
			logError(chunk.toString());
			return true;
		}
		return false;
	}

	function startScan(aPayload) {
		return new __promise(function(resolve, reject) {
			logInfo('Sending scan request...');
			__request
				.post(api_prefix + api_action_scan)
				.form(aPayload)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('error', function(err) {
					reject(err);
				})
				.on('data', function(chunk) {
					if (lookForErrors(chunk)) {
						reject(new ScanError());
					}
					resolve('Scan sent');
				});
		});
	}

	function doPreScan(aPayload) {
		return new __promise(function(resolve, reject) {
			logInfo('Sending prescan request...');
			__request
				.post(api_prefix + api_action_prescando)
				.form(aPayload)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('error', function(err) {
					reject(err);
				})
				.on('data', function(chunk) {
					resolve(chunk);
				});
		});
	}

	function sendFileUploadRequest(aId, aPathName) {
		return new __promise(function(resolve, reject) {
			logInfo('Sending upload request...');
			let upFileName = '@' + aPathName;
			let req = __request.post(api_prefix + api_action_upload)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('data', (chunk) => {
					resolve(chunk);
				})
				.on('error', err => {
					reject(err);
				});

			let form = req.form();
			form.append('app_id', aId);
			form.append('file', __fs.createReadStream(aPathName), {
				filename: upFileName,
				contentType: 'text/plain'
			});

		});
	}

	function uploadAppFile(aAppId, aZipPath) {
		let items = readDir(aZipPath);
		for (var i = 0; i < items.length; i++) {
			sendFiles(aAppId, items[i]);
		}
	}

	function sendFiles(aAppId, aZipPath) {
		logInfo('Uploading files ' + aZipPath);
		let scanRequest = sendFileUploadRequest(aAppId, aZipPath);
		scanRequest.then(results => {
			if (!lookForErrors(results)) {
				logOK('Uploaded files');
				prescan(aAppId);
			}
		}).catch(err => {
			logError(err);
		});
	}

	function readDir(aPath) {
		let items = [];
		let isDir = false;

		try {
			__fs.readFileSync(aPath);
		} catch (err) {
			if (typeof err.code !== 'undefined' && err.code == 'EISDIR') {
				isDir = true;
			} else {
				logError(err);
				throw err;
			}
		}

		if (isDir) {
			let files = __fs.readdirSync(aPath);
			for (var key in files) {
				if (files.hasOwnProperty(key)) {
					items.push(aPath + '\\' + files[key]);
				}
			}
		} else {
			items.push(aPath);
		}
		return items;
	}

	function getAppList(aName) {
		return new __promise(function(resolve, reject) {
			var data = '';
			logInfo('Getting app list');
			logInfo('Looking for app name: ' + aName);
			__request
				.get(api_prefix + api_action_list)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('response', function(response) {
					response.on('data', (chunk) => {
						data += chunk;
					});
				})
				.on('end', function(){
					resolve(data);
				})
				.on('error', function(err) {
					reject(err);
				});
		});
	}

	function prescan(aId) {
		let prescanRequest = doPreScan({
			'app_id': aId
		});
		prescanRequest.then(results => {
			if (!lookForErrors(results)) {
				let buf = Buffer.from(results);
				logInfo(buf.toString());
				logOK('Prescan sent successfully');
			}
		}).catch(err => {
			logError(err);
		});
	}

	function findModules(aId) {
		let modulesRequest = lookupModules(aId);
		modulesRequest.then(results => {
			parseModuleList(aId, results);
		}).catch(err => {
			logError(err);
		});
	}


	function lookupModules(aId) {
		return new __promise(function(resolve, reject) {
			var data = '';
			logInfo('lookup modules');
			__request
				.get(api_prefix + api_action_prescan + '?app_id=' + aId)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('response', function(response) {
					response.on('data', (chunk) => {
						data += chunk;
					});
				})
				.on('end', function(){
					resolve(data);
				})
				.on('error', function(err) {
					reject(err);
				});
		});
	}

	function getModuleList(aId, moduleList) {
		let modulesFound = [];
		logInfo('Getting all module ids');
		for (var key in moduleList) {
			if (moduleList.hasOwnProperty(key)) {
				modulesFound.push(moduleList[key].$.id);
			}
		} //end of for

		if (modulesFound.length == 0) {
			throw new NoModuleError();
		}

		logOK('Modules found: ' + modulesFound.join(','));
		//start scan
		let doScan = startScan({
			'app_id': aId,
			'modules': modulesFound.join(',')
		});
		doScan.then(results => {
			logOK(results);
		}).catch(error => {
			logError(error);
		});
	}

	function parseModuleList(aId, chunk) {
		if (!lookForErrors(chunk)) {
			return process.nextTick(() => {
				parseXML(chunk.toString()).then(results => {
					getModuleList(aId, results.prescanresults.module);
				})
					.catch(err => {
						logError(err);
					});
			});
		}
	}


	function findAppList(applist, aName) {
		let lAppId = null;
		for (var key in applist) {
			if (applist.hasOwnProperty(key)) {
				if (applist[key].$.app_name == aName) {
					logOK('Found app_id:' + applist[key].$.app_id);
					lAppId = applist[key].$.app_id;
					break;
				} //end of if
			} //end of if
		} //end of for

		if (lAppId == null) {
			logError(`Appication: ${aName} not found`);
		} else {
			if (lPreScan) {
				uploadAppFile(lAppId, lZipFile);
			} else {
				findModules(lAppId);
			}
		}
	}

	function parseAppListResult(chunk, aName) {
		return process.nextTick(() => {
			parseXML(chunk.toString()).then(results => {
				findAppList(results.applist.app, aName);
			})
				.catch(err => {
					logError(err);
				});
		});
	}

	if (!process.env || typeof process.env.VERACODEUSER === 'undefined' || typeof process.env.VERACODEPSWD === 'undefined') {
		throw new NoEnvError();
	}

	let applistRequest = getAppList(lAppName);
	applistRequest.then(results => {
		parseAppListResult(results, lAppName);
	}).catch(err => {
		logError(err);
	});

};

exports.veracode_api = veracode_api_func;
