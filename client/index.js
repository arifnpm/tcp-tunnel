const net = require('net');

var HOST = 'server3.imorum.com';
var FWD_HOST = '127.0.0.1';
var PORT = 6969;
var WORKER_PORT = 6968;
var FWD_PORT = 3019;

var client = new net.Socket();
let dataBufferClient = Buffer.alloc(0);
client.connect(PORT, HOST, function () {
	console.log('CONNECTED TO: ' + HOST + ':' + PORT);
	dataBufferClient = Buffer.alloc(0);
});

function processData(dataInput) {
	// Close the client socket completely
	//client.destroy();
	let socketId = dataInput.slice(0, dataInput.indexOf('::')) + '';
	console.log(socketId + "");

	let dataPart = dataInput.slice(dataInput.indexOf('::')+2);
	console.log("dataPart: " + dataPart + "");

	let clientWorker = new net.Socket();
	clientWorker.connect(WORKER_PORT, HOST, function () {
		console.log('WORKER CONNECTED TO: ' + HOST + ':' + WORKER_PORT);
		clientWorker.write(socketId);

		//let dataBuffer = Buffer.alloc(0);
		//let contentLength = 0;
		let forwardedClient = new net.Socket();
		forwardedClient.connect(FWD_PORT, FWD_HOST, function () {
			console.log('CONNECTED TO: ' + FWD_HOST + ':' + FWD_PORT);
			dataBuffer = Buffer.alloc(0);
			forwardedClient.write(dataPart);
		});
		//let totalContentLength = 0;
		forwardedClient.on('data', function (fwdData) {
			console.log("fwd got data ");
			clientWorker.write(fwdData);
			/*if(fwdData.indexOf("HTTP/1.1 200 OK")===0) {
				dataBuffer = Buffer.concat(
					[
						dataBuffer, 
						fwdData
					]
				)
				let contentLengthStartIdx = fwdData.indexOf("Content-Length: ") + "Content-Length: ".length;
				contentLength = fwdData.slice(contentLengthStartIdx, fwdData.indexOf("\n", contentLengthStartIdx)) + "";
				console.log("contentLength: ", contentLength);
				let startContentIdx = fwdData.indexOf("\r\n\r\n") + 4;
				totalContentLength = (fwdData.length - startContentIdx);
				console.log("totalContentLength", totalContentLength);
			}else{
				dataBuffer = Buffer.concat(
					[
						dataBuffer, 
						fwdData
					]
				)
				totalContentLength += fwdData.length;
				console.log("totalContentLength", totalContentLength);
			}
			while(dataBuffer.length > 0 && totalContentLength >= contentLength) {
				if(dataBuffer.indexOf("HTTP/1.1 200 OK")===0) {
					console.log("Got http OK");
					let contentLengthStartIdx = dataBuffer.indexOf("Content-Length: ") + "Content-Length: ".length;
					contentLength = dataBuffer.slice(contentLengthStartIdx, dataBuffer.indexOf("\n", contentLengthStartIdx)) + "";
					console.log("contentLength: ", contentLength);
					let startContentIdx = dataBuffer.indexOf("\r\n\r\n") + 4;
					totalContentLength = (dataBuffer.length - startContentIdx);
					console.log("totalContentLength", totalContentLength);
				}
				let curData = dataBuffer.slice(0, contentLength);
				console.log("writing data ");
				clientWorker.write(curData);
				dataBuffer = dataBuffer.slice(contentLength);
			}
			console.log("Rest data: " + dataBuffer);*/
		});
		forwardedClient.on('end', function (fwdData) {
			console.log("end " + fwdData);
			/*client.end(Buffer.concat(
				[Buffer.from(socketId + '::'), 
				fwdData]
			));*/
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
	//console.log('DATA: ' + data);
	console.log('DATA RECEIVED');
	dataBufferClient = Buffer.concat(
		[
			dataBufferClient, 
			data
		]
	)
	while(dataBufferClient.length > 0 && dataBufferClient.indexOf('_INCOMING_ID_')===0 && dataBufferClient.indexOf('::_INCOMING_END_')>=0) {
		//let socketId = dataBufferClient.slice(0, dataBufferClient.indexOf('::')) + '';
		//console.log(socketId + "");
		//dataBufferClient = dataBufferClient.slice(dataBufferClient.indexOf('::') + 2);
		let endIndex = dataBufferClient.indexOf('::_INCOMING_END_');
		let curData = dataBufferClient.slice(0, endIndex);
		/*let allPart = Buffer.concat([curData]);
		while(allPart.length>0) {
			let partData = allPart.slice(0, allPart.indexOf("\r\n\r\n")+4);
			console.log("PART DATA ========================= "+partData);
			processData(socketId + '::' + partData);
			allPart = allPart.slice(allPart.indexOf("\r\n\r\n")+4);
		}*/
		processData(curData);
		dataBufferClient = dataBufferClient.slice(endIndex + '::_INCOMING_END_'.length);
	}
});

// no end from browser
client.on('end', function (data) {
	console.log('DATA END: ' + data);
});

// Add a 'close' event handler for the client socket
client.on('close', function () {
	console.log('Tunnel Client:: Connection closed');
});