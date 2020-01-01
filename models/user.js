const mongoose = require('mongoose');

// user schema
const UserSchema = mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  username:{
    type: String,
    required: true
  },
  password:{
    type: String,
    required: true
  },
  currentRoom: {
    type: String,
    required: false
  }
});

const User = module.exports = mongoose.model('User', UserSchema);
