const Discord = require('discord.js');
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
      // eslint-disable-next-line consistent-return
      return message.channel.send({ embed });
    }

    const emotes = [];

    // eslint-disable-next-line guard-for-in
    for (const i in args) {
      if (!args[i].match(Discord.MessageMentions.USERS_PATTERN)) {
        const language = serverLanguages.find((l) => l.char === args[i]);

        if (!language) {
          // eslint-disable-next-line consistent-return
          return sendAlertMessage(message.channel, `${args[i]} is not a valid language flag.`, 'warning');
        }

        emotes.push(language.emote);
      }
    }

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
    });
  },
};
