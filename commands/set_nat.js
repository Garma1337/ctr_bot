const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_nat',
  description: 'Set your NAT type.',
  guildOnly: true,
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.nat = null;
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your NAT Type has been unset.', 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });

      return;
    }

    const natTypes = [
      'NAT 1',
      'NAT 2 Open',
      'NAT 2 Closed',
      'NAT 3',
    ];

    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    return sendAlertMessage(message.channel, `Select NAT type. Waiting 1 minute.\n
\`\`\`1 - NAT 1
2 - NAT 2 Open
3 - NAT 2 Closed
4 - NAT 3\`\`\``, 'info').then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };
      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        if (['1', '2', '3', '4'].includes(content)) {
          const index = Number(content) - 1;

          Player.findOne({ discordId: user.id }).then((player) => {
            if (!player) {
              player = new Player();
              player.discordId = user.id;
            }

            player.nat = natTypes[index];
            player.save().then(() => {
              sendAlertMessage(message.channel, `NAT type has been set to \`${natTypes[index]}\`.`, 'success');
            }).catch((error) => {
              sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
            });
          });
        } else {
          sendAlertMessage(message.channel, 'Command cancelled.', 'error');
        }
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    });
  },
};
