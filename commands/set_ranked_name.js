const fs = require('fs');
const config = require('../config');
const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_ranked_name',
  description: 'Set your ranked name.',
  guildOnly: true,
  aliases: ['set_name'],
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    if (args[0] === 'unset') {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.rankedName = null;
        player.save().then(() => {
          sendAlertMessage(message.channel, 'Your ranked name has been unset.', 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });

      return;
    }

    const isStaff = isStaffMember(message.member);

    let name;
    let user;

    if (isStaff && args.length === 2) {
      user = message.mentions.users.first();
      name = args[1];
    } else {
      user = message.author;
      name = args[0];
    }

    if (!name) {
      // eslint-disable-next-line consistent-return
      return sendAlertMessage(message.channel, 'You need to enter the desired name.', 'warning');
    }

    if (name.length < 3) {
      // eslint-disable-next-line consistent-return
      return sendAlertMessage(message.channel, 'The ranked name needs to be at least 3 characters long.', 'warning');
    }

    if (!name.match(/^[0-9a-zA-Z_-]+$/gi)) {
      // eslint-disable-next-line consistent-return
      return sendAlertMessage(message.channel, 'The ranked name can only consist of numbers, letters, underscore and minus.', 'warning');
    }

    // eslint-disable-next-line consistent-return
    fs.readFile(config.files.badwords_file, 'utf8', (err, data) => {
      if (err) {
        throw err;
      }

      const violations = [];

      if (!isStaff) {
        const words = data.trim().split('\n');
        words.forEach((w) => {
          if (name.toLowerCase().includes(w.toLowerCase())) {
            violations.push(w);
          }
        });
      }

      if (violations.length > 0) {
        return sendAlertMessage(message.channel, `This name cannot be used due to using profanity. Violations: ${violations.join(', ')}`, 'warning');
      }

      // eslint-disable-next-line consistent-return
      Player.findOne({ rankedName: name }).then((player) => {
        if (player) {
          if (player.discordId === user.id) {
            return sendAlertMessage(message.channel, 'You have already set this ranked name.', 'warning');
          }

          return sendAlertMessage(message.channel, 'This ranked name is already used by someone else.', 'warning');
        }

        // eslint-disable-next-line no-shadow,consistent-return
        Player.findOne({ discordId: user.id }).then((player) => {
          if (player.rankedName && !isStaff) {
            return sendAlertMessage(message.channel, 'You cannot change your ranked name. Please message a staff member.', 'warning');
          }

          if (!player) {
            player = new Player();
            player.discordId = message.author.id;
          }

          player.rankedName = name;
          player.save().then(() => {
            if (user.id === message.author.id) {
              sendAlertMessage(message.channel, `Your ranked name has been set to "${name}".`, 'success');
            } else {
              sendAlertMessage(message.channel, `<@!${user.id}>'s ranked name has been set to "${name}".`, 'success');
            }
          }).catch((error) => {
            sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
          });
        });
      });
    });
  },
};
