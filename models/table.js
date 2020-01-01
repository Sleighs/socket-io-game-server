const mongoose = require('mongoose');

// table schema
const TableSchema = mongoose.Schema({
    roomName: {
        type: String,
        required: true
    },
    host: {
        type: String,
        required: true
    },
    password: {
        type: String
    },
    private: {
        type: Boolean
    },
    unlisted: {
        type: Boolean
    },
    playerCount: {
        type: Number
    }
});

const Table = module.exports = mongoose.model('Table', TableSchema);
