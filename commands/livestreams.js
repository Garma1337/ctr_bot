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
      return message.channel.send('There are currently no CTR livestreams.');
    }

    const format = (l) => {
      let out = `<@!${l.userId}> is streaming \`${l.title}\`.`;
      out += '\n';
      out += `Watch live at <${l.url}>!`;

      return out;
    };

    message.channel.send('Generating stream list ...').then((m) => {
      /* No pings */
      m.edit(liveStreams.map(format).join('\n\n'));
    });

    return true;
  },
};
