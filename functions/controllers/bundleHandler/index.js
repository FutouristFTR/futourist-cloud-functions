const admin = require("firebase-admin");
const defaults = require("../../constants/defaults");
const collections = require("../../constants/collections");
const photoCleaner = require("../storageCleaners/photoCleaner");
const { isStatusEnabled, isStatusDisabled } = require("./bundleEvaluators");
const {
  addExtrasForBundle,
  updateExtrasForBundle,
  removeExtrasForBundle,
} = require("./extrasWriter");
const {
  addBundleToAlgoliaIndex,
  deleteBundleFromAlgoliaIndex,
  updateBundleInAlgoliaIndex,
} = require("./indexHandler");
const objectsAreEquivalent = require("../../helpers/objectsAreEquivalent");

module.exports.bundleWasWritten = bundleWasWritten;

function bundleWasWritten(bundleId, change) {
  if (!change.before.exists) {
    return handleNewBundle(bundleId, change);
  } else if (change.before.exists && change.after.exists) {
    return handleUpdatedBundle(bundleId, change);
  } else if (!change.after.exists) {
    return handleDeletedBundle(bundleId, change);
  }
  return false;
}

function handleNewBundle(bundleId, change) {
  const bundle = change.after.data();
  if (!bundle.status || !bundle.created) {
    return true; // this write will trigger the entire bundleHandler again, no need to deal with placeExtras here
  } else if (!isStatusDisabled(bundle)) {
    return Promise.all([
      addBundleToAlgoliaIndex(bundleId, bundle),
      addExtrasForBundle(bundleId, bundle),
    ]);
  }
  return true;
}

function handleUpdatedBundle(bundleId, change) {
  const bundleBefore = change.before.data();
  const bundleAfter = change.after.data();

  if (!isStatusEnabled(bundleBefore) && isStatusEnabled(bundleAfter)) {
    // if status changed to enabled: treat it as if it was added
    return Promise.all([
      photoCleaner(bundleId, collections.BUNDLES, bundleBefore, bundleAfter),
      addExtrasForBundle(bundleId, bundleAfter),
      addBundleToAlgoliaIndex(bundleId, bundleAfter),
    ]);
  } else if (isStatusEnabled(bundleBefore) && isStatusEnabled(bundleAfter)) {
    // if status always enabled: update placeExtras
    let promises = [
      photoCleaner(bundleId, collections.BUNDLES, bundleBefore, bundleAfter),
      updateExtrasForBundle(bundleId, bundleBefore, bundleAfter),
    ];
    if (shouldAlgoliaBundleBeUpdated(bundleBefore, bundleAfter)) {
      promises.push(updateBundleInAlgoliaIndex(bundleId, bundleAfter));
    }
    return Promise.all(promises);
  } else if (
    isStatusEnabled(bundleBefore) && // if status changed to disabled: treat it as if it was removed
    !isStatusEnabled(bundleAfter)
  ) {
    return Promise.all([
      photoCleaner(bundleId, collections.BUNDLES, bundleBefore, bundleAfter),
      removeExtrasForBundle(bundleId, bundleBefore),
      deleteBundleFromAlgoliaIndex(bundleId),
    ]);
  }

  return true;
}

function handleDeletedBundle(bundleId, change) {
  const bundle = change.before.data();
  photoCleaner(bundleId, collections.BUNDLES, bundle);
  if (isStatusEnabled(bundle)) {
    return Promise.all([
      deleteBundleFromAlgoliaIndex(bundleId),
      removeExtrasForBundle(bundleId, bundle),
    ]);
  }
  return true;
}

function shouldAlgoliaBundleBeUpdated(bundleBefore, bundleAfter) {
  if (!bundleBefore) {
    return false;
  }
  return (
    bundleBefore.title !== bundleAfter.title ||
    bundleBefore.subtitle !== bundleAfter.subtitle ||
    bundleBefore.text !== bundleAfter.text ||
    bundleBefore.lat !== bundleAfter.lat ||
    bundleBefore.lng !== bundleAfter.lng ||
    !objectsAreEquivalent(bundleBefore.categories, bundleAfter.categories) ||
    !objectsAreEquivalent(bundleBefore.coverPhoto, bundleAfter.coverPhoto) ||
    !objectsAreEquivalent(bundleBefore.thumbPhoto, bundleAfter.thumbPhoto)
  );
}
