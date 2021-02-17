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

    placeholder = { embed: output };
    content = { embed: output };
  } else {
    placeholder = '...';
    content = getText({
      heading: options.textOptions.heading,
      elements: pagination.elements,
      currentPage: pagination.currentPage,
      numPages: pagination.numPages,
    });
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
 *  reactionCollectorOptions: {
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
  options.reactionCollectorOptions = options.reactionCollectorOptions || { time: 3600000 };

  let currentPage = 1;
  let pagination = createPagination(options.elements, 1, options.elementsPerPage);
  let messageContent = getMessageContent(options, pagination);

  channel.send(messageContent.placeholder).then((message) => {
    if (options.outputType === 'text') {
      message.edit(messageContent.content);
    }

    if (pagination.numPages > 1) {
      message.react(options.emojiPrevious);
      message.react(options.emojiNext);

      // eslint-disable-next-line max-len
      const reactionCollectorFilter = (reaction, user) => ([options.emojiPrevious, options.emojiNext].includes(reaction.emoji.name) && user.id !== message.author.id && user.id === userId);
      const reactionCollectorOptions = {
        time: options.reactionCollectorOptions.time,
        errors: ['time'],
        dispose: true,
      };

      // eslint-disable-next-line max-len
      const reactionCollector = message.createReactionCollector(reactionCollectorFilter, reactionCollectorOptions);
      reactionCollector.on('collect', (reaction, user) => {
        if (reaction.message.id === message.id) {
          if (reaction.emoji.name === options.emojiPrevious) {
            currentPage -= 1;

            if (currentPage < 1) {
              currentPage = 1;
            }
          }

          if (reaction.emoji.name === options.emojiNext) {
            currentPage += 1;

            if (currentPage > pagination.numPages) {
              currentPage = pagination.numPages;
            }
          }

          pagination = createPagination(options.elements, currentPage, options.elementsPerPage);
          messageContent = getMessageContent(options, pagination);

          message.edit(messageContent.content);
        }

        reaction.users.remove(user).then();
      });
    }
  });
}

module.exports = createPageableContent;
