const { Duo } = require('../db/models/duo');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'partner',
  description: 'Check your partner for Ranked Duos',
  guildOnly: true,
  async execute(message) {
    const { author, guild } = message;

    // eslint-disable-next-line max-len
    const authorSavedDuo = await Duo.findOne({ guild: guild.id, $or: [{ discord1: author.id }, { discord2: author.id }] });
    if (authorSavedDuo) {
      // eslint-disable-next-line max-len
      const savedPartner = authorSavedDuo.discord1 === author.id ? authorSavedDuo.discord2 : authorSavedDuo.discord1;
      sendAlertMessage(message.channel, `Your partner is <@${savedPartner}>.`, 'info');
    } else {
      sendAlertMessage(message.channel, 'You don\'t have a partner set.', 'info');
    }
  },
};
