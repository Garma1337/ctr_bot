const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendLogMessage = require('../utils/sendLogMessage');

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
        return message.channel.send('Nope.');
      }
    } else if (args.length > 1) {
      return message.channel.send('Nope.');
    } else {
      PSN = args.shift();
      user = message.author;
    }

    if (PSN === 'ctr_tourney_bot' || PSN === 'YourPSN') {
      return message.channel.send('You okay, bro?');
    }

    message.guild.members.fetch(user).then((member) => {
      const discordId = member.user.id;

      const e = 'You should specify PSN.';
      if (!PSN) {
        return message.channel.send(e);
      }

      Player.findOne({ psn: PSN }).then((repeatPSN) => {
        if (repeatPSN) {
          if (repeatPSN.discordId === message.author.id) {
            return message.channel.send('You\'ve already set this PSN name.');
          }
          return message.channel.send('This PSN is already used by another player.');
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
              return message.channel.send(`You've already set your PSN to \`${doc.psn}\`. It cannot be changed.`);
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
            message.channel.send(`PSN has been set \`${PSN}\``);
          });
        });
      });
    });
  },
};
