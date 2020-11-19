const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const ROLE_CAPTAIN = 'captain';
const ROLE_MEMBER = 'member';
const MEMBER_ROLES = [ROLE_CAPTAIN, ROLE_MEMBER];

module.exports.ROLE_CAPTAIN = ROLE_CAPTAIN;
module.exports.ROLE_MEMBER = ROLE_MEMBER;
module.exports.MEMBER_ROLES = MEMBER_ROLES;

const Clan = new Schema({
  fullName: String, // Crash Team Racing
  shortName: String, // CTR
  color: String,
  description: String,
  logo: String,
  discord: String,
  members: [{ role: { type: String, enum: MEMBER_ROLES }, discordId: String }],
});

Clan.methods = {
  getMemberIds() { return this.members.map((m) => m.discordId); },
  hasMember(discordId) {
    const members = this.getMemberIds();
    return members.includes(discordId);
  },
  removeMember(discordId) {
    if (!this.hasMember(discordId)) {
      return;
    }

    const index = this.members.findIndex((m) => m.discordId === discordId);
    this.members.splice(index, 1);
  },
  hasCaptain(discordId) {
    if (!this.hasMember(discordId)) {
      return false;
    }

    const member = this.members.find((m) => m.discordId === discordId);
    return member.role === ROLE_CAPTAIN;
  },
  setMemberRole(discordId, role) {
    if (!this.hasMember(discordId) || !MEMBER_ROLES.includes(role)) {
      return;
    }

    const index = this.members.findIndex((m) => m.discordId === discordId);
    this.members[index].role = role;
  },
};

module.exports.default = model('clans', Clan);
