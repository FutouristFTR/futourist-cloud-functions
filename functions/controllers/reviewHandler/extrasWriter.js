const admin = require("firebase-admin");
const collections = require("../../constants/collections");
const defaults = require("../../constants/defaults");

const db = admin.firestore();

const { compareReviewsForSorting } = require("./reviewEvaluators");

module.exports = {
  addExtrasForReview,
  updateExtrasForReview,
  removeExtrasForReview,
};

function addExtrasForReview(reviewId, review) {
  const placeId = review.placeId;
  const userId = review.userId;

  if (!placeId) {
    console.error("addExtrasForReview: no review.placeId, cannot add extras");
    return false;
  }
  if (!userId) {
    console.error("addExtrasForReview: no review.userId, cannot add extras");
    return false;
  }

  let placesExtrasPath = collections.PLACES_EXTRAS + "/" + placeId;
  let placesExtrasRef = db.collection(collections.PLACES_EXTRAS).doc(placeId);
  let usersExtrasRef = db.collection(collections.USERS_EXTRAS).doc(userId);
  let placeRef = db.collection(collections.PLACES).doc(placeId); // dodal Žan

  if (!review.rating) {
    throw new Error(`Could not retireve "rating" field from review with id: '${reviewId}'`);
  }

  console.log(
    "WILL UPDATE DOC '" +
      placesExtrasPath +
      "' (REVIEW ADDED or switched to enabled status code - review_id: " +
      reviewId +
      ")"
  );

  return db.runTransaction(transaction => {
    let placesExtrasPromise = transaction.get(placesExtrasRef);
    let usersExtrasPromise = transaction.get(usersExtrasRef);
    let placePromise = transaction.get(placeRef); // dodal Žan
    return Promise.all([placesExtrasPromise, usersExtrasPromise, placePromise]) // dodal dodaten promise Žan
      .then(docs => {
        let usersExtras = docs[1].data();
        let latestUsersExtras = addReviewToUsersExtras(reviewId, review, usersExtras);
        transaction.set(usersExtrasRef, latestUsersExtras, { merge: true });

        let placeExtras = docs[0].data();
        let ratingPlaceExtras = addRatingToPlaceExtras(placeExtras, review.rating);
        let latestReviewsPlaceExtras = addReviewToPlaceExtrasLatestReviews(
          reviewId,
          review,
          placeExtras
        );

        const allChangedPlaceExtras = Object.assign(latestReviewsPlaceExtras, ratingPlaceExtras);

        const placeDataToWrite = {
          latestReviews: latestReviewsPlaceExtras.latestReviews,
          rating: latestReviewsPlaceExtras.rating,
          ratingCount: latestReviewsPlaceExtras.ratingCount,
        };

        if (placeDataToWrite.latestReviews === undefined) {
          placeDataToWrite.latestReviews = [];
        }
        if (placeDataToWrite.rating === undefined) {
          placeDataToWrite.rating = null;
        }
        if (placeDataToWrite.ratingCount === undefined) {
          placeDataToWrite.ratingCount = null;
        }

        // dodal Žan
        transaction.set(placeRef, placeDataToWrite, { merge: true });

        return transaction.set(placesExtrasRef, allChangedPlaceExtras, { merge: true });
      })
      .catch(err => {
        console.error("Failed to handle NEW review (id: " + reviewId + "):", err);
      });
  });
}

function updateExtrasForReview(reviewId, reviewBefore, reviewAfter) {
  const placeId = reviewBefore.placeId;
  const userId = reviewBefore.userId;

  if (!placeId) {
    console.error("updateExtrasForReview: no review.placeId, cannot update extras");
    return false;
  }
  if (!userId) {
    console.error("updateExtrasForReview: no review.userId, cannot update extras");
    return false;
  }

  let placesExtrasPath = collections.PLACES_EXTRAS + "/" + placeId;
  let placesExtrasRef = db.doc(placesExtrasPath);
  let usersExtrasRef = db.collection(collections.USERS_EXTRAS).doc(userId);
  let placeRef = db.collection(collections.PLACES).doc(placeId); // dodal Žan

  if (!reviewAfter.rating) {
    throw new Error('Could not retireve "rating" field from review with id: ' + reviewId + ")");
  }

  console.log("WILL UPDATE DOC '" + placesExtrasPath + "' (review_id: " + reviewId + ")");

  return db.runTransaction(transaction => {
    let placesExtrasPromise = transaction.get(placesExtrasRef);
    let usersExtrasPromise = transaction.get(usersExtrasRef);
    let placePromise = transaction.get(placeRef); // dodal Žan

    return Promise.all([placesExtrasPromise, usersExtrasPromise, placePromise]) // dodal dodaten promise Žan
      .then(docs => {
        let usersExtras = docs[1].data();
        let latestUsersExtras = removeReviewFromUsersExtras(reviewId, reviewBefore, usersExtras);
        latestUsersExtras = addReviewToUsersExtras(reviewId, reviewAfter, latestUsersExtras);

        transaction.set(usersExtrasRef, latestUsersExtras, { merge: true });

        let placeExtras = docs[0].data();

        let ratingPlaceExtras = removeRatingFromPlaceExtras(placeExtras, reviewBefore.rating);
        ratingPlaceExtras = addRatingToPlaceExtras(ratingPlaceExtras, reviewAfter.rating);

        let latestReviewsPlaceExtras = removeReviewFromPlaceExtrasLatestReviews(
          reviewId,
          reviewBefore,
          placeExtras
        );
        latestReviewsPlaceExtras = addReviewToPlaceExtrasLatestReviews(
          reviewId,
          reviewAfter,
          latestReviewsPlaceExtras
        );

        const allChangedPlaceExtras = Object.assign(ratingPlaceExtras, latestReviewsPlaceExtras);
        // dodal Žan
        const placeDataToWrite = {
          latestReviews: allChangedPlaceExtras.latestReviews,
          rating: allChangedPlaceExtras.rating,
          ratingCount: allChangedPlaceExtras.ratingCount,
        };
        // dodal Žan
        if (placeDataToWrite.latestReviews === undefined) {
          placeDataToWrite.latestReviews = [];
        }
        // dodal Žan
        if (placeDataToWrite.rating === undefined) {
          placeDataToWrite.rating = null;
        }
        // dodal Žan
        if (placeDataToWrite.ratingCount === undefined) {
          placeDataToWrite.ratingCount = null;
        }
        // dodal Žan
        transaction.set(placeRef, placeDataToWrite, { merge: true });

        return transaction.set(placesExtrasRef, allChangedPlaceExtras, { merge: true });
      })
      .catch(err => {
        console.error("Failed to handle UPDATED review (id: " + reviewId + "):", err);
      });
  });
}

function removeExtrasForReview(reviewId, review) {
  const placeId = review.placeId;
  const userId = review.userId;
  if (!placeId) {
    console.error("RemoveExtrasForReview: no review.placeId, cannot remove extras");
    return false;
  }
  if (!userId) {
    console.error("RemoveExtrasForReview: no review.userId, cannot remove extras");
    return false;
  }

  let placesExtrasPath = collections.PLACES_EXTRAS + "/" + placeId;
  let placesExtrasRef = db.collection(collections.PLACES_EXTRAS).doc(placeId);
  let usersExtrasRef = db.collection(collections.USERS_EXTRAS).doc(userId);
  let placeRef = db.collection(collections.PLACES).doc(placeId); // dodal Žan

  if (!review.rating) {
    throw new Error('Could not retireve "rating" field from review with id: ' + reviewId + ")");
  }

  console.log(
    "WILL UPDATE DOC '" +
      placesExtrasPath +
      "' (REVIEW REMOVED or switched to disabled status code - review_id: " +
      reviewId +
      ")"
  );

  return db.runTransaction(transaction => {
    let placesExtrasPromise = transaction.get(placesExtrasRef);
    let usersExtrasPromise = transaction.get(usersExtrasRef);
    let placePromise = transaction.get(placeRef); // dodal Žan

    return Promise.all([placesExtrasPromise, usersExtrasPromise, placePromise]) // dodal dodaten promise Žan
      .then(docs => {
        let usersExtras = docs[1].data();

        const latestUsersExtras = removeReviewFromUsersExtras(reviewId, review, usersExtras);

        transaction.set(usersExtrasRef, latestUsersExtras, { merge: true });

        let placeExtras = docs[0].data();
        let ratingPlaceExtras = removeRatingFromPlaceExtras(placeExtras, review.rating);
        let latestReviewsPlaceExtras = removeReviewFromPlaceExtrasLatestReviews(
          reviewId,
          review,
          placeExtras
        );

        const allChangedPlaceExtras = Object.assign(latestReviewsPlaceExtras, ratingPlaceExtras);

        const placeDataToWrite = {
          latestReviews: latestReviewsPlaceExtras.latestReviews,
          rating: latestReviewsPlaceExtras.rating,
          ratingCount: latestReviewsPlaceExtras.ratingCount,
        };
        if (placeDataToWrite.latestReviews === undefined) {
          placeDataToWrite.latestReviews = [];
        }
        if (placeDataToWrite.rating === undefined) {
          placeDataToWrite.rating = null;
        }
        if (placeDataToWrite.ratingCount === undefined) {
          placeDataToWrite.ratingCount = null;
        }
        // dodal Žan
        transaction.set(placeRef, placeDataToWrite, { merge: true });

        return transaction.set(placesExtrasRef, allChangedPlaceExtras, { merge: true });
      })
      .catch(err => {
        console.error("Failed to handle REMOVED review (id: " + reviewId + "):", err);
      });
  });
}

function addReviewToUsersExtras(reviewId, review, usersExtras) {
  let usersReviews = [];
  if (usersExtras) {
    usersReviews = usersExtras.reviews || [];
  }

  usersReviews = removeReviewFromArray(reviewId, usersReviews);

  review.id = reviewId;
  if (review.created === undefined) {
    console.error(`Error: 'created' field missing in /usersExtras/${review.userId}/reviews`);
  }

  usersReviews.unshift(review);
  usersReviews.sort(compareReviewsForSorting);

  return { reviews: usersReviews };
}

function removeReviewFromUsersExtras(reviewId, review, usersExtras) {
  let reviews = usersExtras.reviews;
  if (reviews === undefined || reviews.length < 1) {
    console.error(
      `Tried to remove a review from an empty usersExtras.reviews array (placeId: ${review.placeId})`
    );
    reviews = [];
  }

  reviews = removeReviewFromArray(reviewId, reviews);

  return { reviews };
}

function addRatingToPlaceExtras(placeExtras, rating) {
  return makePlaceExtrasRating(placeExtras, rating, true);
}

function removeRatingFromPlaceExtras(placeExtras, rating) {
  return makePlaceExtrasRating(placeExtras, rating, false);
}

function makePlaceExtrasRating(placeExtras, reviewsPlaceRating, isIncrement) {
  let nextRatingCount = 0;
  let nextRatingSum = 0;

  if (placeExtras) {
    nextRatingCount = parseInt(placeExtras.ratingCount) || 0;
    nextRatingSum = parseFloat(placeExtras.ratingSum) || 0;
  }

  if (isIncrement) {
    nextRatingCount++;
    nextRatingSum += parseFloat(reviewsPlaceRating);
  } else {
    nextRatingCount--;
    nextRatingSum -= parseFloat(reviewsPlaceRating);
  }

  let nextRating = nextRatingSum / nextRatingCount;

  if (!isFinite(nextRating)) nextRating = 0;

  return {
    ratingCount: nextRatingCount,
    ratingSum: nextRatingSum,
    rating: nextRating,
  };
}

function addReviewToPlaceExtrasLatestReviews(reviewId, review, placeExtras) {
  if (review.created === undefined) {
    console.error(`Error: 'created' field missing in /usersExtras/${review.userId}/reviews`);
  }

  review.id = reviewId;
  let latestReviews = [];

  if (placeExtras && placeExtras.latestReviews) latestReviews = placeExtras.latestReviews;

  latestReviews = removeReviewFromArray(reviewId, latestReviews);

  if (
    latestReviews.length >= defaults.latest_reviews_length &&
    latestReviews[latestReviews.length - 1].created &&
    review.created &&
    review.created.toDate().getTime() <
      latestReviews[latestReviews.length - 1].created.toDate().getTime()
  ) {
    return { latestReviews };
  }

  latestReviews.unshift(review);
  latestReviews.sort(compareReviewsForSorting);

  if (latestReviews.length > defaults.latest_reviews_length) {
    latestReviews.pop();
  }

  return { latestReviews };
}

function removeReviewFromPlaceExtrasLatestReviews(reviewId, review, placeExtras) {
  let latestReviews = [];
  if (
    !placeExtras ||
    placeExtras.latestReviews === undefined ||
    placeExtras.latestReviews.length < 1
  ) {
    console.error(
      `Tried to remove a review from an empty placeExtras.latestReviews array (placeId: ${review.placeId})`
    );
  } else {
    latestReviews = placeExtras.latestReviews;
  }
  latestReviews = removeReviewFromArray(reviewId, latestReviews);
  return { latestReviews };
}

function removeReviewFromArray(reviewIdToRemove, reviewsArray) {
  for (let i = reviewsArray.length - 1; i >= 0; i--) {
    if (reviewsArray[i].id === reviewIdToRemove) {
      reviewsArray.splice(i, 1);
    }
  }
  return reviewsArray;
}
