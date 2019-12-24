module.exports = function(displayName, isNotUnique) {
  const randomString = require("./randomString");
  if (!displayName || !displayName.length) return randomString(10);

  let formattedUsername = displayName
    .replace(" ", "_")
    .toLowerCase()
    .replace(/[^0-9a-z_]/gi, "");

  if (isNotUnique) {
    formattedUsername = formattedUsername + "_" + randomString(4);
  }
  if (formattedUsername.length < 6) {
    formattedUsername = formattedUsername + "_" + randomString(6 - formattedUsername.length);
  }
  return formattedUsername;
};
