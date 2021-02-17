const findMember = require('../utils/findMember');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'dm',
  description: 'dm',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  args: true,
  usage: '[@tag] [message]',
  // eslint-disable-next-line consistent-return
  async execute(message, args) {
    let member = message.mentions.users.first();
    if (!member) {
      try {
        member = await findMember(message.guild, args[0]);
      } catch (error) {
        return sendAlertMessage(message.channel, error.message, 'error');
      }
    }

    const post = message.content.split(' ').slice(2).join(' ');
    const attachment = message.attachments.first();
    const attachments = [];
    if (attachment) {
      attachments.push(attachment.url);
    }

    const DMCallback = (m) => {
      const logMessage = `Sent message to ${m.channel.recipient}:\n\`\`\`${m.content}\`\`\``;
      sendLogMessage(message.guild, logMessage);
    };

    member.createDM().then((dm) => {
      dm.send(post, { files: attachments }).then((m) => {
        DMCallback(m);
        sendAlertMessage(message.channel, `Message has been sent to ${member.toString()}.`, 'success');
      }).catch((error) => {
        sendAlertMessage(message.channel, error.message, 'error');
      });
    });
  },
};
