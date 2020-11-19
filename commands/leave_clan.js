const Clan = require('../db/models/clans').default;

const executeAction = (message, clan) => {
  message.channel.send(`Are you sure you want to leave "${clan.shortName}"? (yes / no)`).then(() => {
    message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] }).then((collected) => {
      const { content } = collected.first();

      if (content.toLowerCase() === 'yes') {
        clan.removeMember(message.author.id);
        clan.save().then(() => {
          message.channel.send(`You left the clan "${clan.shortName}".`);
        });
      } else {
        throw new Error('cancel');
      }
    }).catch(() => { message.channel.send('Command cancelled.'); });
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
      Clan.find({ 'members.discordId': message.author.id }).then((docs) => {
        if (!docs.length) {
          return message.channel.send('You are not in any clan.');
        }

        if (docs.length > 1) {
          const clanNames = docs.map((d) => d.shortName).join(', ');
          return message.channel.send(`You in several teams (${clanNames}), you should specify which one you want to leave.`);
        }

        const clan = docs.shift();

        executeAction(message, clan);
      });
    } else {
      Clan.findOne({ shortName: clanName }).then((clan) => {
        if (!clan) {
          return message.channel.send(`There is no clan with the short name "${clanName}".`);
        }

        if (!clan.hasMember(message.author.id)) {
          return message.channel.send(`You are not a member of "${clanName}".`);
        }

        executeAction(message, clan);
      });
    }
  },
};
