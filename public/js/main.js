var games;
var socket = io('http://localhost.com:3000/game');
var socketGame = io();
var socketTable;

$(function () {
    // Main Lobby Socket events
    socket.on('displayTables', function (data) {
        DISPLAY.showTables(data);
    });

    socket.on('update lobby', function (data) {
        DISPLAY.renderGameLobby(data);
    });

    socketGame.on('gameCreated', function (data) {
        
        DISPLAY.showTables(data);

        socketGame.emit('joinRoom', { namespace: data.namespace, room: data.tableName, testObj: data.testObj });

        GAME.currentNamespace = data.namespace;
        GAME.games = data.gameCollection;
        GAME.testObj = data.testObj;

        console.log("Game Created! ID is: " + data.gameId);
        console.log("tesObj:" + data.testObj);

        window.open(data.namespace, '_self');
    });

    socket.on('guest status', function (status) {
        GAME.guestStatus = status;
    });
});

// game setup 

$("#close-game-setup").on("click", function () {
    $('#table-setup').hide();
    $('#table-list').css('display', 'inline-block');
});
$("#create-table").on("click", function () {
    $('#table-setup').css('display', 'inline-block');
    $('#table-list').hide();
});
$("#private-game-input").on("change", function () {
    if (this.value == true) {
        $("#private-game-password-container").show();
    } else {
        $("#private-game-password-container").hide();
    }
});
$('.createGame').on('click', function () {
    // send game info to server
        SERVER.sendGame();
});

var GAME = {
    gamesList: [],
    currentNamespace: '/',
    guestStatus: true
};



var SERVER = {
    /*connect: function (ns) {
        console.log('connect ns:' + ns);
        
        return io.connect(ns, {
            query: 'ns=' + ns,
            resource: "socket.io"
        });
    },
    socket: this.connect(GAME.currentNamespace),*/
    sendGame: function () {
        var radios = document.getElementsByName('playerCount');
        var selected;
        for (var i = 0, length = radios.length; i < length; i++) {
            if (radios[i].checked) {
                selected = radios[i].value;
            }
        }

        var roomName = document.getElementById('table-name-input').value;

        //if room name exists add number too table name, or  name 

        //check the tables on the server

        socketGame.emit('makeGame', {
            roomName: roomName,
            playerCount: selected,
            private: null,//document.getElementById('private-game-input').value,
            unlisted: null//document.getElementById('unlisted-game-input').value
        });
    }
};


// Display Functions 

var DISPLAY = {
    showTables: function (data) {
        var games = data.list;
        var tablesContainer = document.getElementById("tables");
        var tableRows = document.querySelectorAll(".table-row-container");

        tableRows.forEach(e => e.parentNode.removeChild(e));

        //create element
        for (var i = 0; i < data.count; i++) {
            var rowContainer = document.createElement("div");
            var container1 = document.createElement("div");
            var container2 = document.createElement("div");
            var container3 = document.createElement("div");

            rowContainer.classList.add("table-row-container");
            rowContainer.id = ("table-row" + i);
            rowContainer.dataset.tableId = games[i].gameId;
            container1.classList.add("table-row-stat");
            container2.classList.add("table-row-stat");
            container3.classList.add("table-row-stat");

            var tableHeaderEle1 = document.createElement('h2');
            var tableHeaderEle2 = document.createElement('h2');
            var tableHeaderEle3 = document.createElement('h2');
            var tableSpanEle1 = document.createElement('span');
            var tableSpanEle2 = document.createElement('span');
            var tableSpanEle3 = document.createElement('span');

            var tableTitle = document.createTextNode("Table");
            var tableNode = document.createTextNode(games[i].roomName);        
            var countTitle = document.createTextNode("Players");
            var countNode = document.createTextNode(games[i].playerCount);
            var hostTitle = document.createTextNode("Host");
            var hostNode = document.createTextNode(games[i].host);
            
            tableHeaderEle1.appendChild(tableTitle);
            tableSpanEle1.appendChild(tableNode);
            container1.appendChild(tableHeaderEle1);
            container1.appendChild(tableSpanEle1);
            tableHeaderEle2.appendChild(countTitle);
            tableSpanEle2.appendChild(countNode);
            container2.appendChild(tableHeaderEle2);
            container2.appendChild(tableSpanEle2);
            tableHeaderEle3.appendChild(hostTitle);
            tableSpanEle3.appendChild(hostNode);
            container3.appendChild(tableHeaderEle3);
            container3.appendChild(tableSpanEle3);

            rowContainer.appendChild(container1);
            rowContainer.appendChild(container2);
            rowContainer.appendChild(container3);
            tablesContainer.appendChild(rowContainer);

            var rows = document.querySelectorAll('.table-row-container');
            var addOnClick = function () {
                var anchor = rows[i];
                var room = games[i].roomName;
                var namespace = games[i].namespace;
                var id = games[i].id; 

                //open table
                anchor.onclick = function () {
                    //console.log(data.username + " has joined the table");
                    
                    socketGame.emit('joinRoom', { room: room, namespace: namespace, id: id, testObj: GAME.testObj });

                    GAME.currentNamespace = namespace;

                    window.open(namespace, '_self');

                    SERVER.socket.emit('hi', 'hello  server');
                };
            };

            $(rowContainer.id).click(addOnClick());
        }

        DISPLAY.renderGameLobby(data.lobby);       
    },
    renderGameLobby: function (data) {
        //create text node for every player in lobby
        $userList = document.querySelectorAll('.lobby-row');

        //add row for guest count
        /*
        if (numGuests == 1) {
            lobby.push("(" + numGuests + ")Guest");
        } else if (numGuests > 1) {
            lobby.push("(" + numGuests + ")Guests");
        }
        */


        if (data) {
           $userList.forEach(e => e.parentNode.removeChild(e));
            if (data.numGuests > 0) {
                var ul = document.getElementById('players-in-lobby');
                var li = document.createElement('li');

                li.setAttribute('class', 'lobby-row');
                li.innerHTML = "(" + data.numGuests + ")Guests";
                ul.appendChild(li);

            }
            for (var i = 0; i < data.length; i++) {
               if (data[i] !== null) {
                   var ul = document.getElementById('players-in-lobby');
                   var li = document.createElement('li');

                   li.setAttribute('class', 'lobby-row');
                   li.innerHTML = String(data[i]);
                   ul.appendChild(li);
               }
            }
        }
    }   
};

var CHAT = {
    // Log a message
    log: function (message, options) {
        var $el = $('<li>').addClass('log').text(message);
        CHAT.addMessageElement($el, options);
    },
    addMessageElement: function (el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        //$messages[0].scrollTop = $messages[0].scrollHeight;
    },
    addParticipantsMessage: function (data) {
        var message = '';
        if (data.numUsers === 1) {
            message += "Crickets...It's Just YOU and ME -modbot";
        } else {
            message += "there are " + data.numUsers + " players in the Lobby";
        }
        CHAT.log(message);
    }
};