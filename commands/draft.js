const Discord = require('discord.js');
const createDraft = require('../utils/createDraft');

module.exports = {
  name: 'draft',
  description: `Generate draft links
\`!draft
Team A: @CaptainA
Team B: @CaptainB\``,
  guildOnly: true,
  cooldown: 10,
  execute(message) {
    const wrongSyntax = `Wrong command usage. Example:
\`!draft
Team A: @CaptainA
Team B: @CaptainB\``;
    const { mentions } = message;

    const rows = message.content.split('\n');
    rows.shift();

    if (rows.length !== 2) {
      return message.channel.send(wrongSyntax);
    }

    if (mentions.users.size !== 2) {
      return message.channel.send('You should mention two team captains');
    }

    if (!message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])
      && !mentions.users.map((m) => m.id).includes(message.author.id)) {
      return message.channel.send('You should be a captain of one of the teams');
    }

    const teams = [];
    const captainUsers = mentions.users.array();

    const captainMemberPromises = captainUsers.map((c) => message.guild.members.fetch(c));

    Promise.all(captainMemberPromises).then((captains) => {
      rows.every((row) => {
        const data = row.split(':');
        if (data.length !== 2) {
          message.channel.send(wrongSyntax);
          return false;
        }
        const mention = data[1];
        if (!mention.match(Discord.MessageMentions.USERS_PATTERN)) {
          return message.channel.send(wrongSyntax);
        }
        const name = data[0].trim();
        teams.push(name);
        return true;
      });

      return message.channel.send(`Select draft mode. Waiting 1 minute.
\`\`\`
0 - Classic - 6 Bans, 10 Picks
1 - League  - 6 Bans,  8 Picks
2 - Light   - 4 Bans,  6 Picks
3 - No Ban  - 0 Bans, 10 Picks
\`\`\``).then((confirmMessage) => {
        message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
          .then((collected) => {
            const collectedMessage = collected.first();
            const { content } = collectedMessage;
            collectedMessage.delete();
            if (['0', '1', '2', '3'].includes(content)) {
              createDraft(message.channel, content, teams, captains);
            } else {
              throw new Error('cancel');
            }
          })
          .catch(() => confirmMessage.edit('Command cancelled.'));
      });
    }).catch((error) => {
      throw error;
    });
  },
};
