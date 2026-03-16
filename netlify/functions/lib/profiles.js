const { sanitizeBirthName, sanitizeUserAffiliation } = require('./normalize');

function getBirthNameForUsername(db, username) {
  return sanitizeBirthName(db.profiles?.[username]?.birthName);
}

function getAffiliationForUsername(db, username) {
  return sanitizeUserAffiliation(db.profiles?.[username]?.affiliation);
}

function buildUserProfilesPayload(db) {
  const profiles = {};
  for (const username of Object.keys(db.users)) {
    profiles[username] = {
      birthName: getBirthNameForUsername(db, username),
      affiliation: getAffiliationForUsername(db, username)
    };
  }
  return profiles;
}

module.exports = {
  buildUserProfilesPayload,
  getAffiliationForUsername,
  getBirthNameForUsername
};
