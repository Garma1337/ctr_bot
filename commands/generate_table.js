const Discord = require('discord.js');
const drawTable = require('../utils/drawTable');
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
  execute(message, args) {
    const numOfRaces = Number(args[0]);

    const MAX_RACES = 30;
    if (numOfRaces > MAX_RACES) {
      message.reply(`too many races. Max is: ${MAX_RACES}`);
      return;
    }

    const rows = message.content.split('\n');
    rows.shift();

    if (!rows.length) {
      message.reply('you didn\'t provide list of teams');
      return;
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
      message.reply(error);
      return;
    }

    data = data.join('\n\n');
    const encodedData = encodeURI(data);
    const url = `https://gb.hlorenzi.com/table?data=${encodedData}`;

    console.log(url.length);
    if (url.length > 1700) {
      message.reply('template is too long.');
      return;
    }

    drawTable(data).then((attachment) => {
      message.channel.send({
        embed: {
          title: 'Table Generator',
          description: `You can use command \`!table\` and template to generate tables right in Discord.
\`\`\`${data}\`\`\`
[Open template on gb.hlorenzi.com](${url})`,
          color: 0xff0000,
          timestamp: new Date(),
          image: { url: `attachment://${attachment.name}` },
        },
        files: [attachment],
      }).then(() => {
        message.channel.stopTyping(true);
      }).catch((error) => {
        sendLogMessage(message.guild, error.message);
        message.channel.send(url);
        message.channel.send({ files: [attachment] });
      });
    });
    // message.channel.send(`<${url}>`);
  },
};
