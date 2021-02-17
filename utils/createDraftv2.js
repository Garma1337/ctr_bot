const axios = require('axios');
const config = require('../config');
const sendAlertMessage = require('./sendAlertMessage');

/**
 * Creates a draft between 2 teams with the new draft tool
 * @param channel
 * @param mode
 * @param bans
 * @param picks
 * @param timeout
 * @param mentions
 */
function createDraftv2(channel, mode, bans, picks, timeout, mentions) {
  const post = {
    mode,
    teamA: 'Team A',
    teamB: 'Team B',
    bans,
    picks,
    timeout,
  };

  sendAlertMessage(channel, `Connecting to ${config.draft_tool_url} ...`, 'info');

  axios({
    url: `${config.draft_tool_url}index.php?action=createDraft`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    params: post,
    // eslint-disable-next-line consistent-return
  }).then((r) => {
    const { data } = r;
    const errors = data.errors || [];

    if (errors.length > 0) {
      return channel.send(`\`\`\`${errors.join('\n')}\`\`\``);
    }

    const { draftData } = data;
    const spectatorUrl = `${config.draft_tool_url}index.php?action=show&id=${draftData.id}`;
    const teamALink = `${spectatorUrl}&accessKey=${draftData.accessKeyA}`;
    const teamBLink = `${spectatorUrl}&accessKey=${draftData.accessKeyB}`;

    const promise1 = mentions[0].createDM()
      .then((dm) => dm.send(`Here is your draft link for the war with ${post.teamB}:\n${teamALink}`))
      .catch(() => sendAlertMessage(channel, `Couldn't send a DM to ${mentions[0]}.\n${post.teamA} link:\n${teamALink}`, 'error'));

    const promise2 = mentions[1].createDM()
      .then((dm) => dm.send(`Here is your draft link for the war with ${post.teamA}:\n${teamBLink}`))
      .catch(() => sendAlertMessage(channel, `Couldn't send a DM to ${mentions[1]}.\n${post.teamB} link:\n${teamBLink}`, 'error'));

    Promise.all([promise1, promise2]).then(() => {
      sendAlertMessage(channel, `I've messaged both captains: ${mentions.join(', ')} with team links.
Spectator link: <${spectatorUrl}>`, 'success');
    });
  }).catch(() => {
    sendAlertMessage(channel, `Could not connect to ${config.draft_tool_url} D:`, 'error');
  });
}

module.exports = createDraftv2;
