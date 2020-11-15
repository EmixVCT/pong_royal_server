const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./index.js");

const app = express();
app.use(index);
// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', `http://localhost:${port}`);
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

const server = http.createServer(app);

const io = socketIo(server); // < Interesting!

let interval;
let nbPlayerMax = 10;
let PlayerPositions = new Array(nbPlayerMax);

for (let i =0;i< nbPlayerMax;i++){
  PlayerPositions[i] = 0;
}

let WaitingId = [];
let games = {};
let gameId = 0;

io.on("connection", (socket) => {
  console.log("New client connected");
  WaitingId.push(socket.id);
  socket.join(socket.id);
  socket.emit('waiting player',{n:WaitingId.length});
  
  console.log(WaitingId);

  if(WaitingId.length == 3){
    //start game
    let pos = new Array(WaitingId.length);
    for (let i =0;i< WaitingId.length;i++){pos[i] = 0;}

    games[gameId] = {player:WaitingId,position:pos};
    for (let i =0;i<WaitingId.length;i++){
      io.to(WaitingId[i]).emit("start game",{id:gameId,position:pos,numPlayer:i});
    }
    WaitingId = [];
    gameId++;
  }
  
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => getApiAndEmit(socket), 1000);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    WaitingId = WaitingId.filter(function(value, index, arr){ return value != socket.id;});
    console.log(WaitingId);
    clearInterval(interval);
    socket.emit('waiting player',{n:WaitingId.length});
  });


  socket.on("MovePlayer", (data) => {
    //console.log("move skt id:"+socket.id);
    if (data && data.player >= 0 && data.move && data.gameId){
      games[data.gameId].position[data.player] += data.move;
      for (let i =0;i<games[data.gameId].player.length;i++){
        io.to(games[data.gameId].player[i]).emit("position change", {pos:games[data.gameId].position});
      }
    }else{
      console.log("MovePlayer data empty");
    }
  });


});

const getApiAndEmit = socket => {
  const response = new Date();
  // Emitting a new message. Will be consumed by the client
  socket.emit("FromAPI", response);
};

server.listen(port, () => console.log(`Listening on port ${port}`));
