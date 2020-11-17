const Team = require('../db/models/teams');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const Player = require('../db/models/player');
const RankedBan = require('../db/models/ranked_bans');
const { _4V4 } = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'team_set',
  description: 'Set your team for Ranked 4v4.',
  guildOnly: true,
  aliases: ['set_team', 'team_s'],
  async execute(message) {
    const tagsCount = message.mentions.members.size;
    if (!tagsCount) {
      return message.reply('you should tag your teammates.');
    }

    if (tagsCount < 3 || tagsCount > 3) {
      return message.reply('you should tag 3 people.');
    }

    const { author, guild } = message;

    const teammates = message.mentions.members;

    const { client } = message;
    const teammateIds = teammates.map((t) => t.id);
    if (teammateIds.includes(author.id) || teammateIds.includes(client.user.id)) {
      return message.reply('very funny :)');
    }

    const authorVerified = message.member.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');
    if (!authorVerified) {
      return message.reply('you are not verified.');
    }

    const authorBanned = await RankedBan.findOne({ discordId: author.id, guildId: guild.id });
    if (authorBanned) {
      return message.reply('you are banned.');
    }

    const authorPlayer = await Player.findOne({ discordId: author.id });
    if (!authorPlayer || !authorPlayer.psn) {
      return message.reply('you didn\'t set PSN');
    }

    const authorSavedTeam = await Team.findOne({ guild: guild.id, players: author.id });
    if (authorSavedTeam) {
      return message.channel.send('...').then((m) => m.edit(`${author}, you are already in a team.`));
    }

    const lobby = await RankedLobby.findOne({ type: _4V4, players: { $in: [author.id, ...teammateIds] } });
    if (lobby) {
      return message.reply('you can\'t set a team while one of you are in a lobby.');
    }

    for (const teammate of teammates.array()) {
      const partnerVerified = teammate.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');
      if (!partnerVerified) {
        return message.reply(`${teammate} isn't verified.`);
      }

      const partnerBanned = await RankedBan.findOne({ discordId: teammate.id, guildId: guild.id });
      if (partnerBanned) {
        return message.reply(`${teammate} is banned.`);
      }

      const partnerPSN = await Player.findOne({ discordId: teammate.id });
      if (!partnerPSN || !partnerPSN.psn) {
        return message.reply(`${teammate} didn't set PSN`);
      }

      const partnerSavedTeam = await Team.findOne({
        guild: guild.id,
        player: teammate.id,
      });
      if (partnerSavedTeam) {
        return message.channel.send('...').then((m) => m.edit(`${author}, ${teammate} is already in another team.`));
      }
    }

    const teammatesPing = teammates.map((t) => t.toString()).join(', ');
    message.channel.send('...')
      .then((msg) => msg.edit(`${teammatesPing}, please confirm that you are teammates of ${author} for ranked 4 vs. 4.`))
      .then((confirmMessage) => {
        confirmMessage.react('✅');

        const filter = (r, u) => r.emoji.name === '✅' && teammateIds.includes(u.id);
        confirmMessage.awaitReactions(filter, { max: 3, time: 3 * 60000, errors: ['time'] })
          .then(async (collected) => {
            // eslint-disable-next-line no-shadow
            const lobby = await RankedLobby.findOne({ guild: guild.id, type: _4V4, players: author.id });
            if (lobby) {
              return confirmMessage.edit(`Command cancelled: ${author} joined a lobby.`);
            }

            const teamExists = await Team.findOne({ guild: guild.id, players: { $in: [author.id, ...teammateIds] } });
            if (teamExists) {
              return confirmMessage.edit('Command cancelled: one of you have already set a team.');
            }

            const teamPing = [author, ...teammates.array()].map((p) => p.toString()).join(', ');

            const team = new Team();
            team.guild = guild.id;
            team.players = [author.id, ...teammateIds];
            team.date = new Date();
            team.save().then(() => {
              confirmMessage.edit(`Team ${teamPing} was created`);
            });
          })
          .catch(() => {
            confirmMessage.edit('Command cancelled.');
          });
      });
  },
};
