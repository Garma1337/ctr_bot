module.exports = {
  name: 'create_tournament_channels',
  description: 'Creating tournament channels with roles.',
  args: true,
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  execute(message, args) {
    const { guild } = message;
    const category = guild.channels.cache.find((c) => c.name === 'Tournament Lobbies' && c.type === 'category');

    const outMessageRows = [];

    args.forEach((name) => {
      // eslint-disable-next-line no-param-reassign
      name = name.toLowerCase();
      outMessageRows.push(`Creating a role @${name}`);
      outMessageRows.push(`Creating a channel #${name}`);
      guild.roles.create({ data: { name } })
        .then((role) => {
          guild.channels.create(name, {
            type: 'text',
            parent: category,
          }).then(async (c) => {
            await c.lockPermissions();
            await c.createOverwrite(role, {
              VIEW_CHANNEL: true,
            });
            await role.edit({ mentionable: true });
          }).catch((e) => {
            message.channel.send(`\`${e.name}: ${e.message}\``);
          });
        }).catch((e) => {
          message.channel.send(`\`${e.name}: ${e.message}\``);
        });
    });

    message.channel.send(outMessageRows.join('\n'));
  },
};
