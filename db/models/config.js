const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Config = new Schema({
  name: String,
  value: mongoose.Mixed,
  editable: Boolean,
});

module.exports.Config = model('config', Config);
