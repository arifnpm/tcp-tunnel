# tcp-tunnel
Tunnel intended for tunneling local server limited with dynamic ip and blocked inward port to a server with static ip and open ports.

## instruction server-side
- Install nodejs v10+ and npm to your server
- Upload the server folder to your server
- Do "npm install" inside the server folder
- Modify the ports and host in index.js
- Start the server using "node ./index.js" or use pm2

## instruction client-side
- Install nodejs v10+ and npm to your client side pc
- Do "npm install" inside the client folder
- Modify the ports and hosts in index.js
- Start the client side using "node ./index.js"
