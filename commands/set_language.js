const { Player } = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { serverLanguages } = require('../db/serverLanguages');

module.exports = {
  name: 'set_languages',
  description: 'Set your languages.',
  guildOnly: true,
  aliases: ['set_language', 'language_set'],
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

    const languageList = serverLanguages.map((l) => `${l.emote} - ${l.name}`);
    const column1 = languageList.slice(0, 10);
    const column2 = languageList.slice(10, 20);
    const column3 = languageList.slice(20, 30);

    const embed = {
      author: {
        name: 'You can specify a list of flags when using the command',
      },
      fields: [
        {
          name: 'Languages',
          value: column1.join('\n'),
          inline: true,
        },
        {
          name: '\u200B',
          value: column2.join('\n'),
          inline: true,
        },
        {
          name: '\u200B',
          value: column3.join('\n'),
          inline: true,
        },
      ],
    };

    if (args.length <= 0) {
      return message.channel.send({ embed });
    }

    const emotes = [];

    for (const i in args) {
      const language = serverLanguages.find((l) => l.char === args[i]);

      if (!language) {
        return sendAlertMessage(message.channel, `${args[i]} is not a valid language flag.`, 'warning');
      }

      emotes.push(language.emote);
    }

    Player.findOne({ discordId: message.author.id }).then((player) => {
      if (!player) {
        player = new Player();
        player.discordId = message.author.id;
      }

      player.languages = emotes;
      player.save().then(() => {
        sendAlertMessage(message.channel, `Your languages have been set to ${args.join(', ')}.`, 'success');
      }).catch((error) => {
        sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
      });
    });
  },
};
