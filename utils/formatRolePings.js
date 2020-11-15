/**
 * Replaces all {roleNames} with a role mention
 * @param message
 * @param roles
 * @returns string
 */
function formatRolePings(message, roles) {
  message = message.replace('{everyone}', '@everyone');
  message = message.replace('{here}', '@here');

  roles.forEach((r) => {
    if (r.name !== '@everyone') {
      message = message.replace(`{${r.name}}`, `<@&${r.id}>`);
    }
  });

  return message;
}

module.exports = formatRolePings;
