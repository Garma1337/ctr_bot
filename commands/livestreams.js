const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'livestreams',
  guildOnly: true,
  cooldown: 30,
  execute(message) {
    const members = message.channel.guild.members.cache;
    const liveStreams = [];

    members.forEach((m) => {
      const userId = m.user.id;
      const presence = m.guild.presences.cache.find((p, i) => i === userId);

      if (!presence) {
        return;
      }

      presence.activities.forEach((a) => {
        if (a.type === 'STREAMING' && a.state.match(/crash team/gi)) {
          liveStreams.push({
            userId,
            url: a.url,
            title: a.details,
            game: a.state,
          });
        }
      });
    });

    if (liveStreams.length <= 0) {
      return sendAlertMessage(message.channel, 'There are currently no CTR livestreams.', 'info');
    }

    const format = (l) => `<@!${l.userId}> is now streaming \`${l.title}\`\nWatch their stream live at <${l.url}>`;

    sendAlertMessage(message.channel, 'Generating stream list ...', 'info').then((m) => {
      m.delete();

      sendAlertMessage(message.channel, liveStreams.map(format).join('\n\n'), 'success');
    });

    return true;
  },
};
