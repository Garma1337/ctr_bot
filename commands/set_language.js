const Player = require('../db/models/player');
const { serverLanguages } = require('../utils/serverLanguages');

module.exports = {
  name: 'set_languages',
  description: 'Set your languages.',
  guildOnly: true,
  aliases: ['set_language', 'language_set'],
  cooldown: 60,
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.languages = [];
        player.save().then(() => {
          message.channel.send('Your languages have been unset.');
        }).catch((error) => {
          message.channel.send(`Unable to update player. Error: ${error}`);
        });
      });
    }

    return message.channel.send('Select your languages. Waiting 1 minute.').then((confirmMessage) => {
      const emoteChars = [];

      serverLanguages.forEach((l) => {
        emoteChars.push(l.char);
        confirmMessage.react(l.char);
      });

      const filter = (r, u) => emoteChars.includes(r.emoji.name) && u.id === message.author.id;
      const options = {
        max: serverLanguages.length,
        time: 60000,
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
              message.channel.send(`${language.name} has been added to your languages.`);
            }).catch((error) => {
              message.channel.send(`Unable to update player. Error: ${error}`);
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

            message.channel.send(`${language.name} has been removed from your languages.`);
          });
        }
      }));
    }).catch(() => message.channel.send('Command canceled.'));
  },
};
