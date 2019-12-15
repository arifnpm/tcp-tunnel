const net = require('net');

var SERVER_HOST = 'changeme.tld';
var FWD_HOST = '127.0.0.1'; // Change this to your local server hostname/ip
var REMOTE_PORT = 6996;
var TUNNEL_PORT = 6969; // might be auto assigned from server
var WORKER_PORT = 6968; // might be auto assigned from server
var FWD_PORT = 8080; // Change this to your local server port

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

let printHelp = false;
for(let i=0;i<process.argv.length;i++) {
	let curArgv = process.argv[i];
	if(curArgv.indexOf("-fp")===0) {
		FWD_PORT = +(curArgv.split("=")[1]);
	}
	if(process.argv[i].indexOf("-fh")===0) {
		FWD_HOST = curArgv.split("=")[1];
	}
	if(
		process.argv[i].indexOf("-h")===0 || process.argv[i].indexOf("-help")===0 || 
		process.argv[i].indexOf("-h")===0 || process.argv[i].indexOf("--help")===0 || 
		process.argv[i].indexOf("/?")===0) {
		printHelp = true;
	}
}

if(printHelp) {
	// print instruction
	console.log("TCP Tunnel Client");
	console.log("Tunnel local webserver to a remote server");
	console.log("");
	console.log("node ./index.js -fh=localhost -fp=8080");
	console.log("");
	console.log("-fh \t Specify local webserver hostname to be redirected (default to 127.0.0.1)");
	console.log("-fp \t Specify local webserver port (default to 8080)");
	return;
}

let remoteSocket = new net.Socket();
remoteSocket.connect(REMOTE_PORT, SERVER_HOST, function () {
	console.log('REMOTE CLIENT CONNECTED TO: ' + SERVER_HOST + ':' + REMOTE_PORT);
	remoteSocket.write("_START_SERVER_"); // Auto start server
});

remoteSocket.on('data', function (data) {
	if(data.indexOf("_SERVER_STARTED_")===0) {
		let content = data.slice("_SERVER_STARTED_".length + 1, data.indexOf(";;")) + "";
		let arrContent = content.split(";");
		let tunnelHost = arrContent[0];
		let tunnelPort = arrContent[1];
		let workerHost = arrContent[2];
		let workerPort = arrContent[3];
		let incomingHost = arrContent[4];
		let incomingPort = arrContent[5];
		console.log('--Auto assigned from server--');
		console.log('tunnelHost:', tunnelHost);
		console.log('tunnelPort:', tunnelPort);
		console.log('workerHost:', workerHost);
		console.log('workerPort:', workerPort);
		console.log('incomingHost:', incomingHost);
		console.log('incomingPort:', incomingPort);
		TUNNEL_PORT = tunnelPort;
		WORKER_PORT = workerPort;
		setupClient();
	}
	client.destroy();
});

// no end from browser
remoteSocket.on('end', function (data) {
	console.log('REMOTE DATA END: ' + data);
});

// Add a 'close' event handler for the client socket
remoteSocket.on('close', function () {
	console.log('REMOTE CLIENT CLOSED');
});