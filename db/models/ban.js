const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Ban = new Schema({
  guildId: String,
  discordId: String,
  bannedAt: Date,
  bannedTill: Date,
  bannedBy: String,
});

module.exports.Ban = model('bans', Ban);
