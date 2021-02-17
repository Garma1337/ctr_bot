const config = require('../config');
const createAndFindRole = require('../utils/createAndFindRole');
const findMember = require('../utils/findMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'verify',
  description: 'Ranked verification',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  args: true,
  usage: '[@tag]',
  aliases: ['ranked_verify'],
  // eslint-disable-next-line consistent-return
  async execute(message, args) {
    let member = message.mentions.members.first();
    if (!member) {
      try {
        member = await findMember(message.guild, args[0]);
      } catch (error) {
        return sendAlertMessage(message.channel, error.message, 'error');
      }
    }

    const DMCallback = (m) => {
      const logMessage = `Sent message to ${m.channel.recipient}:\n\`\`\`${m.content}\`\`\``;
      sendLogMessage(message.guild, logMessage);
    };

    const { guild } = message;
    const role = await createAndFindRole(guild, config.roles.ranked_verified_role);

    await member.roles.add(role);

    member.createDM().then((dm) => {
      dm.send(config.ranked_verification_dm).then((m) => {
        DMCallback(m);
      }).catch((error) => {
        sendAlertMessage(message.channel, error.message, 'error');
      });
    });

    sendAlertMessage(message.channel, `${member.toString()} has been verified.`, 'success');
  },
};
