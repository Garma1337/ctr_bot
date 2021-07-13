const {
  MessageMenu,
  MessageMenuOption,
} = require('discord-buttons');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { consoles } = require('../db/consoles');

module.exports = {
  name: 'set_console',
  description: 'Set your consoles.',
  guildOnly: true,
  aliases: ['set_consoles', 'console_set'],
  cooldown: 30,
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.consoles = [];
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your consoles have been unset.', 'success');
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

    const consoleMenu = new MessageMenu()
      .setID('select_console')
      .setPlaceholder('Choose ...')
      .setMaxValues(consoles.length)
      .setMinValues(1);

    consoles.forEach((c) => {
      const option = new MessageMenuOption()
        .setLabel(c.name)
        .setValue(c.tag)
        .setEmoji(c.emote);

      consoleMenu.addOption(option);
    });

    // eslint-disable-next-line consistent-return
    return sendAlertMessage(message.channel, 'Select your consoles.', 'info', [], [], [consoleMenu]).then((confirmMessage) => {
      const filter = (m) => m.clicker.user.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      confirmMessage.awaitMenus(filter, options).then((collectedOptions) => {
        confirmMessage.delete();

        const collectedOption = collectedOptions.first();
        const selectedConsoles = collectedOption.values;

        const consoleNames = [];
        selectedConsoles.forEach((s) => {
          const console = consoles.find((c) => c.tag === s);
          consoleNames.push(console.name);
        });

        Player.findOne({ discordId: user.id }).then((player) => {
          if (!player) {
            player = new Player();
            player.discordId = user.id;
            player.consoles = [];
          }

          player.consoles = selectedConsoles;
          player.save().then(() => {
            if (user.id === message.author.id) {
              sendAlertMessage(message.channel, `Your consoles have been set to \`${consoleNames.join(', ')}\`.`, 'success');
            } else {
              sendAlertMessage(message.channel, `<@!${user.id}>'s consoles have been set to \`${consoleNames.join(', ')}\`.`, 'success');
            }
          }).catch((error) => {
            sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
          });
        }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));

        collectedOption.reply.defer(false).then();
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
