module.exports = {
  isStatusEnabled,
  isStatusDisabled,
};

function isStatusEnabled(outfit) {
  return outfit.status >= 100 && outfit.status < 200;
}

function isStatusDisabled(outfit) {
  return outfit.status < 100 || outfit.status >= 200;
}
