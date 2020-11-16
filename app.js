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
let cooldown = 20;
let nbPlayerMax = 10;
let PlayerPositions = new Array(nbPlayerMax);

for (let i =0;i< nbPlayerMax;i++){
  PlayerPositions[i] = 0;
}

let WaitingId = [];
let games = {};
let gameId = 1;

io.on("connection", (socket) => {


  console.log("New client connected "+ socket.id);
  socket.join(socket.id);
  socket.emit('waiting player',{n:WaitingId.length});

  socket.on("player ready", (data) => {
    console.log("player ready");
    if (data && data.pseudo){
      console.log(data.pseudo + " is ready");
    }else{
      console.log("Anonymous is ready");
    }
    WaitingId.push(socket.id);
    io.emit('waiting player',{n:WaitingId.length});
    console.log(WaitingId);

    if(WaitingId.length == 10){
      //start game
      startGame();
    }else if(WaitingId.length >= 3){
      console.log("set Timeout 20s");
      cooldown = 10;
      if(!interval){
        interval = setInterval(() => getApiAndEmit(socket), 1000);
      }else{
        console.log("deja un interval");
      }
    }
  });

  

  
  
  

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    WaitingId = WaitingId.filter(function(value, index, arr){ return value != socket.id;});
    console.log(WaitingId);
    clearInterval(interval);
    interval = undefined;
    socket.emit('waiting player',{n:WaitingId.length});
  });


  socket.on("MovePlayer", (data) => {
    //console.log("move skt id:"+socket.id);
    if (data && data.player >= 0 && data.move && data.gameId && games[data.gameId] &&
      games[data.gameId].position[data.player]+data.move*games[data.gameId].SpeedPlayer <= games[data.gameId].limitMax &&
      games[data.gameId].position[data.player]+data.move*games[data.gameId].SpeedPlayer >= games[data.gameId].limitMin){

      games[data.gameId].position[data.player] += data.move*games[data.gameId].SpeedPlayer;
      /*
      for (let i =0;i<games[data.gameId].player.length;i++){
        io.to(games[data.gameId].player[i]).volatile.emit("position change", {pos:games[data.gameId].position});
      }*/
    }
  });


});

const update = () => {
  let gameEnd = true;
  let socketList = io.sockets.adapter.rooms;
  let todelete = [];

  for (const game in games) {
    gameEnd = true;
    for (let i=0 ;i< games[game].player.length;i++){
      if(socketList.has(games[game].player[i])){
        gameEnd = false;

        io.to(games[game].player[i]).volatile.emit('Update game', {ballePosition:[{x:0,y:50},{x:0,y:-32},{x:43,y:0}],pos:games[game].position});
      }
    }
    if(gameEnd){
      todelete.push(game);
    }
  }

  for (let i = 0 ; i<todelete.length;i++){
    delete games[todelete[i]];
  }
  //io.volatile.emit('players list', Object.values(players));
}

setInterval(update, 1000/24); // 1000/60 = 60FPS


const getApiAndEmit = socket => {
  cooldown--;
  if(cooldown == 0){clearInterval(interval);interval = undefined;startGame();cooldown = 20;}
  io.emit("FromAPI", cooldown);
};



const startGame = socket => {
  clearInterval(interval);
  interval = undefined;

  //clear waiting list
  let nbPlayer = WaitingId.length;
  let players = WaitingId;
  WaitingId = [];

  //Generate position player
  let pos = new Array(nbPlayer);
  for (let i =0;i< nbPlayer;i++){pos[i] = 0;}

  //Generate property of board
  let r = 400;
  x = new Array(nbPlayer);
  y = new Array(nbPlayer);
  for(let i=0; i<nbPlayer;i++){
    x[i] = r * Math.cos(2*Math.PI*(i+1)/nbPlayer)
    y[i] = r * Math.sin(2*Math.PI*(i+1)/nbPlayer)
  }
  let widthSide = Math.sqrt(Math.pow(x[1]-x[0],2)+Math.pow(y[1]-y[0],2));
  let barWidth = widthSide/8;
  let SpeedPlayer = widthSide/30;

  let limitMax = widthSide/2;
  let limitMin = -widthSide/2+barWidth;

  games[gameId] = {player:players,
    position:pos,
    x:x,
    y:y,
    limitMax:limitMax,
    limitMin:limitMin,
    SpeedPlayer:SpeedPlayer,
    barWidth:barWidth
  };

  for (let i =0;i<nbPlayer;i++){
    io.to(players[i]).emit("start game",{
      id:gameId,
      position:pos,
      numPlayer:i,
      x:x,
      y:y,
      barWidth:barWidth,
    });
  }
  gameId++;
}

server.listen(port, () => console.log(`Listening on port ${port}`));
