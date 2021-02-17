const Discord = require('discord.js');
const createDraft = require('../utils/createDraft');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'draft',
  description: `Generate draft links
\`!draft
Team A: @CaptainA
Team B: @CaptainB\``,
  guildOnly: true,
  cooldown: 10,
  // eslint-disable-next-line consistent-return
  execute(message) {
    const wrongSyntax = `Wrong command usage. Example:
\`!draft
Team A: @CaptainA
Team B: @CaptainB\``;
    const { mentions } = message;

    const rows = message.content.split('\n');
    rows.shift();

    if (rows.length !== 2) {
      return sendAlertMessage(message.channel, wrongSyntax, 'warning');
    }

    if (mentions.users.size !== 2) {
      return sendAlertMessage(message.channel, 'You should mention two team captains.', 'warning');
    }

    // eslint-disable-next-line max-len
    if (!isStaffMember(message.member) && !mentions.users.map((m) => m.id).includes(message.author.id)) {
      return sendAlertMessage(message.channel, 'You should be a captain of one of the teams.', 'warning');
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

      return sendAlertMessage(message.channel, `Select draft mode. Waiting 1 minute.
\`\`\`
0 - Classic - 6 Bans, 10 Picks
1 - League  - 6 Bans,  8 Picks
2 - Light   - 4 Bans,  6 Picks
3 - No Ban  - 0 Bans, 10 Picks
\`\`\``, 'info').then((confirmMessage) => {
        message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] }).then((collected) => {
          const collectedMessage = collected.first();
          const { content } = collectedMessage;
          collectedMessage.delete();

          if (['0', '1', '2', '3'].includes(content)) {
            confirmMessage.delete();

            createDraft(message.channel, content, teams, captains);
          } else {
            throw new Error('cancel');
          }
        }).catch(() => {
          confirmMessage.delete();

          sendAlertMessage(message.channel, 'Command cancelled.', 'error');
        });
      });
    }).catch((error) => {
      throw error;
    });
  },
};
