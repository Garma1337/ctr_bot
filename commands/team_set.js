const config = require('../config');
const { Team } = require('../db/models/team');
const { RankedLobby } = require('../db/models/ranked_lobby');
const { Player } = require('../db/models/player');
const { RankedBan } = require('../db/models/ranked_ban');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { RACE_3V3, RACE_4V4 } = require('../db/models/ranked_lobby');

module.exports = {
  name: 'team_set',
  description: 'Set your team for Ranked 3 vs. 3 and ranked 4 vs. 4.',
  guildOnly: true,
  aliases: ['set_team', 'team_s'],
  async execute(message) {
    const tagsCount = message.mentions.members.size;
    if (!tagsCount) {
      return sendAlertMessage(message.channel, 'You should tag your teammates.', 'warning');
    }

    if (![2, 3].includes(tagsCount)) {
      return sendAlertMessage(message.channel, 'You should tag 3 or 4 people.', 'warning');
    }

    let mode;
    if (tagsCount === 2) {
      mode = '3 vs. 3';
    } else if (tagsCount === 3) {
      mode = '4 vs. 4';
    }

    const { author, guild } = message;

    const teammates = message.mentions.members;

    const { client } = message;
    const teammateIds = teammates.map((t) => t.id);
    if (teammateIds.includes(author.id) || teammateIds.includes(client.user.id)) {
      return sendAlertMessage(message.channel, 'very funny :)', 'warning');
    }

    const authorVerified = message.member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_verified_role.toLowerCase());
    if (!authorVerified) {
      return sendAlertMessage(message.channel, 'you are not verified.', 'warning');
    }

    const authorBanned = await RankedBan.findOne({ discordId: author.id, guildId: guild.id });
    if (authorBanned) {
      return sendAlertMessage(message.channel, 'you are banned from ranked lobbies.', 'warning');
    }

    const authorPlayer = await Player.findOne({ discordId: author.id });
    if (!authorPlayer || !authorPlayer.psn) {
      return sendAlertMessage(message.channel, 'you didn\'t set your PSN ID.', 'warning');
    }

    const authorSavedTeam = await Team.findOne({ guild: guild.id, players: author.id });
    if (authorSavedTeam) {
      return sendAlertMessage(message.channel, 'You are already in a team.', 'warning');
    }

    const lobby = await RankedLobby.findOne({ type: { $in: [RACE_3V3, RACE_4V4] }, players: { $in: [author.id, ...teammateIds] } });
    if (lobby) {
      return sendAlertMessage(message.channel, 'You can\'t set a team while one of you is playing a ranked match.', 'warning');
    }

    for (const teammate of teammates.array()) {
      const partnerVerified = teammate.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_verified_role.toLowerCase());
      if (!partnerVerified) {
        return sendAlertMessage(message.channel, `${teammate} isn't verified.`, 'warning');
      }

      const partnerBanned = await RankedBan.findOne({ discordId: teammate.id, guildId: guild.id });
      if (partnerBanned) {
        return sendAlertMessage(message.channel, `${teammate} is banned.`, 'warning');
      }

      const partnerPSN = await Player.findOne({ discordId: teammate.id });
      if (!partnerPSN || !partnerPSN.psn) {
        return sendAlertMessage(message.channel, `${teammate} didn't set their PSN ID.`, 'warning');
      }

      const partnerSavedTeam = await Team.findOne({
        guild: guild.id,
        player: teammate.id,
      });
      if (partnerSavedTeam) {
        return sendAlertMessage(message.channel, `${teammate} is already in another team.`, 'warning');
      }
    }

    const teammatesPing = teammates.map((t) => t.toString()).join(', ');
    sendAlertMessage(message.channel, `${teammatesPing}, please confirm that you are teammates of ${author} for ranked ${mode}.`, 'info').then((confirmMessage) => {
      confirmMessage.react('✅');

      const filter = (r, u) => r.emoji.name === '✅' && teammateIds.includes(u.id);
      confirmMessage.awaitReactions(filter, { max: tagsCount, time: tagsCount * 60000, errors: ['time'] }).then(async (collected) => {
        if (confirmMessage.deleted) {
          return sendAlertMessage(message.channel, 'Command cancelled. Stop abusing staff powers.', 'error');
        }

        confirmMessage.delete();

        // eslint-disable-next-line no-shadow
        const lobby = await RankedLobby.findOne({ guild: guild.id, type: { $in: [RACE_3V3, RACE_4V4] }, players: author.id });
        if (lobby) {
          return sendAlertMessage(message.channel, `Command cancelled: ${author} joined another ranked lobby.`, 'warning');
        }

        const teamExists = await Team.findOne({ guild: guild.id, players: { $in: [author.id, ...teammateIds] } });
        if (teamExists) {
          return sendAlertMessage(message.channel, 'Command cancelled: One of you has already set a team.', 'warning');
        }

        const teamPing = [author, ...teammates.array()].map((p) => p.toString()).join(', ');

        const team = new Team();
        team.guild = guild.id;
        team.players = [author.id, ...teammateIds];
        team.date = new Date();
        team.save().then(() => {
          sendAlertMessage(message.channel, `Team ${teamPing} was created.`, 'success');
        });
      }).catch(() => {
        sendAlertMessage(message.channel, 'Command cancelled.', 'error');
      });
    });
  },
};
