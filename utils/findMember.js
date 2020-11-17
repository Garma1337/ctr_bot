const findMember = (guild, query) => guild.members.fetch({ query }).then((members) => {
  if (!members.size) {
    throw Error('Member wasn\'t found.');
  }

  if (members.size > 1) {
    throw Error('Found more than 1 member with that name.');
  }

  return members.first();
});

module.exports = findMember;
