const Player = require('../db/models/player');
const isStaffMember = require('../utils/isStaffMember');

module.exports = {
  name: 'set_nat',
  description: 'Set your NAT type.',
  guildOnly: true,
  execute(message, args) {
    const natTypes = [
      'NAT 1',
      'NAT 2 Open',
      'NAT 2 Closed',
      'NAT 3',
    ];

    const isStaff = isStaffMember(message.member);

    let user;

    if (isStaff && args.length === 1) {
      user = message.mentions.users.first();
    } else {
      user = message.author;
    }

    return message.channel.send(`Select NAT type. Waiting 1 minute.
\`\`\`
1 - NAT 1
2 - NAT 2 Open
3 - NAT 2 Closed
4 - NAT 3
\`\`\``).then((confirmMessage) => {
      const filter = (m) => m.author.id === message.author.id;
      const options = { max: 1, time: 60000, errors: ['time'] };
      message.channel.awaitMessages(filter, options).then((collectedMessages) => {
        const collectedMessage = collectedMessages.first();
        const { content } = collectedMessage;

        confirmMessage.delete();
        collectedMessage.delete();

        if (['1', '2', '3', '4'].includes(content)) {
          const index = Number(content) - 1;

          Player.updateOne({ discordId: user.id }, { nat: natTypes[index] }).exec();
          message.channel.send(`NAT type has been set to \`${natTypes[index]}\`.`);
        } else {
          message.channel.send('Command canceled.');
        }
      }).catch(() => message.channel.send('Command canceled.'));
    });
  },
};
