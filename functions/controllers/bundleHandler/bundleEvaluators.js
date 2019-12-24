module.exports = {
  isStatusEnabled,
  isStatusDisabled,
};

function isStatusEnabled(bundle) {
  return bundle.status >= 100 && bundle.status < 200;
}

function isStatusDisabled(bundle) {
  return bundle.status < 100 || bundle.status >= 200;
}
