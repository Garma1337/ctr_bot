const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');

function getUserIdFromMention(message) {
  const { content } = message;
  // The id is the first and only match found by the RegEx.
  const matches = content.match(/<@!?(\d+)>/);

  // If supplied variable was not a mention, matches will be null instead of an array.
  if (!matches) return null;

  // However the first element in the matches array will be the entire mention, not just the ID,
  // so use index 1.
  return matches[1];
}

module.exports = {
  name: 'unset_psn',
  description: 'Unset your PSN.',
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  cooldown: 15,
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else if (args.length > 0) {
      return sendAlertMessage(message.channel, 'Nope.', 'warning');
    } else {
      user = message.author;
    }

    let discordId;
    if (!user) {
      discordId = getUserIdFromMention(message);
    } else {
      discordId = user.id;
    }

    // eslint-disable-next-line consistent-return
    Player.findOne({ discordId }).then((doc) => {
      if (!doc || !doc.psn) {
        return sendAlertMessage(message.channel, 'You have not set your PSN yet.', 'warning');
      }

      const oldPSN = doc.psn;
      // eslint-disable-next-line no-param-reassign
      doc.psn = null;
      const promise = doc.save();

      promise.then(() => {
        sendAlertMessage(message.channel, 'PSN has been unset.', 'success');

        sendLogMessage(message.guild, `${message.author} unset their PSN.
Old: \`${oldPSN}\``);
      });
    });
  },
};
