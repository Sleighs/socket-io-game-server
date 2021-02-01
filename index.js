const express = require('express');
const app = express();
const router = express.Router();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const url = require('url');
const fs = require('fs');
const EventEmitter = require('events');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config/database');
const engine = require('ejs-locals');
const ejs = require('ejs');
const passport = require('passport');
const expressValidator = require('express-validator');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const User = require('./models/user.js');


server.listen(port, function () {
    console.log('Server listening at port %d', port);
    fs.writeFile(__dirname + '/start.log', 'started');
});

mongoose.connect(config.database);
let db = mongoose.connection;

// check connection
db.once('open', function () {
    console.log('Connected to MongoDB');
});

// check for db errors
db.on('error', function (err) {
    console.log(err);
});

// set public folder
app.use(express.static(__dirname + '/public'));

// set view engine
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parse Middleware
// parse application/x-www-form-unLencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/jsonparse
app.use(bodyParser.json());

// express session middleware
app.use(session({
    secret: 'jet dolphin',
    resave: true,
    saveUninitialized: true
}));
// express messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});
// express validator Middleware
app.use(expressValidator({
    errorFormatter: function (param, msg, value) {
        var namespace = param.split('.'),
            root = namespace.shift(),
            formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    }
}));

// passport config
require('./config/passport')(passport);
// passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function (req, res, next) {
    res.locals.user = req.user || null;
    next();
});



// routes
app.use('/', router);
router.get('/', function (req, res) {
    if (req.user) {
        res.render('index', { user: true, username: req.user.username });
        User.username = req.user.username;
        console.log("user exists");
    } else {
        res.render('index', { user: false, username: 'guest' });
        console.log("not logged in");
    }
});
app.get('/how-to-play', function (req, res) {
    if (req.user) {
        res.render('how-to-play', { user: true, username: req.user.username });
    } else {
        res.render('how-to-play', { user: false, username: 'guest' });
    }
});
app.get('/game', function (req, res) {
    if (req.user) {
        res.render('game', { user: true, username: req.user.username });
        User.username = req.user.username;
        guestStatus = false;
    } else {
        res.render('game', { user: false, username: 'guest' });
        guestStatus = true;
    }
});
app.get('/game/table/:room', function (req, res) {
    if (req.user) {
        res.render('table', { user: true, username: req.user.username });
        guestStatus = false;
    } else {
        res.render('table', { user: false, username: 'guest' });
        guestStatus = true;
    }
});
app.get('/game/table/test', function (req, res) {
    if (req.user) {
        res.render('table', { user: true, username: req.user.username, tableName: gameCol.currentRoom });
        guestStatus = false;
        console.log('test table open');
    } else {
        res.render('table', { user: false, username: 'guest' });
        guestStatus = true;
    }
});

app.get('/sign-in', function (req, res) {
    res.render('sign-in');
});


app.get('/game/table', function (req, res) {
    res.redirect('/game');       
});

// logout
app.get('/logout', function (req, res) {
    req.logout();
    req.flash('success', 'You are logged out');
    res.redirect('/');
});

// route files
let users = require('./routes/users');
app.use('/users', users);

let tables = require('./routes/tables');
app.use('/tables', tables);



// models
let TableModel = require('./models/table');



var lobby = [];
var gameCol = {
    totalGameCount: 0,
    gameList: {},
    namespaces: [],
    currentRoom: 'lobby',
    currentNamespace: ''
};
//var clients = io.of('/game').clients('lobby');

var Table = function (host, gameId) {
    this.host = host;
    this.gameId = gameId;
};

// Chatroom

var numUsers = 0;
var numGuests = 0;
var list = [];
var guestStatus = true;
function getRoomList() {
    var list = [];
    for (key in gameCol.gameList) {
        if (gameCol.gameList.hasOwnProperty(key)) {
            var value = gameCol.gameList[key];
            list.push(value);
        }
    }
    return list;
}


// Sockets

io.on('connection', function (socket) {
    //namespace
    var ns = url.parse(socket.handshake.url, true).query.ns;
    console.log('urlhost: ' + url);

    // Set user name
    if (guestStatus == false) {
        socket.username = User.username;
    } else {
        socket.username = 'guest';
    }

    socket.emit('guest status', guestStatus);

    socket.room = gameCol.currentRoom;

    // update lobby 
    for (key in lobby) {
        if (lobby[key] == null) {
            delete lobby[key];
        }
    }
    // update to get usernames from socket clients
    if (!lobby.includes(User.username)) {
        lobby.push(User.username);
    }

    //socket.lobby = lobby;
    getRoomList();

    socket.emit('get username', { username: socket.username });

    io.emit('displayTables', {
        gameCollection: gameCol,
        count: gameCol.totalGameCount,
        gameList: gameCol.gameList,
        list: list,
        host: gameCol.host,
        username: User.username,
        lobby: lobby
    });

    var addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data.message,
            namespace: gameCol.currentRoom
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
        if (addedUser) { return };
        // we store the username in the socket session for this client
        if (username != 'guest') {
            ++numUsers;
        } else {
            ++numGuests;
        }

        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers,
            numGuests: numGuests
        });

        socket.emit('update lobby', lobby);

        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers,
            numGuests: numGuests
        });

        socket.room = gameCol.currentRoom;
        socket.join('lobby');

        //console.log("Joining...: " + socket.room);

    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });


    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (addedUser) {
            if (socket.username != 'guest') {
                --numUsers;
            } else {
                --numGuests;
            }
            
            //remove player from socket
            
            //remove player from lobby array
            for (key in lobby) {
                if (key == socket.username) {
                    delete lobby[key];
                }
            }

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers,
                numGuests: numGuests,
                lobby: lobby
            });

            socket.emit('update lobby', lobby);
            socket.lobby = lobby;
        }
    });

    //whe client requests to join a room
    socket.on("joinRoom", data => {
        socket.leave(socket.room);
        socket.join(data.room);
        socket.room = data.room;
        socket.gooseHat = data.room;

        gameCol.currentRoom = data.room;
        gameCol.currentNamespace = data.namespace;

        console.log("Joining Room...: " + socket.room + ", nsp: " + data.namespace);
      
    });


    //when the client requests to make a Game
    socket.on('makeGame', function (data) {
        var gameId = (Math.random() + 1).toString(36).slice(2, 18);
        var date = new Date();
        var namespace = "/game/table/" + data.roomName.replace(/\s/g, '');

        // use form from page to create tables and pull the list 

        let newTable = new TableModel({
            'roomName': data.roomName,
            'host': socket.username,
            'id': gameId,
            'createdAt': date,
            'playerCount': data.playerCount,
            'private': data.private,
            'unlisted': data.unlisted,
            'password': null,
            'namespace': namespace
        });
        
        // add table to server
        newTable.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                //console.log('newTable: ' + newTable);
                console.log('saving newTable');
            }
            
        });

        // add table to dev obj
        gameCol.gameList[gameId] = {
            'roomName': data.roomName,
            'host': socket.username,
            'id': gameId,
            'createdAt': date,
            'playerCount': data.playerCount,
            'private': data.private,
            'unlisted': data.unlisted,
            'password': null,
            'namespace': namespace

        };

        list = [];
        for (key in gameCol.gameList) {
            if (gameCol.gameList.hasOwnProperty(key)) {
                var value = gameCol.gameList[key];
                list.push(value);
            }
        }

        gameCol.totalGameCount++;

        io.emit('gameCreated', {
            username: socket.username,
            gameId: gameId,
            gameCollection: gameCol,
            count: gameCol.totalGameCount,
            gameList: gameCol.gameList,
            list: list,
            lobby: lobby, 
            namespace: namespace,
            tableName: data.roomName,
            numGuests: numGuests,
            testObj: newTable
        });
        io.emit('log new game', {
            username: socket.username,
            roomName: data.roomName
        });

        io.emit('displayTables', {
            gameCollection: gameCol,
            count: gameCol.totalGameCount,
            gameList: gameCol.gameList,
            list: list,
            username: User.username,
            lobby: lobby
        });
    });  

    socket.on('hi', function (data) {
        console.log(data);
    });

    socket.emit('render lobby', { lobby: lobby, numGuests: numGuests });
});

io.of('/game/table/test').on('connection', function (socket) {
    var schema = new mongoose.Schema({
        name: String
    });

    var newModel = mongoose.model('Test', schema);
   
    var model = new newModel({
        name: 'item 1'
    });
    
    console.log(model.name);
});
