const { MessageActionRow } = require('discord-buttons');

const TYPE_INFO = 'info';
const TYPE_SUCCESS = 'success';
const TYPE_WARNING = 'warning';
const TYPE_ERROR = 'error';

/**
 * Sends an alert message to a channel
 * @param channel
 * @param content
 * @param type
 * @param mentions
 * @param buttons
 * @returns null
 */
function sendAlertMessage(channel, content, type, mentions, buttons) {
  let pings = [];
  const buttonRow = new MessageActionRow();

  if (arguments.length >= 4 && mentions.length > 0) {
    pings = mentions.map((m) => `<@!${m}>`).join(', ');
  }

  if (arguments.length >= 5 && buttons.length > 0) {
    buttons.forEach((b) => {
      buttonRow.addComponent(b);
    });
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

  content = `\u200B\n${content}`;

  const embed = {
    color,
    fields: [
      {
        name: `${emote} ${heading}`,
        value: content,
      },
    ],
  };

  // Embed Field Values can only be up to 1024 characters
  if (content.length > 1024) {
    return channel.send({
      content: pings,
      files: [{
        attachment: Buffer.from(content, 'utf-8'),
        name: 'message.txt',
      }],
    }).then(() => {
      channel.send('The output was too big, therefore the message is attached as a text file.');
    });
  }

  if (buttonRow.components.length > 0) {
    return channel.send({
      content: pings,
      embed,
      components: [buttonRow],
    });
  }

  return channel.send({ content: pings, embed });
}

module.exports = sendAlertMessage;
