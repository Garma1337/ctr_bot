const config = require('../config');
const drawTable = require('../utils/drawTable');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');

module.exports = {
  name: 'generate_table',
  description: `Generate points table.
\`!generate_table N
Team1: p1,p2,p3
Team2: p1,p2,p3
...\``,
  args: true,
  guildOnly: true,
  cooldown: 10,
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    const numOfRaces = Number(args[0]);

    const MAX_RACES = 30;
    if (numOfRaces > MAX_RACES) {
      return sendAlertMessage(message.channel, `Too many races. Max is: ${MAX_RACES}`, 'warning');
    }

    const rows = message.content.split('\n');
    rows.shift();

    if (!rows.length) {
      return sendAlertMessage(message.channel, 'You didn\'t provide a list of teams.', 'warning');
    }

    let data = [];
    let error = null;
    const result = rows.every((row) => {
      let [teamName, players] = row.split(':');
      if (!players) {
        error = `There is no players in the team ${teamName}`;
        return false;
      }

      teamName = teamName.trim();
      const abbreviation = teamName.split(/ +/).map((word) => (word ? word[0] : '')).join('');

      players = players.split(',').map((player) => player.trim());
      players = players.map((player) => `${player} ${Array(numOfRaces).fill('0').join('|')}`).join('\n');

      data.push(`${abbreviation} - ${teamName}\n${players}`);
      return true;
    });

    if (!result) {
      return sendAlertMessage(message.channel, error, 'error');
    }

    data = data.join('\n\n');
    const encodedData = encodeURI(data);
    const url = `https://gb.hlorenzi.com/table?data=${encodedData}`;

    if (url.length > 1700) {
      return sendAlertMessage(message.channel, 'The template is too long.', 'warning');
    }

    drawTable(data).then((attachment) => {
      message.channel.send({
        embed: {
          title: 'Table Generator',
          description: `You can use command \`!table\` and template to generate tables right in Discord.
\`\`\`${data}\`\`\`
[Open template on gb.hlorenzi.com](${url})`,
          color: config.default_embed_color,
          timestamp: new Date(),
          image: { url: `attachment://${attachment.name}` },
        },
        files: [attachment],
      }).then(() => {
        message.channel.stopTyping(true);
        // eslint-disable-next-line no-shadow
      }).catch((error) => {
        sendLogMessage(message.guild, error.message);

        message.channel.send(url);
        message.channel.send({ files: [attachment] });
      });
    });
  },
};
