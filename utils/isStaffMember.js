/**
 * Returns if a member is a staff member
 * @param member
 * @returns boolean
 */
function isStaffMember(member) {
  if (!member) {
    return false;
  }

  return member.hasPermission(['MANAGE_ROLES', 'MANAGE_CHANNELS']);
}

module.exports = isStaffMember;
