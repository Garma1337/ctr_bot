const moment = require('moment');
const config = require('../config');
const { Duo } = require('../db/models/duo');
const { Team } = require('../db/models/team');

/**
 * Returns the embed
 * @param duos
 * @param teams
 * @return object
 */
function getEmbed(duos, teams) {
  const mapTeam = (team) => {
    const players = team.players.map((p) => `<@!${p}>`);
    let out = players.join(' + ');
    out += ` (created ${moment(team.date).fromNow()})`;

    return out;
  };

  let duoList = ['-'];
  if (duos.length >= 1) {
    duoList = duos.map((duo) => `<@!${duo.discord1}> + <@!${duo.discord2}> (created ${moment(duo.date).fromNow()})`);
  }

  const trios = teams.filter((team) => team.players.length === 3);
  let trioList = ['-'];
  if (trios.length > 0) {
    trioList = trios.map(mapTeam);
  }

  const quads = teams.filter((team) => team.players.length === 4);
  let quadList = ['-'];
  if (quads.length > 0) {
    quadList = quads.map(mapTeam);
  }

  return {
    color: config.default_embed_color,
    timestamp: new Date(),
    author: {
      name: 'Ranked Teams List',
    },
    thumbnail: {
      url: 'https://static.wikia.nocookie.net/crashban/images/5/55/CTRNF-AkuUkaVeloSparxApo.png',
    },
    fields: [
      {
        name: 'Duos',
        value: duoList.join('\n'),
      },
      {
        name: '3 vs. 3',
        value: trioList.join('\n'),
      },
      {
        name: '4 vs. 4',
        value: quadList.join('\n'),
      },
    ],
  };
}

module.exports = {
  name: 'teams',
  description: 'List active ranked teams',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['duos'],
  execute(message) {
    const { guild } = message;

    Duo.find({ guild: guild.id }).then((duos) => {
      Team.find({ guild: guild.id }).then((teams) => {
        const embed = getEmbed(duos, teams);
        return message.channel.send({ embed });
      });
    });
  },
};
