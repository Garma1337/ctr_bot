const axios = require('axios');
const config = require('../config');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'draft2',
  description: `Generate draft links using the new draft tool
\`!draft2 [type] @CaptainA @CaptainB [bans] [picks] [timeout]\``,
  guildOnly: true,
  cooldown: 10,
  aliases: ['new_draft', 'draftv2'],
  execute(message) {
    const wrongSyntax = 'Wrong command usage. Try `!draft2 [type] @CaptainA @CaptainB [bans] [picks] [timeout]`.';

    const params = message.content.split(' ');
    params.shift(); // remove command

    const mode = params[0] === 'battle' ? 2 : 1;
    const { mentions } = message;
    const mentionedUsers = mentions.users.array();
    const bans = params[3] || (params[0] === 'battle' ? 1 : 3);
    const picks = params[4] || (params[0] === 'battle' ? 3 : 5);
    const timeout = params[5];

    if (params.length < 3 || mentionedUsers.length < 2) {
      return sendAlertMessage(message.channel, wrongSyntax, 'warning');
    }

    if (!isStaffMember(message.member) && !mentionedUsers.map((m) => m.id).includes(message.author.id)) {
      return sendAlertMessage(message.channel, 'You should be one of the players doing the draft.', 'warning');
    }

    const post = {
      mode,
      teamA: 'Team A',
      teamB: 'Team B',
      bans,
      picks,
      timeout,
    };

    sendAlertMessage(message.channel, `Connecting to ${config.draft_tool_url} ...`, 'info');

    axios({
      url: `${config.draft_tool_url}index.php?action=createDraft`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      params: post,
    }).then((r) => {
      const { data } = r;
      const errors = data.errors || [];

      if (errors.length > 0) {
        return message.channel.send(`\`\`\`${errors.join('\n')}\`\`\``);
      }
      const { draftData } = data;
      const spectatorUrl = `${config.draft_tool_url}index.php?action=show&id=${draftData.id}`;
      const teamALink = `${spectatorUrl}&accessKey=${draftData.accessKeyA}`;
      const teamBLink = `${spectatorUrl}&accessKey=${draftData.accessKeyB}`;

      const promise1 = mentionedUsers[0].createDM()
        .then((dm) => dm.send(`Here is your draft link for the war with ${post.teamB}:\n${teamALink}`))
        .catch(() => sendAlertMessage(message.channel, `Couldn't send a DM to ${mentions[0]}.\n${post.teamA} link:\n${teamALink}`, 'error'));

      const promise2 = mentionedUsers[1].createDM()
        .then((dm) => dm.send(`Here is your draft link for the war with ${post.teamA}:\n${teamBLink}`))
        .catch(() => sendAlertMessage(message.channel, `Couldn't send a DM to ${mentions[1]}.\n${post.teamB} link:\n${teamBLink}`, 'error'));

      Promise.all([promise1, promise2]).then(() => {
        sendAlertMessage(message.channel, `I've messaged both captains: ${mentionedUsers.join(', ')} with team links.
Spectator link: <${spectatorUrl}>`, 'success');
      });
    }).catch(() => {
      sendAlertMessage(message.channel, `Could not connect to ${config.draft_tool_url} D:`, 'error');
    });
  },
};
