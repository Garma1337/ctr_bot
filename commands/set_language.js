const Player = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { serverLanguages } = require('../utils/serverLanguages');

module.exports = {
  name: 'set_languages',
  description: 'Set your languages.',
  guildOnly: true,
  aliases: ['set_language', 'language_set'],
  cooldown: 300,
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

    const emoteChars = [];
    const languageList = [];

    serverLanguages.forEach((l) => {
      emoteChars.push(l.char);
      languageList.push(`${l.emote} - ${l.name}`);
    });

    const column1 = languageList.slice(0, 10);
    const column2 = languageList.slice(10, 20);
    const column3 = languageList.slice(20, 30);

    const embed = {
      author: {
        name: 'React with the appropriate language flag!',
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

    return message.channel.send({ embed }).then((confirmMessage) => {
      const filter = (r, u) => emoteChars.includes(r.emoji.name) && u.id === message.author.id;
      const options = {
        max: serverLanguages.length,
        time: 300000,
        errors: ['time'],
        dispose: true,
      };

      const collector = confirmMessage.createReactionCollector(filter, options);
      collector.on('collect', (reaction) => {
        const language = serverLanguages.find((l) => l.char === reaction.emoji.name);

        if (language) {
          Player.findOne({ discordId: message.author.id }).then((player) => {
            if (!player) {
              player = new Player();
              player.discordId = message.author.id;
              player.languages = [];
            }

            const { languages } = player;

            if (!languages.includes(language.emote)) {
              languages.push(language.emote);
            }

            player.languages = languages;
            player.save().then(() => {
              sendAlertMessage(message.channel, `${language.name} has been added to your languages.`, 'success');
            }).catch((error) => {
              sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
            });
          });
        }
      });

      collector.on('remove', ((reaction) => {
        const language = serverLanguages.find((l) => l.char === reaction.emoji.name);

        if (language) {
          Player.findOne({ discordId: message.author.id }).then((player) => {
            const { languages } = player;

            if (languages.includes(language.emote)) {
              const index = languages.indexOf(language.emote);
              languages.splice(index, 1);
            }

            player.languages = languages;
            player.save();

            sendAlertMessage(message.channel, `${language.name} has been removed from your languages.`, 'success');
          });
        }
      }));
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
