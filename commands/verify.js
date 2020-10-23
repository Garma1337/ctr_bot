const findMember = require('../utils/findMember');
const sendLogMessage = require('../utils/sendLogMessage');
const config = require('../config');

module.exports = {
  name: 'verify',
  description: 'Ranked verification',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  args: true,
  usage: '[@tag]',
  aliases: ['ranked_verify'],
  async execute(message, args) {
    let member = message.mentions.members.first();
    if (!member) {
      try {
        member = await findMember(message.guild, args[0]);
      } catch (error) {
        return message.channel.send(error.message);
      }
    }

    const DMCallback = (m) => {
      const logMessage = `Sent message to ${m.channel.recipient}:\n\`\`\`${m.content}\`\`\``;
      sendLogMessage(message.guild, logMessage);
    };

    const { guild } = message;
    const roleName = 'ranked verified';
    let role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
    if (!role) {
      role = await guild.roles.create({
        data: { name: roleName, mentionable: true },
        reason: `imagine not having ${roleName} role smh`,
      });
    }

    await member.roles.add(role);

    member.createDM().then((dm) => {
      dm.send(config.ranked_verification_dm)
        .then((m) => {
          DMCallback(m);
        })
        .catch((error) => {
          message.channel.send(error.message);
        });
    });

    message.channel.send(`${member.toString()} has been verified.`);
  },
};
