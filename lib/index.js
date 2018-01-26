var __request = require('request');
var __xmlParser = require('xml-parse');
var __fs = require('fs');
var __promise = require('promise');
var NoEnvError = require('./errors/no-env-error');
var NoModuleError = require('./errors/no-module-error');
var ScanError = require('./errors/scan-error');
var __colors = require('colors/safe');


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
		console.log(__colors.gray(getLogTimestamp()) + __colors.magenta(' INFO: ' + aMessage));
	}

	function logOK(aMessage) {
		console.log(__colors.gray(getLogTimestamp()) + __colors.green(' OK: ' + aMessage));
	}

	function logError(aMessage) {
		console.log(__colors.gray(getLogTimestamp()) + __colors.red(' ERROR: ' + aMessage));
	}

	function lookForErrors(chunk) {
		let buf = Buffer.from(chunk);
		let parsedXml = __xmlParser.parse(buf.toString());
		for (var key in parsedXml) {
			if (parsedXml.hasOwnProperty(key)) {
				if (parsedXml[key].tagName == 'error') {
					logError(parsedXml[key].innerXML);
					return true;
				}
			}
		} //end of for
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
						throw new ScanError();
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
				process.exit(1);
			}
		}

		if (isDir) {
			let files = __fs.readdirSync(aPath);
			for (var key in files){
				if (files.hasOwnProperty(key)){
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
			logInfo('Getting app list');
			logInfo('Looking for app name: ' + aName);
			__request
				.get(api_prefix + api_action_list)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('response', function(response) {
					response.on('data', (chunk) => {
						resolve(chunk);
					});
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
			let buf = Buffer.from(results);
			logInfo(buf.toString());
			parseModuleList(aId, results);
		}).catch(err => {
			logError(err);
		});
	}


	function lookupModules(aId) {
		return new __promise(function(resolve, reject) {
			logInfo('lookup modules');
			__request
				.get(api_prefix + api_action_prescan + '?app_id=' + aId)
				.auth(process.env.VERACODEUSER, process.env.VERACODEPSWD, false)
				.on('response', function(response) {
					response.on('data', (chunk) => {
						resolve(chunk);
					});
				})
				.on('error', function(err) {
					reject(err);
				});
		});
	}

	function parseModuleList(aId, chunk) {
		let buf = Buffer.from(chunk);
		let modulesFound = [];
		let parsedXml = __xmlParser.parse(buf.toString());
		for (var key in parsedXml) {
			if (parsedXml.hasOwnProperty(key)) {
				if (parsedXml[key].tagName == 'prescanresults') {
					let parsedModuleList = __xmlParser.parse(parsedXml[key].innerXML);
					for (var innerKey in parsedModuleList) {
						if (parsedModuleList.hasOwnProperty(innerKey)) {
							if (parsedModuleList[innerKey].tagName == 'module') {
								modulesFound.push(parsedModuleList[innerKey].attributes.id);
							}
						}
					} //end of for
				}
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

	function parseAppListResult(chunk, aName) {
		let buf = Buffer.from(chunk);
		let parsedXml = __xmlParser.parse(buf.toString());
		let lAppId;
		for (var key in parsedXml) {
			if (parsedXml.hasOwnProperty(key)) {
				if (parsedXml[key].tagName == 'applist') {
					let parsedXmlList = __xmlParser.parse(parsedXml[key].innerXML);
					for (var innerKey in parsedXmlList) {
						if (parsedXmlList.hasOwnProperty(innerKey)) {
							if (parsedXmlList[innerKey].tagName == 'app') {
								if (parsedXmlList[innerKey].attributes.app_name.indexOf(aName) != -1) {
									logOK('Found app_id:' + parsedXmlList[innerKey].attributes.app_id);
									lAppId = parsedXmlList[innerKey].attributes.app_id;
									break;
								} //end of if
							} //end of if
						} //end of if
					} //end of for
				} //end of if
			} //end of if
		} //end of for

		if (lPreScan) {
			uploadAppFile(lAppId, lZipFile);
		} else {
			findModules(lAppId);
		}

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
