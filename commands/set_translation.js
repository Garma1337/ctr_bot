const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { botLanguages } = require('../utils/botLanguages');

module.exports = {
  name: 'set_translation',
  description: 'Set your Bot translation.',
  guildOnly: true,
  aliases: ['set_tl', 'set_bot_language'],
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    return sendAlertMessage(message.channel, `Select translation. Waiting 1 minute.\n
\`\`\`${botLanguages.map((b, i) => `${i + 1} - ${b.name}`).join('\n')}\`\`\``, 'info').then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        if (botLanguages.map((b, i) => String(i + 1)).includes(content)) {
          const index = Number(content) - 1;

          Player.findOne({ discordId: user.id }).then((player) => {
            if (!player) {
              player = new Player();
              player.discordId = user.id;
            }

            player.translation = botLanguages[index].name;
            player.save().then(() => {
              sendAlertMessage(message.channel, `Translation has been set to \`${botLanguages[index].name}\`.`, 'success');
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
