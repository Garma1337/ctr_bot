const { prefix } = require('../config.js');
const isStaffMember = require('../utils/isStaffMember');

module.exports = {
  name: 'help',
  description: 'help',
  cooldown: 5,
  execute(message) {
    const fields = [];
    const staffFields = [];

    message.client.commands.forEach((command) => {
      if (command.noHelp) {
        return;
      }

      const commandName = `${prefix}${command.name}`;
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
        title: 'Help',
        fields: [
          ...fields,
        ],
      },
    };

    const staffOutput = {
      embed: {
        title: 'Staff Help',
        fields: staffFields,
      },
    };

    message.member.user.createDM()
      .then((dm) => {
        dm.send(output)
          .catch(() => {
            message.channel.send(output);
          });

        if (staffFields.length) {
          dm.send(staffOutput)
            .catch(() => {
              message.channel.send(staffOutput);
            });
        }
      });
  },
};
