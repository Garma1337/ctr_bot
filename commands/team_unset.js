const { Lobby } = require('../db/models/lobby');
const { Team } = require('../db/models/team');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { RACE_3V3, RACE_4V4 } = require('../db/models/lobby');

module.exports = {
  name: 'team_unset',
  description: 'Unset your team for Ranked 4v4.',
  guildOnly: true,
  aliases: ['unset_team', 'team_u'],
  // eslint-disable-next-line consistent-return
  async execute(message) {
    const { author, guild } = message;

    const team = await Team.findOne({ guild: guild.id, players: author.id });
    if (team) {
      const lobby = await Lobby.findOne({
        type: { $in: [RACE_3V3, RACE_4V4] },
        players: { $in: team.players },
      });

      if (lobby) {
        return sendAlertMessage(message.channel, 'You can\'t unset your team while being in the lobby with it.', 'warning');
      }

      team.delete().then(() => sendAlertMessage(message.channel, 'Your team has been unset.', 'success'));
    } else {
      sendAlertMessage(message.channel, 'You don\'t have a team set.', 'warning');
    }
  },
};
