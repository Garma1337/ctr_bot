module.exports = {
  name: 'members',
  description: 'Get the list of all members',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message) {
    const head = ['id', 'username#tag'];
    const headRow = `${head.join(',')}\n`;

    const out = message.guild.members.cache.map((member) => {
      const row = [member.id, member.user.tag];
      return row.join(',');
    });

    const txt = headRow + out.join('\n');

    const count = message.guild.memberCount;
    let poggers = message.client.emojis.cache.find((e) => e.name === 'poggers');
    poggers = poggers ? ` ${poggers}` : '';
    const msg = `${count} members${poggers}`;
    message.reply(msg, {
      files: [{
        attachment: Buffer.from(txt, 'utf-8'),
        name: 'members.csv',
      }],
    });
  },
};
