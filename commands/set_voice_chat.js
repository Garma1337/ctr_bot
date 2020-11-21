const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');

module.exports = {
  name: 'set_voice_chat',
  description: 'Set your voice chat options.',
  guildOnly: true,
  aliases: ['set_vc'],
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
          message.channel.send('Your voice chat options have been unset.');
        }).catch((error) => {
          message.channel.send(`Unable to update player. Error: ${error}`);
        });
      });
    }

    const voiceChats = [
      'Discord',
      'PS4',
      'Discord & PS4',
    ];

    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    return message.channel.send(`Select voice chat option. Waiting 1 minute.
\`\`\`
1 - Discord
2 - PS4
3 - Discord & PS4
\`\`\``).then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };

      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        if (['1', '2', '3'].includes(content)) {
          const index = Number(content) - 1;

          Player.findOne({ discordId: user.id }).then((player) => {
            if (!player) {
              player = new Player();
              player.discordId = user.id;
            }

            if (index === 0) {
              player.discordVc = true;
              player.ps4Vc = null;
            }

            if (index === 1) {
              player.discordVc = null;
              player.ps4Vc = true;
            }

            if (index === 2) {
              player.discordVc = true;
              player.ps4Vc = true;
            }

            player.save().then(() => {
              message.channel.send(`Your voice chat options have been set to "${voiceChats[index]}".`);
            }).catch((error) => {
              message.channel.send(`Unable to update player. Error: ${error}`);
            });
          });
        } else {
          message.channel.send('Command canceled.');
        }
      }).catch(() => message.channel.send('Command canceled.'));
    });
  },
};
