const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Room = new Schema({
  guild: String,
  number: Number,
  lobby: { type: Schema.Types.ObjectId, ref: 'lobbies', default: null },
});

module.exports.Room = model('room', Room);
