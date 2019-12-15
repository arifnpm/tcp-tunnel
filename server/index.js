const net = require('net');
const uuidv4 = require("uuid/v4");

var REMOTE_HOST = '0.0.0.0';
var REMOTE_PORT = 6996;

function startServer(config) {
	var tunnelSock = null;
	var incomingSock = {};

	net.createServer(function (sock) {
		tunnelSock = sock;
		console.log('CONNECTED TUNNEL: ' + sock.remoteAddress + ':' + sock.remotePort);
		sock.on('data', function (data) {
			console.log('tunnel data ', data);
		});
		sock.on('end', function (data) {
			console.log('tunnel data end ', data);
		});
		sock.on('close', function (data) {
			console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
		});
		sock.on('error', function (err) {
			console.log('Error: ', err);
		});
	}).listen(config.tunnelPort, config.tunnelHost);
	console.log('Tunnel Server listening on ' + config.tunnelHost + ':' + config.tunnelPort);
	
	net.createServer(function (sock) {
		console.log('CONNECTED WORKER: ' + sock.remoteAddress + ':' + sock.remotePort);
		let socketId = null;
		sock.on('data', function (data) {
			if(data.indexOf('_INCOMING_ID_')===0) {
				socketId = data + '';
				console.log('worker data received', socketId);
			} else {
				console.log('worker data received', socketId);
				if(socketId === null) return;
				incomingSock[socketId].write(data);
			}
		});
		sock.on('end', function (data) {
			console.log('worker data end ', data);
		});
		sock.on('close', function (data) {
			console.log('CLOSED WORKER: ' + sock.remoteAddress + ' ' + sock.remotePort);
		});
		sock.on('error', function (err) {
			console.log('Error WORKER: ', err);
		});
	}).listen(config.workerPort, config.workerHost);
	console.log('Worker Server listening on ' + config.workerHost + ':' + config.workerPort);
	
	net.createServer(function (sock) {
		// multiple clients
		console.log('CONNECTED INCOMING: ' + sock.remoteAddress + ':' + sock.remotePort);
		var socketId = '_INCOMING_ID_' + uuidv4();
		console.log('incoming socketId', socketId);
		incomingSock[socketId] = sock;
	
		let dataBuffer = Buffer.alloc(0);
		sock.on('data', function (data) {
			console.log(socketId + ' DATA: ' + data);
			dataBuffer = Buffer.concat(
				[
					dataBuffer, 
					data
				]
			)
			if(tunnelSock !== null && data.indexOf("\r\n\r\n")>=0) {
				console.log('writing to tunnel');
				tunnelSock.write(
					Buffer.concat(
						[
							Buffer.from(socketId + '::'), 
							dataBuffer,
							Buffer.from('::_INCOMING_END_'), 
						]
					)
				);
				dataBuffer = Buffer.alloc(0);
			}
		});
	
		// will not expecting end from browser
		sock.on('end', function (data) {
			console.log(socketId + ' DATA END: ' + data);
		});
		sock.on('close', function (data) {
			delete incomingSock[socketId];
			console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
		});
		sock.on('error', function (err) {
			console.log('Error: ', err);
		});
	}).listen(config.incomingPort, config.incomingHost);
	console.log('Incoming Server listening on ' + config.incomingHost + ':' + config.incomingPort);	
}

net.createServer(function (sock) {
	console.log('CONNECTED REMOTE CLIENT: ' + sock.remoteAddress + ':' + sock.remotePort);
	sock.on('data', function (data) {
		console.log('remote data ', data);
		// detect creation
		if(data.indexOf("_START_SERVER_")===0) {
			let content = data.slice("_START_SERVER_".length, data.indexOf(";;")) + "";
			let arrContent = content.split(";");
			let tunnelHost = arrContent[0];
			let tunnelPort = arrContent[1];
			let workerHost = arrContent[2];
			let workerPort = arrContent[3];
			let incomingHost = arrContent[4];
			let incomingPort = arrContent[5];
			startServer({
				tunnelHost,
				tunnelPort,
				workerHost,
				workerPort,
				incomingHost,
				incomingPort
			})
		}
	});
	sock.on('end', function (data) {
		console.log('remote data end ', data);
	});
	sock.on('close', function (data) {
		console.log('CLOSED REMOTE CLIENT: ' + sock.remoteAddress + ' ' + sock.remotePort);
	});
	sock.on('error', function (err) {
		console.log('Error remote server: ', err);
	});
}).listen(REMOTE_PORT, REMOTE_HOST);
console.log('Remote Server listening on ' + REMOTE_HOST + ':' + REMOTE_PORT);
