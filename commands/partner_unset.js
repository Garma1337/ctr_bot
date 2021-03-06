const { Duo } = require('../db/models/duo');
const { Lobby } = require('../db/models/lobby');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { RACE_DUOS } = require('../db/models/lobby');

module.exports = {
  name: 'partner_unset',
  description: 'Unset your partner for Ranked Duos.',
  guildOnly: true,
  aliases: ['unset_partner', 'partner_remove', 'partner_u', 'divorce'],
  cooldown: 15,
  // eslint-disable-next-line consistent-return
  async execute(message) {
    const { author, guild } = message;

    // eslint-disable-next-line max-len
    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      const lobby = await Lobby.findOne({
        type: RACE_DUOS,
        players: { $in: [authorSavedDuo.discord1, authorSavedDuo.discord2] },
      });

      if (lobby) {
        return sendAlertMessage(message.channel, 'You can\'t unset your partner while being in the lobby with them.', 'warning');
      }

      authorSavedDuo.delete().then(() => sendAlertMessage(message.channel, 'Your partner has been unset.', 'success'));
    } else {
      sendAlertMessage(message.channel, 'Your don\'t have a partner set.', 'warning');
    }
  },
};
