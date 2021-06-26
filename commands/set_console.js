const config = require('../config');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { consoles } = require('../db/consoles');

module.exports = {
  name: 'set_console',
  description: 'Set your consoles.',
  guildOnly: true,
  aliases: ['set_consoles', 'console_set'],
  cooldown: 30,
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.consoles = [];
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your consoles have been unset.', 'success');
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

    const emoteChars = consoles.map((c) => c.emote);
    const consoleList = consoles.map((c) => `${c.emote} - ${c.name}`);

    const embed = {
      color: config.default_embed_color,
      author: {
        name: 'React with the appropriate console emote!',
      },
      fields: [
        {
          name: 'Consoles',
          value: consoleList.join('\n'),
        },
      ],
    };

    // eslint-disable-next-line consistent-return
    return message.channel.send({ embed }).then((confirmMessage) => {
      emoteChars.forEach((e) => {
        confirmMessage.react(e);
      });

      const filter = (r, u) => emoteChars.includes(r.emoji.name) && u.id === message.author.id;
      const options = {
        max: consoles.length,
        time: 60000,
        errors: ['time'],
        dispose: true,
      };

      const collector = confirmMessage.createReactionCollector(filter, options);
      collector.on('collect', (reaction) => {
        const console = consoles.find((c) => c.emote === reaction.emoji.name);

        if (console) {
          Player.findOne({ discordId: user.id }).then((player) => {
            if (!player) {
              player = new Player();
              player.discordId = user.id;
              player.consoles = [];
            }

            const playerConsoles = player.consoles;

            if (!playerConsoles.includes(console.tag)) {
              playerConsoles.push(console.tag);
            }

            player.consoles = playerConsoles;
            player.save().then(() => {
              if (user.id === message.author.id) {
                sendAlertMessage(message.channel, `${console.name} has been added to your consoles.`, 'success');
              } else {
                sendAlertMessage(message.channel, `${console.name} has been added to <@!${user.id}>'s consoles.`, 'success');
              }
            }).catch((error) => {
              sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
            });
          });
        }
      });

      collector.on('remove', ((reaction) => {
        const console = consoles.find((c) => c.emote === reaction.emoji.name);

        if (console) {
          Player.findOne({ discordId: user.id }).then((player) => {
            const playerConsoles = player.consoles;

            if (playerConsoles.includes(console.tag)) {
              const index = playerConsoles.indexOf(console.tag);
              playerConsoles.splice(index, 1);
            }

            player.consoles = playerConsoles;
            player.save();

            if (user.id === message.author.id) {
              sendAlertMessage(message.channel, `${console.name} has been removed from your consoles.`, 'success');
            } else {
              sendAlertMessage(message.channel, `${console.name} has been remove from <@!${user.id}>'s consoles.`, 'success');
            }
          });
        }
      }));
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  },
};
