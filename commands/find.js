const findMember = require('../utils/findMember');

module.exports = {
  name: 'find',
  description: 'Find member by tag.',
  args: false,
  guildOnly: true,
  permissions: ['MANAGE_ROLES'],
  execute(message, args) {
    findMember(message.guild, args[0]).then((m) => {
      if (m) {
        message.channel.send(m.toString());
      } else {
        message.channel.send('Not found');
      }
    });
  },
};
