const collections = require("../../constants/collections");
const photoCleaner = require("../storageCleaners/photoCleaner");

const {
  addExtrasForOutfit,
  updateExtrasForOutfit,
  removeExtrasForOutfit,
} = require("./extrasWriter");
const { isStatusEnabled, isStatusDisabled } = require("./outfitEvaluators");
const {
  addOutfitToAlgoliaIndex,
  deleteOutfitFromAlgoliaIndex,
  updateOutfitInAlgoliaIndex,
} = require("./indexHandler");
const objectsAreEquivalent = require("../../helpers/objectsAreEquivalent");

module.exports.outfitWasWritten = outfitWasWritten;

function outfitWasWritten(outfitId, change) {
  if (!change.before.exists) {
    return handleNewOutfit(outfitId, change);
  } else if (change.before.exists && change.after.exists) {
    return handleUpdatedOutfit(outfitId, change);
  } else if (!change.after.exists) {
    return handleDeletedOutfit(outfitId, change);
  }
  return false;
}

function handleNewOutfit(outfitId, change) {
  const outfit = change.after.data();
  if (!outfit.status || !outfit.created) {
    return true; //writeDefaultOutfitStatus(outfitId); // this write will trigger the entire outfitHandler again, no need to deal with placeExtras here
  }
  if (!isStatusDisabled(outfit)) {
    return Promise.all([
      addOutfitToAlgoliaIndex(outfitId, outfit),
      addExtrasForOutfit(outfitId, outfit),
    ]);
  }
  return true;
}

function handleUpdatedOutfit(outfitId, change) {
  const outfitBefore = change.before.data();
  const outfitAfter = change.after.data();

  if (!isStatusEnabled(outfitBefore) && isStatusEnabled(outfitAfter)) {
    // if status changed to enabled: treat it as if it was added
    return Promise.all([
      photoCleaner(outfitId, collections.OUTFITS, outfitBefore, outfitAfter),
      addExtrasForOutfit(outfitId, outfitAfter),
      addOutfitToAlgoliaIndex(outfitId, outfitAfter),
    ]);
  } else if (isStatusEnabled(outfitBefore) && isStatusEnabled(outfitAfter)) {
    // if status always enabled: update placeExtras
    let promises = [
      photoCleaner(outfitId, collections.OUTFITS, outfitBefore, outfitAfter),
      updateExtrasForOutfit(outfitId, outfitBefore, outfitAfter),
    ];
    if (shouldAlgoliaOutfitBeUpdated(outfitBefore, outfitAfter)) {
      promises.push(updateOutfitInAlgoliaIndex(outfitId, outfitAfter));
    }
    return Promise.all(promises);
  } else if (
    isStatusEnabled(outfitBefore) && // if status changed to disabled: treat it as if it was removed
    !isStatusEnabled(outfitAfter)
  ) {
    return Promise.all([
      photoCleaner(outfitId, collections.OUTFITS, outfitBefore, outfitAfter),
      removeExtrasForOutfit(outfitId, outfitBefore),
      deleteOutfitFromAlgoliaIndex(outfitId),
    ]);
  }

  return true;
}

function handleDeletedOutfit(outfitId, change) {
  const outfit = change.before.data();
  photoCleaner(outfitId, collections.OUTFITS, outfit);
  if (isStatusEnabled(outfit)) {
    return Promise.all([
      deleteOutfitFromAlgoliaIndex(outfitId),
      removeExtrasForOutfit(outfitId, outfit),
    ]);
  }
  return true;
}

function shouldAlgoliaOutfitBeUpdated(outfitBefore, outfitAfter) {
  if (!outfitBefore) {
    return false;
  }
  return (
    outfitBefore.title !== outfitAfter.title ||
    outfitBefore.subtitle !== outfitAfter.subtitle ||
    outfitBefore.lat !== outfitAfter.lat ||
    outfitBefore.lng !== outfitAfter.lng ||
    !objectsAreEquivalent(outfitBefore.thumbPhoto, outfitAfter.thumbPhoto) ||
    !objectsAreEquivalent(outfitBefore.coverPhoto, outfitAfter.coverPhoto) ||
    !objectsAreEquivalent(outfitBefore.categories, outfitAfter.categories) ||
    !objectsAreEquivalent(outfitBefore.morning, outfitAfter.morning) ||
    !objectsAreEquivalent(outfitBefore.day, outfitAfter.day) ||
    !objectsAreEquivalent(outfitBefore.evening, outfitAfter.evening)
  );
}
