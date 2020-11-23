const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./index.js");

var geometry = require('./geometry');


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

const decelerationRatio = 0.999; // ball decelerate of 1% if no hit
const accelerationRatio = 1.05; // ball decelerate of 1% if no hit
const delta = 1000/40;             // fps


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
      cooldown = 1;
      if(!interval){
        interval = setInterval(() => getApiAndEmit(socket), 1000);
      }else{
        console.log("deja un interval");
      }
    }
  });

  socket.on("generate game", (data) => {
    console.log("game generate");
    WaitingId.push(socket.id);

    startGameExemple();
   
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
      games[data.gameId].position[data.player]+data.move*games[data.gameId].SpeedPlayer <= games[data.gameId].limitMax-games[data.gameId].barWidth/2 &&
      games[data.gameId].position[data.player]+data.move*games[data.gameId].SpeedPlayer >= games[data.gameId].limitMin-games[data.gameId].barWidth/2
      ){

      games[data.gameId].position[data.player] += data.move*games[data.gameId].SpeedPlayer;
      /*
      for (let i =0;i<games[data.gameId].player.length;i++){
        io.to(games[data.gameId].player[i]).volatile.emit("position change", {pos:games[data.gameId].position});
      }*/
    }
  });


});

function multiply(a, b) {

  let aNumRows = a.length, aNumCols = a[0].length,
      bNumRows = b.length, bNumCols = b[0].length,
      m = new Array(aNumRows);  // initialize array of rows

  for (let r = 0; r < aNumRows; ++r) {
    m[r] = new Array(bNumCols); // initialize the current row
    for (let c = 0; c < bNumCols; ++c) {
      m[r][c] = 0;             // initialize the current cell
      for (let i = 0; i < aNumCols; ++i) {
        m[r][c] += a[r][i] * b[i][c];
      }
    }
  }
  return m;
}

function loop(game,iball) {

  let hashit = false;

  games[game].balls[iball].acceleration[0] = games[game].balls[iball].acceleration[0] * decelerationRatio;
  games[game].balls[iball].acceleration[1] = games[game].balls[iball].acceleration[1] * decelerationRatio;

  // Check for hit
  for (let i = 0; i < games[game].arena.length; i++) {

      let x1 = games[game].arena[i][0], y1 = games[game].arena[i][1];
      let x2 = games[game].arena[(i+1)%games[game].position.length][0], y2 = games[game].arena[(i+1)%games[game].position.length][1];
      
      let iPlayer = (i+3)%games[game].position.length;
      /*
      if (games[game].position.length%2){
        iPlayer = (i + (Math.floor(games[game].position.length/2)))%games[game].position.length;
      } //si ipmaire
      else{
        iPlayer = (j + (Math.floor(games[game].position.length/2)))%games[game].position.length;
      } //paire
      */

      if (games[game].balls[iball].lasthit != i && geometry.checkHit2(games[game].balls[iball], games[game].position[iPlayer], games[game].barWidth, [[x1, y1], [x2, y2]]) ) {
          hashit = true;
          games[game].balls[iball].lasthit = i;
          
          let alphaSegment = geometry.getAlpha(x1,x2,y1,y2);

          let xa = games[game].balls[iball].prevpos[0];
          let xb = games[game].balls[iball].pos[0];
          let ya = games[game].balls[iball].prevpos[1];
          let yb = games[game].balls[iball].pos[1];

          let alphaBall = geometry.getAlpha(xa,xb,ya,yb);

          let sommeAngle =(alphaSegment+2)+alphaBall;

          let vect = multiply([[Math.cos(sommeAngle), Math.sin(sommeAngle)], [-Math.sin(sommeAngle), Math.cos(sommeAngle)]], [[games[game].balls[iball].acceleration[0]],[games[game].balls[iball].acceleration[1]]])

          games[game].balls[iball].acceleration[0] = vect[0][0] * accelerationRatio;
          games[game].balls[iball].acceleration[1] = vect[1][0] * accelerationRatio;
     }
  }

  if (!hashit){
    if (!geometry.isInside2(games[game].balls[iball].pos, games[game].arena)) {
      return geometry.getLooser(games[game].balls[iball], games[game].arena);
    }
  }
  

  games[game].balls[iball].prevpos[0] = games[game].balls[iball].pos[0];
  games[game].balls[iball].prevpos[1] = games[game].balls[iball].pos[1];
  //console.log(games[game].balls[iball]);
  games[game].balls[iball].pos[0] += games[game].balls[iball].acceleration[0] * (delta/100);
  games[game].balls[iball].pos[1] += games[game].balls[iball].acceleration[1] * (delta/100);
  //console.log(games[game].balls[iball]);

  
  
}


const update = () => {
  let gameEnd = true;
  let socketList = io.sockets.adapter.rooms;
  let todelete = [];
  let b,i;
  for (const game in games) {
    gameEnd = true;
    for (i=0 ;i< games[game].player.length;i++){
      if(socketList.has(games[game].player[i])){
        gameEnd = false;

        for( b=0;b<games[game].balls.length;b++){
          loop(game,b);
        }

        io.to(games[game].player[i]).volatile.emit('Update game', {balls:games[game].balls,pos:games[game].position});
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

setInterval(update, delta); // 1000/60 = 60FPS


const getApiAndEmit = socket => {
  cooldown--;
  if(cooldown == 0){clearInterval(interval);interval = undefined;startGame();cooldown = 20;}
  io.emit("FromAPI", cooldown);
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function randomSign(n) {
  if(Math.random() > 0.5){
    return -n;
  }else{
    return n;
  }
}

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
  let arena = new Array(nbPlayer);
  for(let i=0; i<nbPlayer;i++){
    arena[i] = [r * Math.cos(2*Math.PI*(i+1)/nbPlayer),r * Math.sin(2*Math.PI*(i+1)/nbPlayer)];
  }
  let widthSide = Math.sqrt(Math.pow(arena[1][0]-arena[0][0],2)+Math.pow(arena[1][1]-arena[0][1],2));
  let barWidth = widthSide/8;
  let SpeedPlayer = widthSide/30;

  let limitMax = widthSide/2;
  let limitMin = -widthSide/2+barWidth;

  //generate ball

  let balls = [];
  for (let i=0;i<5;i++){
    let vx = getRandomInt(40);
    let vy = 40 - vx;
    balls.push({pos: [0,0], prevpos: [0,0], acceleration: [randomSign(vx) ,randomSign(vy)],lasthit:-1});
  }

  games[gameId] = {player:players,
    position:pos,
    arena:arena,
    limitMax:limitMax,
    limitMin:limitMin,
    SpeedPlayer:SpeedPlayer,
    barWidth:barWidth,
    balls:balls,
  };

  for (let i =0;i<nbPlayer;i++){
    io.to(players[i]).emit("start game",{
      id:gameId,
      position:pos,
      numPlayer:i,
      arena:arena,
      barWidth:barWidth,
      balls:balls,
    });
  }
  gameId++;
}




const startGameExemple = socket => {
  clearInterval(interval);
  interval = undefined;

  //clear waiting list
  let nbPlayer = 3;
  let players = WaitingId;
  WaitingId = [];

  //Generate position player
  let pos = new Array(nbPlayer);
  for (let i =0;i< nbPlayer;i++){pos[i] = 0;}

  //Generate property of board
  let r = 400;
  let arena = new Array(nbPlayer);
  for(let i=0; i<nbPlayer;i++){
    arena[i] = [r * Math.cos(2*Math.PI*(i+1)/nbPlayer),r * Math.sin(2*Math.PI*(i+1)/nbPlayer)];
  }
  let widthSide = Math.sqrt(Math.pow(arena[1][0]-arena[0][0],2)+Math.pow(arena[1][1]-arena[0][1],2));
  let barWidth = widthSide/8;
  let SpeedPlayer = widthSide/30;

  let limitMax = widthSide/2;
  let limitMin = -widthSide/2+barWidth;

  //generate ball

  let balls = [];
  for (let i=0;i<5;i++){
    let vx = getRandomInt(40);
    let vy = 40 - vx;
    balls.push({pos: [0,0], prevpos: [0,0], acceleration: [randomSign(vx) ,randomSign(vy)],lasthit:-1});
  }

  games[gameId] = {player:players,
    position:pos,
    arena:arena,
    limitMax:limitMax,
    limitMin:limitMin,
    SpeedPlayer:SpeedPlayer,
    barWidth:barWidth,
    balls:balls,
  };

  for (let i =0;i<nbPlayer;i++){
    io.to(players[i]).emit("start game",{
      id:gameId,
      position:pos,
      numPlayer:i,
      arena:arena,
      barWidth:barWidth,
      balls:balls,
    });
  }
  gameId++;
}

server.listen(port, () => console.log(`Listening on port ${port}`));
