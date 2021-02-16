const { Player } = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_flag',
  description: 'Set your country flag.',
  aliases: ['set_country'],
  execute(message, args) {
    const isStaff = isStaffMember(message.member);

    let countryFlag;
    let user;

    if (isStaff && args.length !== 1) {
      if (args.length === 2) {
        countryFlag = args[1];
        user = message.mentions.users.first();
      } else {
        return sendAlertMessage(message.channel, 'Nope.', 'warning');
      }
    } else if (args.length > 1) {
      return sendAlertMessage(message.channel, 'Nope.', 'warning');
    } else {
      countryFlag = args.shift();
      user = message.author;
    }

    message.guild.members.fetch(user).then((member) => {
      const discordId = member.user.id;

      const e = 'You should specify country flag. To see them all use the `!flags` command';
      if (!countryFlag) {
        return sendAlertMessage(message.channel, e, 'warning');
      }

      const { flags } = message.client;

      if (!flags.includes(countryFlag)) {
        return sendAlertMessage(message.channel, e, 'warning');
      }

      Player.findOne({ discordId }).then((doc) => {
        let promise;
        if (!doc) {
          const player = new Player();
          player.discordId = discordId;
          player.flag = countryFlag;
          promise = player.save();
        } else {
          if (!isStaff && doc.flag && doc.flag !== '🇺🇳') {
            return sendAlertMessage(message.channel, `You've already set your flag to ${doc.flag}. It cannot be changed.`, 'warning');
          }

          doc.flag = countryFlag;
          promise = doc.save();
        }

        promise.then(() => {
          sendAlertMessage(message.channel, `Flag has been set ${countryFlag}.`, 'success');
        });
      });
    });
  },
};
