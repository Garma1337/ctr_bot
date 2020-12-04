const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendLogMessage = require('../utils/sendLogMessage');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_psn',
  description: 'Set your PSN.',
  guildOnly: true,
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

    message.guild.members.fetch(user).then((member) => {
      const discordId = member.user.id;

      const e = 'You should specify PSN.';
      if (!PSN) {
        return sendAlertMessage(message.channel, e, 'warning');
      }

      Player.findOne({ psn: PSN }).then((repeatPSN) => {
        if (repeatPSN) {
          if (repeatPSN.discordId === message.author.id) {
            return sendAlertMessage(message.channel, 'You\'ve already set this PSN name.', 'warning');
          }
          return sendAlertMessage(message.channel, 'This PSN is already used by another player.', 'warning');
        }
        Player.findOne({ discordId }).then((doc) => {
          let promise;
          if (!doc) {
            const player = new Player();
            player.discordId = discordId;
            player.psn = PSN;
            promise = player.save();
          } else {
            if (!isStaff && doc.psn) {
              return sendAlertMessage(message.channel, `You've already set your PSN to \`${doc.psn}\`. It cannot be changed.`, 'warning');
            }

            const oldPSN = doc.psn;
            // eslint-disable-next-line no-param-reassign
            doc.psn = PSN;
            promise = doc.save();

            if (oldPSN) {
              try {
                sendLogMessage(message.guild, `${member} changed their PSN.
Old: \`${oldPSN}\`
New: \`${PSN}\``);
              } catch (e) {
                console.error(e);
              }
            }
          }

          promise.then(() => {
            sendAlertMessage(message.channel, `PSN has been set \`${PSN}\`.`, 'success');
          });
        });
      });
    });
  },
};
