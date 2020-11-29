const TYPE_INFO = 'info';
const TYPE_SUCCESS = 'success';
const TYPE_WARNING = 'warning';
const TYPE_ERROR = 'error';

/**
 * Sends an alert message to a channel
 * @param channel
 * @param content
 * @param type
 * @returns null
 */
function sendAlertMessage(channel, content, type) {
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
    [TYPE_INFO]: 4242687,
    [TYPE_SUCCESS]: 7012160,
    [TYPE_WARNING]: 16770880,
    [TYPE_ERROR]: 16728131,
  };

  const emotes = {
    [TYPE_INFO]: ':speech_balloon:',
    [TYPE_SUCCESS]: ':white_check_mark:',
    [TYPE_WARNING]: ':warning:',
    [TYPE_ERROR]: ':no_entry:',
  };

  const headings = {
    [TYPE_INFO]: 'Info',
    [TYPE_SUCCESS]: 'Success!',
    [TYPE_WARNING]: 'Warning!',
    [TYPE_ERROR]: 'An error occured!',
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

  return channel.send({ embed });
}

module.exports = sendAlertMessage;
