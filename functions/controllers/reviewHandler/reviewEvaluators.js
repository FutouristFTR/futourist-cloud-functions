module.exports = {
  compareReviewsForSorting,
  isRatingSame,
  isStatusEnabled,
  isStatusDisabled,
};

function compareReviewsForSorting(firstReview, secondReview) {
  if (!firstReview.created || !secondReview.created) {
    console.log("DEBUG: REVIEW.CREATED DOESN'T EXIST");
    return 0;
  }

  let firstCreated = firstReview.created.toDate().getTime();
  let secondCreated = secondReview.created.toDate().getTime();

  if (firstCreated > secondCreated) {
    return -1;
  } else if (firstCreated < secondCreated) {
    return 1;
  }
  return 0;
}

function isRatingSame(reviewBefore, reviewAfter) {
  return reviewBefore.rating === reviewAfter.rating;
}

function isStatusEnabled(review) {
  return review.status >= 100 && review.status < 200;
}

function isStatusDisabled(review) {
  return review.status < 100 || review.status >= 200;
}
