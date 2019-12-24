const admin = require("firebase-admin");

const defaults = require("../../constants/defaults");
const collections = require("../../constants/collections");
const reviewEvaluators = require("./reviewEvaluators");
const extrasWriter = require("./extrasWriter");

const { addExtrasForReview, updateExtrasForReview, removeExtrasForReview } = extrasWriter;

const { isStatusEnabled, isStatusDisabled } = reviewEvaluators;

module.exports.reviewWasWritten = reviewWasWritten;

function reviewWasWritten(reviewId, change) {
  if (!change.before.exists) {
    return handleNewReview(reviewId, change);
  } else if (change.before.exists && change.after.exists) {
    return handleUpdatedReview(reviewId, change);
  } else if (!change.after.exists) {
    return handleDeletedReview(reviewId, change);
  }
  return false;
}

function handleNewReview(reviewId, change) {
  const review = change.after.data();
  if (!review.status || !review.created) {
    return true; //writeDefaultReviewStatus(reviewId); // this write will trigger the entire reviewHandler again, no need to deal with placeExtras here
  } else if (!isStatusDisabled(review)) {
    return addExtrasForReview(reviewId, review);
  }
  return true;
}

function handleUpdatedReview(reviewId, change) {
  const reviewBefore = change.before.data();
  const reviewAfter = change.after.data();

  if (
    !isStatusEnabled(reviewBefore) && // if status changed to enabled: treat it as if it was added
    isStatusEnabled(reviewAfter)
  ) {
    return addExtrasForReview(reviewId, reviewAfter);
  } else if (
    // !isRatingSame (reviewBefore, reviewAfter) &&                    // only if rating changed - not ok because of timestamps that also get updated
    isStatusEnabled(reviewBefore) &&
    isStatusEnabled(reviewAfter)
  ) {
    // if status always enabled: update placeExtras.rating
    return updateExtrasForReview(reviewId, reviewBefore, reviewAfter);
  } else if (
    isStatusEnabled(reviewBefore) && // if status changed to disabled: treat it as if it was removed
    !isStatusEnabled(reviewAfter)
  ) {
    return removeExtrasForReview(reviewId, reviewBefore);
  }

  return true;
}

function handleDeletedReview(reviewId, change) {
  const review = change.before.data();
  const reviewCleaner = require("../storageCleaners/reviewCleaner");
  reviewCleaner(reviewId, review);
  if (isStatusEnabled(review)) {
    return removeExtrasForReview(reviewId, review);
  }
}

// function writeDefaultReviewStatus(reviewId) {
//   const db = admin.firestore();

//   console.log("WILL CREATE field 'status' in '" + collections.REVIEWS + "/" + reviewId + "'");
//   let defaultReviewStatus = defaults.reviews_status;
//   let reviewRef = db.collection(collections.REVIEWS).doc(reviewId);

//   return reviewRef.set({ status: defaultReviewStatus }, { merge: true });
// }
