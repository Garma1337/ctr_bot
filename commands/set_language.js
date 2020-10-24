const Player = require('../db/models/player');
const { serverLanguages } = require('../utils/serverLanguages');

module.exports = {
  name: 'set_languages',
  description: 'Set your languages.',
  guildOnly: true,
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.updateOne({ discordId: message.author.id }, { languages: [] }).exec();
      return message.channel.send('Your languages have been unset.');
    }

    return message.channel.send('Select your languages. Waiting 1 minute.').then((confirmMessage) => {
      const emoteChars = [];

      serverLanguages.forEach((l, i) => {
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
            const { languages } = player;

            if (!languages.includes(language.emote)) {
              languages.push(language.emote);
            }

            player.languages = languages;
            player.save();

            message.channel.send(`${language.name} has been added to your languages.`);
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
