// separate process for monitoring bot's DMs and sending them in the server's channel

const Discord = require('discord.js');
const config = require('./config');

const client = new Discord.Client();

const logDM = async (message) => {
  const guild = client.guilds.cache.get(config.main_guild);

  if (guild) {
    let channelDM = guild.channels.cache.find((c) => c.name === config.channels.tourney_dm_channel);
    if (!channelDM) {
      channelDM = await guild.channels.create(config.channels.tourney_dm_channel);
    }

    const attachments = message.attachments.map((a) => a.url);

    let { content } = message;
    if (content) content = content.split('\n').map((r) => `> ${r}`).join('\n');

    channelDM.send(`**New DM by ${message.author} \`${message.author.tag}\` \`${message.author.id}\`**\n${content}`, { files: attachments });
  } else {
    // eslint-disable-next-line no-console
    console.log(`Could not find guild ${config.main_guild}`);
  }
};

client.on('message', (message) => {
  if (message.author.bot) return;

  if (message.channel.type === 'dm') {
    logDM(message);
  }
});

client.login(config.token);
