const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Sequence = new Schema({
  name: String,
  guild: String,
  number: { type: Number, default: 0 },
});

module.exports.Sequence = model('sequence', Sequence);
