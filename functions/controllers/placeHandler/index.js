const { isStatusEnabled, isStatusDisabled } = require("./placeEvaluators");
const {
  addPlaceToAlgoliaIndex,
  deletePlaceFromAlgoliaIndex,
  updatePlaceInAlgoliaIndex,
} = require("./indexHandler");

const photoCleaner = require("../storageCleaners/photoCleaner");
const collections = require("../../constants/collections");
const objectsAreEquivalent = require("../../helpers/objectsAreEquivalent");

module.exports.placeWasWritten = placeWasWritten;

function placeWasWritten(placeId, change) {
  if (!change.before.exists) {
    return handleNewPlace(placeId, change);
  } else if (change.before.exists && change.after.exists) {
    return handleUpdatedPlace(placeId, change);
  } else if (!change.after.exists) {
    return handleDeletedPlace(placeId, change);
  }
  return false;
}

function handleNewPlace(placeId, change) {
  const place = change.after.data();
  if (!place.status || !place.created) {
    return true;
  }
  if (!isStatusDisabled(place)) {
    return Promise.all([addPlaceToAlgoliaIndex(placeId, place)]);
  }

  return true;
}

function handleUpdatedPlace(placeId, change) {
  const placeBefore = change.before.data();
  const placeAfter = change.after.data();

  if (
    !isStatusEnabled(placeBefore) && // if status changed to enabled: treat it as if it was added
    isStatusEnabled(placeAfter)
  ) {
    return Promise.all([
      addPlaceToAlgoliaIndex(placeId, placeAfter),
      photoCleaner(placeId, collections.PLACES, placeBefore, placeAfter),
    ]);
  } else if (isStatusEnabled(placeBefore) && isStatusEnabled(placeAfter)) {
    let promises = [photoCleaner(placeId, collections.PLACES, placeBefore, placeAfter)];
    if (shouldAlgoliaPlaceBeUpdated(placeBefore, placeAfter)) {
      promises.push(updatePlaceInAlgoliaIndex(placeId, placeAfter));
    }
    return Promise.all(promises);
  } else if (
    isStatusEnabled(placeBefore) && // if status changed to disabled: treat it as if it was removed
    !isStatusEnabled(placeAfter)
  ) {
    return Promise.all([
      photoCleaner(placeId, collections.PLACES, placeBefore, placeAfter),
      deletePlaceFromAlgoliaIndex(placeId),
    ]);
  }

  return true;
}

function handleDeletedPlace(placeId, change) {
  const placeBefore = change.before.data();
  const deletePromises = [photoCleaner(placeId, collections.PLACES, placeBefore)];
  if (isStatusEnabled(placeBefore)) {
    deletePromises.push(deletePlaceFromAlgoliaIndex(placeId));
  }
  return Promise.all(deletePromises);
}

function shouldAlgoliaPlaceBeUpdated(placeBefore, placeAfter) {
  if (!placeBefore) {
    return false;
  }
  return (
    placeBefore.name !== placeAfter.name ||
    placeBefore.city !== placeAfter.city ||
    placeBefore.tags !== placeAfter.tags ||
    placeBefore.lat !== placeAfter.lat ||
    placeBefore.lng !== placeAfter.lng ||
    placeBefore.rating !== placeAfter.rating ||
    placeBefore.pitch !== placeAfter.pitch ||
    !placeBefore.photos !== !placeAfter.photos ||
    (placeBefore.photos &&
      placeBefore.photos.length &&
      placeAfter.photos.length &&
      placeBefore.photos[0].id !== placeAfter.photos[0].id) ||
    !placeBefore.latestReviews !== !placeAfter.latestReviews ||
    (placeBefore.latestReviews &&
      placeBefore.latestReviews.length !== !placeAfter.latestReviews.length) ||
    (placeBefore.latestReviews &&
      placeBefore.latestReviews.length &&
      placeAfter.latestReviews.length &&
      placeBefore.latestReviews[0].id !== placeAfter.latestReviews[0].id) ||
    !objectsAreEquivalent(placeBefore.categories, placeAfter.categories)
  );
}
