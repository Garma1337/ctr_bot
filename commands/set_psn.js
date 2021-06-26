const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_psn',
  description: 'Set your PSN.',
  guildOnly: true,
  cooldown: 10,
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let PSN;
    let user;

    if (isStaff && args.length !== 1) {
      if (args.length === 2) {
        PSN = args[1];
        // eslint-disable-next-line prefer-destructuring
        user = message.mentions.users.first();
      } else {
        user = message.author;
      }
    } else if (args.length > 1) {
      return sendAlertMessage(message.channel, 'Nope.', 'warning');
    } else {
      PSN = args.shift();
      user = message.author;
    }

    if (PSN === 'ctr_tourney_bot' || PSN === 'YourPSN') {
      return sendAlertMessage(message.channel, 'You okay, bro?', 'warning');
    }

    // eslint-disable-next-line consistent-return
    message.guild.members.fetch(user).then((member) => {
      const discordId = member.user.id;

      const e = 'You should specify the PSN.';
      if (!PSN) {
        return sendAlertMessage(message.channel, e, 'warning');
      }

      // eslint-disable-next-line consistent-return
      Player.findOne({ psn: PSN }).then((repeatPSN) => {
        if (repeatPSN) {
          if (repeatPSN.discordId === message.author.id) {
            return sendAlertMessage(message.channel, 'You\'ve already set this PSN name.', 'warning');
          }

          return sendAlertMessage(message.channel, 'This PSN is already used by another player.', 'warning');
        }

        // eslint-disable-next-line consistent-return
        Player.findOne({ discordId }).then((doc) => {
          let promise;
          if (!doc) {
            const player = new Player();
            player.discordId = discordId;
            player.psn = PSN;
            promise = player.save();
          } else {
            doc.psn = PSN;
            promise = doc.save();
          }

          promise.then(() => {
            sendAlertMessage(message.channel, `PSN has been set \`${PSN}\`.`, 'success');
          });
        });
      });
    });
  },
};
