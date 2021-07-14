const {
  MessageMenu,
  MessageMenuOption,
} = require('discord-buttons');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { serverLanguages } = require('../db/server_languages');

module.exports = {
  name: 'set_languages',
  description: 'Set your languages.',
  guildOnly: true,
  aliases: ['set_language', 'language_set'],
  cooldown: 10,
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.languages = [];
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your languages have been unset.', 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });

      return;
    }

    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && message.mentions.users.size > 0) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    const languageMenu = new MessageMenu()
      .setID('select_language')
      .setPlaceholder('Choose ...')
      .setMaxValues(4)
      .setMinValues(1);

    serverLanguages.forEach((l) => {
      const option = new MessageMenuOption()
        .setLabel(l.name)
        .setValue(l.emote)
        .setEmoji(l.char);

      languageMenu.addOption(option);
    });

    // eslint-disable-next-line consistent-return
    return sendAlertMessage(message.channel, 'Select the languages that you speak.', 'info', [], [], [languageMenu]).then((confirmMessage) => {
      const filter = (m) => m.clicker.user.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      confirmMessage.awaitMenus(filter, options).then((collectedOptions) => {
        confirmMessage.delete();

        const collectedOption = collectedOptions.first();
        const emotes = collectedOption.values;

        Player.findOne({ discordId: user.id }).then((player) => {
          if (!player) {
            player = new Player();
            player.discordId = user.id;
          }

          player.languages = emotes;
          player.save().then(() => {
            if (user.id === message.author.id) {
              sendAlertMessage(message.channel, `Your languages have been set to ${emotes.join(', ')}.`, 'success');
            } else {
              sendAlertMessage(message.channel, `<@!${user.id}>'s languages have been set to ${emotes.join(', ')}.`, 'success');
            }
          }).catch((error) => {
            sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
          });

          collectedOption.reply.defer(false).then();
        }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
