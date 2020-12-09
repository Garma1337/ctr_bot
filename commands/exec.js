const util = require('util');
const config = require('../config');
const sendAlertMessage = require('../utils/sendAlertMessage');

/**
 * Cleans code from illegal characters
 * @param text
 * @returns string
 */
const clean = (text) => {
  if (typeof (text) === 'string') {
    return text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
  }

  return text;
};

module.exports = {
  name: 'exec',
  guildOnly: true,
  execute(message, args) {
    if (message.author.id !== config.owner) {
      return sendAlertMessage(message.channel, 'You cannot use this command.', 'warning');
    }

    if (args.length <= 0) {
      return sendAlertMessage(message.channel, 'Please enter the code you want to run.', 'warning');
    }

    const code = args.join(' ');
    try {
      let evaled = eval(code);

      if (typeof evaled !== 'string') {
        evaled = util.inspect(evaled);
      }

      let content = 'Code:';
      content += `\`\`\`js\n${code}\`\`\``;
      content += '\nResult:';
      content += `\`\`\`js\n${clean(evaled)}\`\`\``;

      return sendAlertMessage(message.channel, content, 'success');
    } catch (err) {
      let content = 'Code:';
      content += `\`\`\`js\n${code}\`\`\``;
      content += '\nError:';
      content += `\`\`\`js\n${clean(err)}\`\`\``;

      return sendAlertMessage(message.channel, content, 'error');
    }
  },
};
