const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Clan = new Schema({
  fullName: String, // Crash Team Racing
  shortName: String, // CTR
  color: String,
  description: String,
  logo: String,
  discord: String,
});

module.exports = model('clans', Clan);
