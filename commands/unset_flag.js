const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'unset_flag',
  description: 'Set your country flag.',
  aliases: ['remove_country', 'remove_flag', 'unset_country'],
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let discordId;

    if (isStaff) {
      if (args.length === 1) {
        discordId = message.mentions.members.first().id;
      } else {
        discordId = message.author.id;
      }
    } else if (args.length > 0) {
      return sendAlertMessage(message.channel, 'Nope.', 'warning');
    } else {
      return sendAlertMessage(message.channel, 'Nope.', 'warning');
    }

    Player.findOne({ discordId }).then((doc) => {
      if (doc) {
        doc.flag = '🇺🇳';

        doc.save().then(() => {
          sendAlertMessage(message.channel, 'Flag has been removed.', 'success');
        });
      } else {
        if (isStaff) {
          return sendAlertMessage(message.channel, 'The user has no flag.', 'warning');
        }

        return sendAlertMessage(message.channel, 'You have no flag.', 'warning');
      }
    });
  },
};
