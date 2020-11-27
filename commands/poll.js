/**
 * Returns the embed for the poll
 * @param userName
 * @param question
 * @param options
 * @returns {{author: {name: string}, fields: [{name: string, value: *}, {name: string, value: *}]}}
 */
function getEmbed(userName, question, options) {
  return {
    author: {
      name: `${userName} has created a poll!`,
    },
    fields: [
      {
        name: 'Question',
        value: question,
      },
      {
        name: 'Options',
        value: options.join('\n'),
      },
    ],
  };
}

module.exports = {
  name: 'poll',
  description: `Create a poll. Usage:
\`!poll [question]
[option 1]
[option 2]
...
\``,
  guildOnly: true,
  execute(message) {
    const wrongSyntax = `Wrong usage of command. Try 
\`!poll [question]
[option 1]
[option 2]
...
\``;

    const reactionEmojis = [
      '1️⃣',
      '2️⃣',
      '3️⃣',
      '4️⃣',
      '5️⃣',
      '6️⃣',
      '7️⃣',
      '8️⃣',
      '9️⃣',
    ];

    const lines = message.content.split('\n');
    const splittedFirstLine = lines[0].split(' ');
    splittedFirstLine.shift();
    const question = splittedFirstLine.join(' ');

    if (lines.length < 3 || question.length < 1) {
      return message.channel.send(wrongSyntax);
    }

    if (lines.length < 3) {
      return message.channel.send('You need to specify at least 2 options to choose from.');
    }

    if (lines.length > reactionEmojis.length) {
      return message.channel.send(`More than ${reactionEmojis.length} options are not supported.`);
    }

    lines.shift(); // remove command
    const modifiedLines = [];

    lines.forEach((l, i) => {
      modifiedLines.push(`${i + 1}. ${l}`);
    });

    const embed = getEmbed(message.member.user.username, question, modifiedLines);

    message.channel.send({ embed }).then((m) => {
      modifiedLines.forEach((l, i) => {
        const reactionEmoji = reactionEmojis[i];

        m.react(reactionEmoji);
      });
    });
  },
};
