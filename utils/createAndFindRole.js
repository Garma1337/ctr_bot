/**
 * Creates a new role and returns it (only returns it if it already exists)
 * @param guild
 * @param roleName
 * @returns Object
 */
async function createAndFindRole(guild, roleName) {
  const roles = await guild.roles.fetch();

  let role = roles.cache.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
  if (!role) {
    role = await guild.roles.create({
      data: {
        name: roleName,
        mentionable: true,
        permissions: [],
      },
      reason: `Role ${roleName} did not exist before`,
    });
  }

  return role;
}

module.exports = createAndFindRole;
