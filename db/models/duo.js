const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Duo = new Schema({
  guild: String,
  discord1: String,
  discord2: String,
  date: Date,
});

module.exports.Duo = model('duo', Duo);
