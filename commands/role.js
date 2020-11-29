const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'role',
  description: 'Add role to members.',
  args: true,
  usage: '<role> [remove]\n<users>',
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  execute(message, args) {
    let roleName = args.join(' ');
    let remove = false;
    if (args[0] === 'remove') {
      remove = true;
      roleName = args.slice(1).join(' ');
    }
    const role = message.guild.roles.cache.find((r) => r.name === roleName);

    async function addRole(member) {
      const userTag = member.user.tag;
      if (!member.roles.cache.some((r) => r.name === roleName)) {
        await member.roles.add(role);
        return `Added role ${role} to \`${userTag}\``;
      }

      return `\`${userTag}\` already has a role ${role}`;
    }

    async function removeRole(member) {
      const userTag = member.user.tag;
      if (!member.roles.cache.some((r) => r.name === roleName)) {
        return `\`${userTag}\` doesn't have a role ${role}`;
      }

      await member.roles.remove(role);
      return `Removed role ${role} fom \`${userTag}\``;
    }

    if (!role) {
      return sendAlertMessage(message.channel, `Role ${roleName} not found!`, 'warning');
    }

    let rows = message.content.split('\n');
    rows = rows.slice(1);

    sendAlertMessage(message.channel, '...', 'info').then((m) => {
      message.guild.members.fetch().then(async (members) => {
        const out = [];
        // noinspection LoopStatementThatDoesntLoopJS
        for (const q of rows) {
          const member = members.find((m) => m.user.tag === q || m.user.id === q);

          if (!member) {
            out.push(`Couldn't find \`${q}\``);
            // eslint-disable-next-line no-continue
            continue;
          }

          let result;
          if (remove) {
            result = await removeRole(member);
          }

          result = await addRole(member);
          out.push(result);
        }

        m.delete();

        const outMessage = out.join('\n');
        if (outMessage.length <= 2000) {
          return sendAlertMessage(message.channel, outMessage, 'success');
        }

        return message.channel.send({
          files: [{
            attachment: Buffer.from(outMessage, 'utf-8'),
            name: 'log.txt',
          }],
        });
      });
    });
  },
};
