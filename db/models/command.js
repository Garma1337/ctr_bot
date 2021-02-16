const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Command = new Schema({
  name: String,
  message: String,
});

module.exports.Command = model('commands', Command);
