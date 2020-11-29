const Team = require('../db/models/teams');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const sendAlertMessage = require('../utils/sendAlertMessage');
const { _4V4 } = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'team_unset',
  description: 'Unset your team for Ranked 4v4.',
  guildOnly: true,
  aliases: ['unset_team', 'team_u'],
  async execute(message) {
    const { author, guild } = message;

    const team = await Team.findOne({ guild: guild.id, players: author.id });
    if (team) {
      const lobby = await RankedLobby.findOne({
        type: _4V4,
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
