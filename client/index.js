const net = require('net');

var SERVER_HOST = 'changeme.tld';
var FWD_HOST = '127.0.0.1';
var TUNNEL_PORT = 6969;
var WORKER_PORT = 6968;
var FWD_PORT = 3019;

let client = null;
let dataBufferClient = Buffer.alloc(0);
function setupClient() {
	client = new net.Socket();
	dataBufferClient = Buffer.alloc(0);
	client.connect(TUNNEL_PORT, SERVER_HOST, function () {
		console.log('TUNNEL CLIENT CONNECTED TO: ' + SERVER_HOST + ':' + TUNNEL_PORT);
		dataBufferClient = Buffer.alloc(0);
	});
	
	function processData(dataInput) {
		let socketId = dataInput.slice(0, dataInput.indexOf('::')) + '';
		console.log(socketId + "");
	
		let dataPart = dataInput.slice(dataInput.indexOf('::')+2);
		console.log("dataPart: " + dataPart + "");
	
		let clientWorker = new net.Socket();
		clientWorker.connect(WORKER_PORT, SERVER_HOST, function () {
			console.log('WORKER CONNECTED TO: ' + SERVER_HOST + ':' + WORKER_PORT);
			clientWorker.write(socketId);
	
			let forwardedClient = new net.Socket();
			forwardedClient.connect(FWD_PORT, FWD_HOST, function () {
				console.log('CONNECTED TO: ' + FWD_HOST + ':' + FWD_PORT);
				dataBuffer = Buffer.alloc(0);
				forwardedClient.write(dataPart);
			});
			forwardedClient.on('data', function (fwdData) {
				console.log("fwd got data ");
				clientWorker.write(fwdData);
			});
			forwardedClient.on('end', function (fwdData) {
				console.log("end " + fwdData);
			});
			forwardedClient.on('close', function () {
				console.log('Forwarded Client:: Connection closed');
			});
		});
	
		// no end from browser
		clientWorker.on('end', function (data) {
			console.log('WORKER DATA END: ' + data);
		});
	
		// Add a 'close' event handler for the client socket
		clientWorker.on('close', function () {
			console.log('WORKER Client:: Connection closed');
		});
	}
	
	client.on('data', function (data) {
		console.log('DATA RECEIVED');
		dataBufferClient = Buffer.concat(
			[
				dataBufferClient, 
				data
			]
		)
		while(dataBufferClient.length > 0 && dataBufferClient.indexOf('_INCOMING_ID_')===0 && dataBufferClient.indexOf('::_INCOMING_END_')>=0) {
			let endIndex = dataBufferClient.indexOf('::_INCOMING_END_');
			let curData = dataBufferClient.slice(0, endIndex);
			processData(curData);
			dataBufferClient = dataBufferClient.slice(endIndex + '::_INCOMING_END_'.length);
		}
	});
	
	// no end from browser
	client.on('end', function (data) {
		console.log('DATA END: ' + data);
	});

	client.on('timeout', function () {
		console.log('TUNNEL CLIENT TIMEOUT');
		client.destroy();
		client = null;
		setTimeout(setupClient, 0);
	});
	
	// Add a 'close' event handler for the client socket
	client.on('close', function () {
		console.log('TUNNEL CLIENT CLOSED');
	});
}

setupClient();