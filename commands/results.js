const config = require('../config');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'results',
  description: 'Check for duplicate and missing results on Lorenzi.',
  guildOnly: true,
  aliases: ['unsubmitted_results', 'missing_results', 'duplicate_results'],
  execute(message, args) {
    if (!isStaffMember(message.member) && !message.member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_updater_role.toLowerCase())) {
      return sendAlertMessage(message.channel, 'You are not allowed to use this command.');
    }

    const limit = args[0] || 100;

    if (limit > 100) {
      return sendAlertMessage('You can check at most the latest 100 submissions.', 'warning');
    }

    const channel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_results_submissions_channel.toLowerCase());
    if (!channel) {
      return sendAlertMessage(message.channel, `The channel "${config.channels.ranked_results_submissions_channel}" does not exist.`);
    }

    channel.messages.fetch({ limit }).then((messages) => {
      const missingResults = [];
      const duplicates = [];

      messages.sort((a, b) => a.id - b.id).forEach((m) => {
        const reaction = m.reactions.cache.find((r) => r.emoji.name === '✅');
        if (!reaction) {
          missingResults.push(m.id);
        }

        messages.forEach((m2) => {
          if (m.id !== m2.id && m.content === m2.content && !duplicates.find((d) => [m.id, m2.id].includes(d[0]) && [m.id, m2.id].includes(d[1]))) {
            duplicates.push([
              m.id,
              m2.id,
            ]);
          }
        });
      });

      if (missingResults.length > 0) {
        const format = (m) => `https://discord.com/channels/${config.main_guild}/${channel.id}/${m}`;
        sendAlertMessage(message.channel, `There are ${missingResults.length} unsubmitted results within the last ${limit} submissions:\n\n${missingResults.map(format).join('\n')}`, 'warning');
      } else {
        sendAlertMessage(message.channel, 'There are no unsubmitted results. Good job!', 'success');
      }

      if (duplicates.length > 0) {
        const format = (d) => {
          const baseUrl = `https://discord.com/channels/${config.main_guild}/${channel.id}`;
          return `${baseUrl}/${d[0]} + ${baseUrl}/${d[1]}`;
        };

        sendAlertMessage(message.channel, `There are ${duplicates.length} duplicate results within the last ${limit} submissions:\n\n${duplicates.map(format).join('\n')}`, 'warning');
      } else {
        sendAlertMessage(message.channel, 'There are no duplicate results. Good job!', 'success');
      }
    });
  },
};
