const { Player } = require('../db/models/player');
const isServerSupporter = require('../utils/isServerSupporter');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_color',
  description: 'Set your profile color.',
  guildOnly: true,
  aliases: ['set_profile_color'],
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    const isStaff = isStaffMember(message.member);
    const isSupporter = isServerSupporter(message.member);

    if (!isStaff && !isSupporter) {
      return sendAlertMessage(message.channel, 'You need to be a Donator or Server Booster to use this command.', 'warning');
    }

    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.color = null;
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your profile color has been unset.', 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });

      // eslint-disable-next-line consistent-return
      return;
    }

    let color;
    let user;

    if (isStaff && args.length === 2) {
      user = message.mentions.users.first();
      color = parseInt(args[1], 16);

      if (!user) {
        // eslint-disable-next-line consistent-return
        return sendAlertMessage(message.channel, 'You need to mention a user.', 'warning');
      }
    } else {
      user = message.author;
      color = parseInt(args[0], 16);
    }

    if (!color) {
      // eslint-disable-next-line consistent-return
      return sendAlertMessage(message.channel, 'You need to enter the desired profile color.', 'warning');
    }

    // eslint-disable-next-line consistent-return
    Player.findOne({ discordId: user.id }).then((player) => {
      if (!player) {
        player = new Player();
        player.discordId = user.id;
      }

      player.color = color;
      player.save().then(() => {
        if (user.id === message.author.id) {
          sendAlertMessage(message.channel, `Your profile color has been set to "${color}".`, 'success');
        } else {
          sendAlertMessage(message.channel, `<@!${user.id}>'s profile color has been set to "${color}".`, 'success');
        }
      }).catch((error) => {
        sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
      });
    });
  },
};
