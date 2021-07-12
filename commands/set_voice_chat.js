const {
  MessageMenu,
  MessageMenuOption,
} = require('discord-buttons');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_voice_chat',
  description: 'Set your voice chat options.',
  guildOnly: true,
  aliases: ['set_vc'],
  cooldown: 10,
  execute(message, args) {
    if (args.length > 0 && args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.discordVc = null;
        player.ps4Vc = null;
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your voice chat options have been unset.', 'success');
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

    const voiceChatMenu = new MessageMenu()
      .setID('select_voice_chat')
      .setPlaceholder('Choose ...')
      .setMaxValues(2)
      .setMinValues(1)
      .addOption(new MessageMenuOption()
        .setLabel('Discord')
        .setValue('discord'))
      .addOption(new MessageMenuOption()
        .setLabel('PS4')
        .setValue('ps4'));

    // eslint-disable-next-line consistent-return
    return sendAlertMessage(message.channel, 'Select your voice chat option(s).', 'info', [], [], [voiceChatMenu]).then((confirmMessage) => {
      const filter = (m) => m.clicker.user.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      confirmMessage.awaitMenus(filter, options).then((collectedOptios) => {
        const collectedOption = collectedOptios.first();

        Player.findOne({ discordId: user.id }).then((player) => {
          if (!player) {
            player = new Player();
            player.discordId = user.id;
          }

          player.discordVc = false;
          player.ps4Vc = false;

          const voiceChatOptions = [];
          if (collectedOption.values.includes('discord')) {
            player.discordVc = true;
            voiceChatOptions.push('Discord');
          }

          if (collectedOption.values.includes('ps4')) {
            player.ps4Vc = true;
            voiceChatOptions.push('PS4');
          }

          player.save().then(() => {
            sendAlertMessage(message.channel, `Your voice chat options have been set to \`${voiceChatOptions.join(', ')}\`.`, 'success');
          }).catch((error) => {
            sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
          });

          confirmMessage.delete();
        });
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    });
  },
};
