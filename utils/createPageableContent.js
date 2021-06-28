const {
  MessageButton,
  MessageActionRow,
} = require('discord-buttons');
const config = require('../config');
const createPagination = require('./createPagination');

/**
 * Returns the text output
 *
 * @param options
 * @returns {string}
 */
function getText(options) {
  return `**${options.heading}**
  
${options.elements.join('\n')}

> Page ${options.currentPage} of ${options.numPages}`;
}

/**
 * Returns the embed output
 *
 * Example for options:
 * {
 *   heading      : 'List of clans',
 *   elements     : clans,
 *   currentPage  : 1,
 *   numPages     : 10
 * }
 *
 * @param options
 * @returns {{footer: {text: string}, description: string, title: (*|string)}}
 */
function getEmbed(options) {
  options.heading = options.heading || 'Heading';
  options.elements = options.elements || ['No data'];
  options.currentPage = options.currentPage || 1;
  options.numPages = options.numPages || 1;
  options.image = options.image || null;

  const embed = {
    color: config.default_embed_color,
    author: {
      name: options.heading,
    },
    description: options.elements.join('\n'),
    timestamp: new Date(),
    footer: {
      text: `Page ${options.currentPage} of ${options.numPages}`,
    },
  };

  if (options.image) {
    embed.author.icon_url = options.image;
    embed.thumbnail = {
      url: options.image,
    };
  }

  return embed;
}

/**
 * Returns the content of the message that gets sent
 * @param options
 * @param pagination
 */
function getMessageContent(options, pagination) {
  const previousButton = new MessageButton()
    .setStyle('grey')
    .setLabel('Previous')
    .setEmoji(options.emojiPrevious)
    .setID('previous_page');

  const nextButton = new MessageButton()
    .setStyle('grey')
    .setLabel('Next')
    .setEmoji(options.emojiNext)
    .setID('next_page');

  const buttonRow = new MessageActionRow()
    .addComponent(previousButton)
    .addComponent(nextButton);

  let placeholder;
  let content;

  if (options.outputType === 'embed') {
    const output = getEmbed({
      heading: options.embedOptions.heading,
      image: options.embedOptions.image,
      elements: pagination.elements,
      currentPage: pagination.currentPage,
      numPages: pagination.numPages,
    });

    placeholder = {
      embed: output,
      components: [buttonRow],
    };

    content = {
      embed: output,
      components: [buttonRow],
    };
  } else {
    placeholder = {
      content: '...',
      components: [buttonRow],
    };

    const text = getText({
      heading: options.textOptions.heading,
      elements: pagination.elements,
      currentPage: pagination.currentPage,
      numPages: pagination.numPages,
    });

    content = {
      content: text,
      components: [buttonRow],
    };
  }

  return {
    placeholder,
    content,
  };
}

/**
 * Creates a paginable embed with a list of objects.
 * It currently only supports a list within one column.
 *
 * Example for options:
 * {
 *   outputType: 'text' or 'embed'
 *   elements: clans,
 *   elementsPerPage: 20,
 *   emojiPrevious: 'emoji',
 *   emojiNext: 'emoji',
 *   embedOptions: {
 *     fieldName: 'List of clans'
 *   },
 *  buttonCollectorOptions: {
 *    time: 10000
 *  }
 * }
 *
 * @param channel
 * @param userId
 * @param options
 */
function createPageableContent(channel, userId, options) {
  options.outputType = options.outputType || 'text';
  options.elements = options.elements || [];
  options.elementsPerPage = options.elementsPerPage || 10;
  options.emojiPrevious = options.emojiPrevious || '⬅️';
  options.emojiNext = options.emojiNext || '➡️';
  options.embedOptions = options.embedOptions || { heading: 'Heading', image: null };
  options.textOptions = options.textOptions || { heading: 'Heading' };
  options.buttonCollectorOptions = options.buttonCollectorOptions || { time: 3600000 };

  let currentPage = 1;
  let pagination = createPagination(options.elements, 1, options.elementsPerPage);
  let messageContent = getMessageContent(options, pagination);

  channel.send(messageContent.placeholder).then((message) => {
    if (options.outputType === 'text') {
      message.edit(messageContent.content);
    }

    if (pagination.numPages > 1) {
      // eslint-disable-next-line max-len
      const buttonCollectorFilter = (button) => button.clicker.user.id !== message.author.id && button.clicker.user.id === userId;
      const buttonCollectorOptions = {
        time: options.buttonCollectorOptions.time,
        errors: ['time'],
        dispose: true,
      };

      // eslint-disable-next-line max-len
      const buttonCollector = message.createButtonCollector(buttonCollectorFilter, buttonCollectorOptions);
      buttonCollector.on('collect', (button) => {
        if (button.message.id === message.id) {
          if (button.id === 'previous_page') {
            currentPage -= 1;

            if (currentPage < 1) {
              currentPage = 1;
            }
          }

          if (button.id === 'next_page') {
            currentPage += 1;

            if (currentPage > pagination.numPages) {
              currentPage = pagination.numPages;
            }
          }

          pagination = createPagination(options.elements, currentPage, options.elementsPerPage);
          messageContent = getMessageContent(options, pagination);

          message.edit(messageContent.content);
        }

        button.reply.defer();
      });
    }
  });
}

module.exports = createPageableContent;
