var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');

const rooms = {};

app.get('/', (req, res) => {
  res.redirect('/host?game_id=' + Math.random().toString().replace('0.', ''));
});

app.get('/player', (req, res) => {
  res.sendFile(__dirname + '/player.html');
});

app.get('/host', (req, res) => {
  const content = fs.readFileSync(__dirname + '/host.html').toString().replace(/\$\{PLAYER_URL\}/g, '/player?game_id=' + req.query.game_id);
  res.send(content);
});

app.use(express.static('public'))

io.on('connection', (socket) => {
  const gameId = socket.handshake.query.game_id;
  const isHost = socket.handshake.query.host;
  console.log(`a ${isHost ? 'host' : 'player'} connected on game #${gameId}`);

  if(!rooms[gameId]) {
    rooms[gameId] = {
      host: null,
      players: [],
      lastKnownState: '{}',
    }
  }

  if(isHost) {
    rooms[gameId].host = socket;

    socket.on('update_state', function(newState) {
      console.log('Received a new state, broadcasting')
      rooms[gameId].lastKnownState = newState;
      rooms[gameId].players.forEach(p => p.emit('state_change', newState))
    })
  }
  else {
    rooms[gameId].players.push(socket);
    socket.emit('state_change', rooms[gameId].lastKnownState);
    socket.on('disconnect', () => {
      console.log('user disconnected from game', gameId);
      const index = rooms[gameId].players.indexOf(5);
      if (index > -1) {
        rooms[gameId].players.splice(index, 1);
      }

      if(rooms[gameId].players.length === 0) {
        console.log('Terminating gameId ', gameId);
        delete rooms[gameId];
      }
    });
  }
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
