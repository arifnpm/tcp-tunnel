const net = require('net');
const uuidv4 = require("uuid/v4");

var HOST = '0.0.0.0';
var PORT = 6969;
var WORKER_PORT = 6968;
var INCOMING_PORT = 6970
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
}).listen(PORT, HOST);
console.log('Tunnel Server listening on ' + HOST + ':' + PORT);

net.createServer(function (sock) {
	console.log('CONNECTED WORKER: ' + sock.remoteAddress + ':' + sock.remotePort);
	let socketId = null;
	//let dataBuffer = Buffer.alloc(0);
	sock.on('data', function (data) {
		//console.log('worker data ', data);
		if(data.indexOf('_INCOMING_ID_')===0) {
			socketId = data + '';
			console.log('worker data received', socketId);
		} else {
			console.log('worker data received', socketId);
			if(socketId === null) return;
			incomingSock[socketId].write(data);
		}
		/*let dataPart = null;
		if(data.indexOf('_INCOMING_ID_')===0) {
			socketId = data.slice(0, data.indexOf('::')) + '';
			console.log('tunnel socketId', socketId);
			dataBuffer = Buffer.alloc(0);
			dataPart = data.slice(data.indexOf('::')+2);
		}else{
			dataPart = data;
		}
		if(dataPart.lastIndexOf('::' + socketId)<0) {
			dataBuffer = Buffer.concat(
				[
					dataBuffer, 
					dataPart
				]
			)
		}else{
			dataBuffer = Buffer.concat(
				[
					dataBuffer, 
					dataPart.slice(0, dataPart.lastIndexOf('::' + socketId))
				]
			)
		}
		console.log(dataPart.lastIndexOf('::' + socketId));
		if(incomingSock[socketId] !== undefined && dataPart.lastIndexOf('::' + socketId)>=0) {
			console.log(socketId);
			console.log("writing to incoming");
			incomingSock[socketId].write(dataBuffer);
		}*/
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
}).listen(WORKER_PORT, HOST);
console.log('Worker Server listening on ' + HOST + ':' + WORKER_PORT);

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
		/*if(tunnelSock !== null) {
			tunnelSock.end(
				data
			);
		}*/
	});
	sock.on('close', function (data) {
		delete incomingSock[socketId];
		console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
	});
	sock.on('error', function (err) {
		console.log('Error: ', err);
	});
}).listen(INCOMING_PORT, HOST);
console.log('Incoming Server listening on ' + HOST + ':' + INCOMING_PORT);
