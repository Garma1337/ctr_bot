const config = require('../config');
const isStaffMember = require('../utils/isStaffMember');

module.exports = {
  name: 'help',
  description: 'help',
  cooldown: 30,
  execute(message) {
    const fields = [];
    const staffFields = [];

    message.client.commands.forEach((command) => {
      if (command.noHelp) {
        return;
      }

      const commandName = `${config.prefix}${command.name}`;
      let { description } = command;

      if (typeof description === 'function') {
        description = description(message);
      }

      const { member } = message;
      if (command.permissions) {
        if (member && isStaffMember(member)) {
          staffFields.push({
            name: commandName,
            value: `*${description}*`,
            inline: true,
          });
          return;
        }
        return;
      }

      fields.push({
        name: commandName,
        value: `*${description}*`,
        inline: true,
      });
    });

    const output = {
      embed: {
        color: config.default_embed_color,
        title: 'Help',
        fields: [
          ...fields,
        ],
      },
    };

    const staffOutput = {
      embed: {
        color: config.default_embed_color,
        title: 'Staff Help',
        fields: staffFields,
      },
    };

    message.member.user.createDM().then((dm) => {
      dm.send(output).catch(() => {
        message.channel.send(output);
      });

      if (staffFields.length) {
        dm.send(staffOutput).catch(() => {
          message.channel.send(staffOutput);
        });
      }
    });
  },
};
