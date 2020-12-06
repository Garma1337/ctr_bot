const Duo = require('../db/models/duos');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const Player = require('../db/models/player');
const RankedBan = require('../db/models/ranked_bans');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { DUOS } = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'partner_set',
  description: 'Set your partner for Ranked Duos.',
  guildOnly: true,
  aliases: ['set_partner', 'partner_s', 'marry'],
  async execute(message) {
    if (!message.mentions.members.size) {
      return sendAlertMessage(message.channel, 'You should tag your partner.', 'warning');
    }

    const { author, guild } = message;

    const partner = message.mentions.members.first();

    const { client } = message;
    if (author.id === partner.id || partner.id === client.user.id) {
      return sendAlertMessage(message.channel, 'You cannot set yourself or a bot as your partner.', 'warning');
    }

    const authorVerified = message.member.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');
    if (!authorVerified) {
      return sendAlertMessage(message.channel, 'You are not verified.', 'warning');
    }

    const partnerVerified = partner.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');
    if (!partnerVerified) {
      return sendAlertMessage(message.channel, 'Your partner is not verified.', 'warning');
    }

    const authorBanned = await RankedBan.findOne({ discordId: author.id, guildId: guild.id });
    if (authorBanned) {
      return sendAlertMessage(message.channel, 'You are banned.', 'warning');
    }

    const partnerBanned = await RankedBan.findOne({ discordId: partner.id, guildId: guild.id });
    if (partnerBanned) {
      return sendAlertMessage(message.channel, 'Your partner is banned.', 'warning');
    }

    const authorPlayer = await Player.findOne({ discordId: author.id });
    if (!authorPlayer || !authorPlayer.psn) {
      return sendAlertMessage(message.channel, 'You need to set your PSN.', 'warning');
    }

    const partnerPSN = await Player.findOne({ discordId: partner.id });
    if (!partnerPSN || !partnerPSN.psn) {
      return sendAlertMessage(message.channel, 'Your partner needs to set their PSN.', 'warning');
    }

    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      const savedPartner = authorSavedDuo.discord1 === author.id ? authorSavedDuo.discord2 : authorSavedDuo.discord1;
      return sendAlertMessage(message.channel, `${author}, you've already set a partner: <@${savedPartner}>.`, 'warning');
    }

    const partnerSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: partner.id }, { discord2: partner.id }] });
    if (partnerSavedDuo) {
      return sendAlertMessage(message.channel, `${author}, ${partner} already has another partner.`, 'warning');
    }

    const lobby = await RankedLobby.findOne({ type: DUOS, players: { $in: [author.id, partner.id] } });
    if (lobby) {
      return sendAlertMessage(message.channel, 'You can\'t set a partner while one of you is in a lobby.', 'warning');
    }

    sendAlertMessage(message.channel, `Please confirm that you are a partner of ${author} for Ranked Duos.`, 'info', [partner.id]).then((confirmMessage) => {
      confirmMessage.react('✅');

      const filter = (r, u) => r.emoji.name === '✅' && u.id === partner.id;
      confirmMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] }).then(async (collected) => {
        confirmMessage.delete();

        // eslint-disable-next-line no-shadow
        const lobby = await RankedLobby.findOne({ type: DUOS, players: author.id });
        if (lobby) {
          return sendAlertMessage(message.channel, `Command cancelled: ${author} joined a lobby.`, 'error');
        }

        const authorDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
        const partnerDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: partner.id }, { discord2: partner.id }] });
        if (authorDuo || partnerDuo) {
          return sendAlertMessage(message.channel, 'Command cancelled: one of you has already set a partner.', 'error');
        }

        const duo = new Duo();
        duo.guild = guild.id;
        duo.discord1 = author.id;
        duo.discord2 = partner.id;
        duo.date = new Date();
        duo.save().then(() => {
          sendAlertMessage(message.channel, `${author} & ${partner} duo has been set.`, 'success');
        });
      }).catch(() => {
        sendAlertMessage(message.channel, 'Command cancelled.', 'error');
      });
    });
  },
};
