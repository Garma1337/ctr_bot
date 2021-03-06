const {
  MessageMenu,
  MessageMenuOption,
} = require('discord-buttons');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { natTypes } = require('../db/nat_types');

module.exports = {
  name: 'set_nat',
  description: 'Set your NAT type.',
  guildOnly: true,
  cooldown: 10,
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

    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    const natTypeMenu = new MessageMenu()
      .setID('select_nat')
      .setPlaceholder('Choose ...')
      .setMaxValues(1)
      .setMinValues(1);

    natTypes.forEach((n) => {
      const option = new MessageMenuOption()
        .setLabel(n.name)
        .setValue(n.name);

      natTypeMenu.addOption(option);
    });

    // eslint-disable-next-line consistent-return
    return sendAlertMessage(message.channel, 'Select NAT type. Waiting 1 minute.', 'info', [], [], [natTypeMenu]).then((confirmMessage) => {
      const filter = (m) => m.clicker.user.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      confirmMessage.awaitMenus(filter, options).then((collectedOptions) => {
        confirmMessage.delete();

        const collectedOption = collectedOptions.first();
        const natType = collectedOption.values.shift();

        Player.findOne({ discordId: user.id }).then((player) => {
          if (!player) {
            player = new Player();
            player.discordId = user.id;
          }

          player.nat = natType;
          player.save().then(() => {
            sendAlertMessage(message.channel, `NAT type has been set to \`${natType}\`.`, 'success');
          }).catch((error) => {
            sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
          });

          collectedOption.reply.defer(false).then();
        }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
