const axios = require('axios');
const sendAlertMessage = require('./sendAlertMessage');

/**
 * Creates a draft between 2 teams
 * @param channel
 * @param draftMode
 * @param teams
 * @param captains
 */
function createDraft(channel, draftMode, teams, captains) {
  sendAlertMessage(channel, 'Connecting to `draft.crashteamranking.com`...', 'info').then((m) => {
    const teamB = teams[1];
    const teamA = teams[0];

    axios.post('https://draft.crashteamranking.com/drafttool.php', null, {
      params: {
        msgID: 0,
        teamA,
        teamB,
        draftMode,
      },
    }).then((r) => {
      const { ID, hashA, hashB } = r.data;
      const lobbyLink = 'https://draft.crashteamranking.com/lobby.php?id=';
      const specLink = lobbyLink + ID;
      const teamALink = `${specLink}&hash=${hashA}`;
      const teamBLink = `${specLink}&hash=${hashB}`;

      const captainA = captains[0];
      const captainB = captains[1];

      const captainAPromise = captainA.createDM()
        .then((dm) => dm.send(`Draft link for a war with ${teamB}:\n${teamALink}`))
        .catch(() => sendAlertMessage(channel, `Couldn't message ${captainA}.\n${teamA} link:\n${teamALink}`, 'error'));

      const captainBPromise = captainB.createDM()
        .then((dm) => dm.send(`Draft link for a war with ${teamB}:\n${teamBLink}`))
        .catch(() => sendAlertMessage(channel, `Couldn't message ${captainB}.\n${teamB} link:\n${teamBLink}`, 'error'));

      Promise.all([captainAPromise, captainBPromise]).then(() => {
        m.delete();

        sendAlertMessage(channel, `I've messaged both captains: ${captains.join(', ')} with team links.
Spectator link: <${specLink}>`, 'success');
      });
    }).catch(() => {
      sendAlertMessage(channel, 'Couldn\'t connect to `draft.crashteamranking.com\nTry again later.`', 'error');
    });
  });
}

module.exports = createDraft;
