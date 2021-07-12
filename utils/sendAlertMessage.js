const { MessageActionRow } = require('discord-buttons');
const config = require('../config');

const TYPE_PLAIN = 'plain';
const TYPE_PRIMARY = 'primary';
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
 * @param menus
 * @returns null
 */
function sendAlertMessage(channel, content, type, mentions, buttons, menus) {
  let messageOptions = {};
  let pings = [];
  const buttonRow = new MessageActionRow();

  if (arguments.length >= 4 && mentions.length > 0) {
    pings = mentions.map((m) => `<@!${m}>`);
  }

  if (arguments.length >= 5 && buttons.length > 0) {
    buttons.forEach((b) => {
      buttonRow.addComponent(b);
    });
  }

  if (arguments.length < 6) {
    menus = [];
  }

  const types = [
    TYPE_PLAIN,
    TYPE_PRIMARY,
    TYPE_INFO,
    TYPE_SUCCESS,
    TYPE_WARNING,
    TYPE_ERROR,
  ];

  if (!types.includes(type)) {
    return channel.send('Invalid alert type.');
  }

  const colors = {
    [TYPE_PLAIN]: 0,
    [TYPE_PRIMARY]: config.default_embed_color,
    [TYPE_INFO]: 3901635,
    [TYPE_SUCCESS]: 7844437,
    [TYPE_WARNING]: 16763981,
    [TYPE_ERROR]: 12458289,
  };

  const emotes = {
    [TYPE_PLAIN]: ':grey_exclamation:',
    [TYPE_PRIMARY]: ':bookmark_tabs:',
    [TYPE_INFO]: ':information_source:',
    [TYPE_SUCCESS]: ':white_check_mark:',
    [TYPE_WARNING]: ':warning:',
    [TYPE_ERROR]: ':no_entry:',
  };

  const headings = {
    [TYPE_PLAIN]: 'Text',
    [TYPE_PRIMARY]: 'Alert',
    [TYPE_INFO]: 'Info',
    [TYPE_SUCCESS]: 'Success!',
    [TYPE_WARNING]: 'Warning!',
    [TYPE_ERROR]: 'Error!',
  };

  const color = colors[type];
  const emote = emotes[type];
  const heading = headings[type];

  if (type !== TYPE_PLAIN) {
    content = `\u200B\n${content}`;
  }

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
    messageOptions = {
      content: pings.join(', '),
      files: [{
        attachment: Buffer.from(content, 'utf-8'),
        name: 'message.txt',
      }],
    };

    return channel.send(messageOptions).then(() => {
      channel.send('The output was too big, therefore the message is attached as a text file.');
    });
  }

  if (type === TYPE_PLAIN) {
    if (pings.length > 0) {
      messageOptions.content = `${pings.join(', ')}\n${content}`;
    } else {
      messageOptions.content = content;
    }
  } else {
    messageOptions.content = pings.join(', ');
    messageOptions.embed = embed;
  }

  if (buttonRow.components.length > 0) {
    messageOptions.components = [buttonRow];
  }

  if (menus.length > 0) {
    messageOptions.menus = menus;
  }

  return channel.send(messageOptions);
}

module.exports = sendAlertMessage;
