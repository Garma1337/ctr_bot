/**
 * Returns if a member is a staff member
 * @param member
 * @returns boolean
 */
function isStaffMember(member) {
  const hasStaffRole = member.roles.cache.find((r) => r.name.toLowerCase() === 'staff');
  return hasStaffRole && member.hasPermission(['MANAGE_ROLES', 'MANAGE_CHANNELS']);
}

module.exports = isStaffMember;
