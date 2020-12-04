const TYPE_INFO = 'info';
const TYPE_SUCCESS = 'success';
const TYPE_WARNING = 'warning';
const TYPE_ERROR = 'error';

/**
 * Sends an alert message to a channel
 * @param channel
 * @param content
 * @param type
 * @param mentionedUsers
 * @returns null
 */
function sendAlertMessage(channel, content, type, mentionedUsers) {
  if (arguments.length < 4) {
    mentionedUsers = [];
  }

  const types = [
    TYPE_INFO,
    TYPE_SUCCESS,
    TYPE_WARNING,
    TYPE_ERROR,
  ];

  if (!types.includes(type)) {
    return channel.send('Invalid alert type.');
  }

  const colors = {
    [TYPE_INFO]: 3901635,
    [TYPE_SUCCESS]: 7844437,
    [TYPE_WARNING]: 16763981,
    [TYPE_ERROR]: 12458289,
  };

  const emotes = {
    [TYPE_INFO]: ':information_source:',
    [TYPE_SUCCESS]: ':white_check_mark:',
    [TYPE_WARNING]: ':warning:',
    [TYPE_ERROR]: ':no_entry:',
  };

  const headings = {
    [TYPE_INFO]: 'Info',
    [TYPE_SUCCESS]: 'Success!',
    [TYPE_WARNING]: 'Warning!',
    [TYPE_ERROR]: 'Error!',
  };

  const color = colors[type];
  const emote = emotes[type];
  const heading = headings[type];

  const embed = {
    color,
    fields: [
      {
        name: `${emote} ${heading}`,
        value: `\u200B\n${content}`,
      },
    ],
  };

  if (mentionedUsers.length <= 0) {
    return channel.send({ embed });
  }

  return channel.send({
    content: mentionedUsers.map((m) => `<@!${m}>`).join(', '),
    embed,
  });
}

module.exports = sendAlertMessage;
