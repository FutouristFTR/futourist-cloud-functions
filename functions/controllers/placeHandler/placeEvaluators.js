module.exports = {
  isStatusEnabled,
  isStatusDisabled,
};

function isStatusEnabled(review) {
  return review.status >= 100 && review.status < 200;
}

function isStatusDisabled(review) {
  return review.status < 100 || review.status >= 200;
}
