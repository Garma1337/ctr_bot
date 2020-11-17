module.exports = {
  name: 'find_id',
  description: 'Find member by id.',
  args: false,
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  async execute(message) {
    let rows = message.content.split(/\s/);
    rows = rows.slice(1);

    const out = [];
    for (const id of rows) {
      const user = await message.client.users.fetch(id);

      if (!user) {
        out.push(`Couldn't find \`${id}\``);
      }

      out.push(`${user.id} ${user.tag}`);
    }

    message.channel.send(out.join('\n'));
  },
};
