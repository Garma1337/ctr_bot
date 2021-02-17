const { Clan } = require('../db/models/clan');
const sendAlertMessage = require('../utils/sendAlertMessage');

const executeAction = (message, clan) => {
  sendAlertMessage(message.channel, `Are you sure you want to leave "${clan.shortName}"? (yes / no)`, 'info').then(() => {
    message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] }).then((collected) => {
      const { content } = collected.first();

      if (content.toLowerCase() === 'yes') {
        clan.removeMember(message.author.id);
        clan.save().then(() => {
          sendAlertMessage(message.channel, `You left the clan "${clan.shortName}".`, 'success');
        });
      } else {
        throw new Error('cancel');
      }
    }).catch(() => { sendAlertMessage(message.channel, 'Command cancelled.', 'error'); });
  });
};

module.exports = {
  name: 'leave_clan',
  aliases: ['leave_team', 'clan_leave'],
  description: 'Allows you to leave your clan.',
  guildOnly: true,
  execute(message, args) {
    const clanName = args.shift();

    if (!clanName) {
      // eslint-disable-next-line consistent-return
      Clan.find({ 'members.discordId': message.author.id }).then((docs) => {
        if (!docs.length) {
          return sendAlertMessage(message.channel, 'You are not in any clan.', 'warning');
        }

        if (docs.length > 1) {
          const clanNames = docs.map((d) => d.shortName).join(', ');
          return sendAlertMessage(message.channel, `You in several teams (${clanNames}), you should specify which one you want to leave.`, 'warning');
        }

        const clan = docs.shift();

        executeAction(message, clan);
      });
    } else {
      // eslint-disable-next-line consistent-return
      Clan.findOne({ shortName: clanName }).then((clan) => {
        if (!clan) {
          return sendAlertMessage(message.channel, `There is no clan with the short name "${clanName}".`, 'warning');
        }

        if (!clan.hasMember(message.author.id)) {
          return sendAlertMessage(message.channel, `You are not a member of "${clanName}".`, 'warning');
        }

        executeAction(message, clan);
      });
    }
  },
};
