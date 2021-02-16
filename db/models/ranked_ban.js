const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const RankedBan = new Schema({
  guildId: String,
  discordId: String,
  bannedAt: Date,
  bannedTill: Date,
  bannedBy: String,
  reason: String,
});

module.exports.RankedBan = model('ranked_ban', RankedBan);
