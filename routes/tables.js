const express = require('express');
const router = express.Router();

//bring in user modeLs
let Table = require('../models/table');
var gameId = (Math.random() + 1).toString(36).slice(2, 18);
var date = new Date();

router.post('/table-setup', function (req, res) {
    const name = req.body.name;
    const username = req.body.username;
    const password = req.body.password;
    const password2 = req.body.password2;
    const private = req.body.private;
    const unlisted = req.body.unlisted;
    const playerCount = req.body.playerCount;

    /*req.checkBody('name', 'Name is required').notEmpty;
    req.checkBody('playerCount', 'Player count is required').notEmpty
    req.checkBody('password', 'Password is not required').optional();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
    */
    
    let newTable = new Table({
        roomName: name,
        host: username,
        password: password,
        playerCount: playerCount,
        private: private,
        unlisted: unlisted,
        gameId: gameId,
        createdAt: date
    });
 
    newTable.save(function (err) {
        //if (err) return handleError(err);

    });

    //res.redirect('/');
    //res.render('game', { user: true, username: username });
});

module.exports = router;
