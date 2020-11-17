// separate process for monitoring bot's DMs and sending them in the server's channel

const Discord = require('discord.js');
const config = require('./config.js');

const client = new Discord.Client();

const logDM = async (message) => {
  const guild = client.guilds.cache.get(process.env.TEST ? config.test_guild : config.main_guild);

  let channelDM = guild.channels.cache.find((c) => c.name === 'tourney-bot-dm');
  if (!channelDM) {
    channelDM = await guild.channels.create('tourney-bot-dm');
  }
  const attachments = message.attachments.map((a) => a.url);

  let { content } = message;
  if (content) content = content.split('\n').map((r) => `> ${r}`).join('\n');

  channelDM.send(`**New DM by ${message.author} \`${message.author.tag}\` \`${message.author.id}\`**\n${content}`, { files: attachments });
};

client.on('message', (message) => {
  if (message.author.bot) return;

  if (message.channel.type === 'dm') {
    logDM(message);
  }
});

client.login(process.env.TEST ? config.test_token : config.token);
