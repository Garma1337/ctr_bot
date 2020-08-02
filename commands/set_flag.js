const Player = require('../db/models/player');

module.exports = {
  name: 'set_flag',
  description: 'Set your country flag.',
  aliases: ['set_country'],
  execute(message, args) {
    const isStaff = message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

    let countryFlag;
    let user;

    if (isStaff && args.length !== 1) {
      if (args.length === 2) {
        countryFlag = args[1];
        // eslint-disable-next-line prefer-destructuring
        user = message.mentions.users.first();
      } else {
        return message.channel.send('Nope.');
      }
    } else if (args.length > 1) {
      return message.channel.send('Nope.');
    } else {
      countryFlag = args.shift();
      user = message.author;
    }

    message.guild.members.fetch(user).then((member) => {
      const discordId = member.user.id;

      const e = 'You should specify country flag. To see them all use !flags command';
      if (!countryFlag) {
        return message.channel.send(e);
      }

      const { flags } = message.client;

      if (!flags.includes(countryFlag)) {
        return message.channel.send(e);
      }

      Player.findOne({ discordId }).then((doc) => {
        let promise;
        if (!doc) {
          const player = new Player();
          player.discordId = discordId;
          player.flag = countryFlag;
          promise = player.save();
        } else {
          if (!isStaff && doc.flag) {
            return message.channel.send(`You've already set your flag to ${doc.flag}. It cannot be changed.`);
          }
          // eslint-disable-next-line no-param-reassign
          doc.flag = countryFlag;
          promise = doc.save();
        }

        promise.then(() => {
          message.channel.send(`Flag has been set ${countryFlag}`);
        });
      });
    });
  },
};
