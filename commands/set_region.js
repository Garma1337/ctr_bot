const {
  MessageMenu,
  MessageMenuOption,
} = require('discord-buttons');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { regions } = require('../db/regions');

module.exports = {
  name: 'set_region',
  usage: '@user',
  description: 'Set your region.',
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    Player.findOne({ discordId: user.id }).then((player) => {
      if (!player) {
        player = new Player();
        player.discordId = user.id;
        player.region = null;
      }

      if (player.region && !isStaff) {
        return sendAlertMessage(message.channel, 'You cannot change your region. Please message a staff member.', 'warning');
      }

      const regionMenu = new MessageMenu()
        .setID('select_region')
        .setPlaceholder('Choose ...')
        .setMaxValues(1)
        .setMinValues(1);

      regions.forEach((r) => {
        if (!r.selectable) {
          return;
        }

        const option = new MessageMenuOption()
          .setLabel(r.name)
          .setValue(r.uid)
          .setDescription(r.description);

        regionMenu.addOption(option);
      });

      return sendAlertMessage(message.channel, 'Select your region.', 'info', [], [], [regionMenu]).then((confirmMessage) => {
        const filter = (m) => m.clicker.user.id === message.author.id;
        const options = { max: 1, time: 60000, errors: ['time'] };

        confirmMessage.awaitMenus(filter, options).then((collectedOptions) => {
          confirmMessage.delete();

          const collectedOption = collectedOptions.first();
          const regionUid = collectedOption.values.shift();
          const region = regions.find((r) => r.uid === regionUid);

          player.region = region.uid;
          player.save().then(() => {
            if (user.id === message.author.id) {
              sendAlertMessage(message.channel, `Your region has been set to \`${region.description}\`.`, 'success');
            } else {
              sendAlertMessage(message.channel, `<@!${user.id}>'s region has been set to \`${region.description}\`.`, 'success');
            }
          }).catch((error) => {
            sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
          });

          collectedOption.reply.defer();
        }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
      }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
