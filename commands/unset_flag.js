const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');

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
        return message.channel.send('Nope.');
      }
    } else if (args.length > 0) {
      return message.channel.send('Nope.');
    } else {
      return message.channel.send('Nope.');
    }

    Player.findOne({ discordId }).then((doc) => {
      if (doc) {
        doc.delete().then(() => {
          message.channel.send('Flag has been removed.');
        });
      } else {
        if (isStaff) {
          return message.channel.send('The user has no flag.');
        }
        return message.channel.send('You have no flag.');
      }
    });
  },
};
