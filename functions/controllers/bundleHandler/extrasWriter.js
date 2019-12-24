const admin = require("firebase-admin");
const collections = require("../../constants/collections");
const arrayDifference = require("../../helpers/arrayDifference");
const areArraysEquivalent = require("../../helpers/areArraysEquivalent");
const objectsAreEquivalent = require("../../helpers/objectsAreEquivalent");

const aggregatePlaceLocations = require("../../helpers/dataManipulators/aggregatePlaceLocations");
const mergePlaceCategories = require("../../helpers/dataManipulators/mergePlaceCategories");

const db = admin.firestore();

module.exports = {
  addExtrasForBundle,
  updateExtrasForBundle,
  removeExtrasForBundle,
};

function addExtrasForBundle(bundleId, bundle) {
  if (!bundle || !bundle.places || !bundle.places.length) {
    return false;
  }

  const placeIds = bundle.places;

  let batch = addBundleToPlaceInBatch(false, placeIds, bundleId, bundle);

  console.log(
    `WILL UPDATE DOCS in /${collections.PLACES_EXTRAS} (NEW BUNDLE added or switched to enabled status code), places to update:`,
    placeIds
  );

  const bundlePromise = writeBundleDetails(bundleId, bundle);
  const extrasPromise = batch.commit();

  return Promise.all([extrasPromise, bundlePromise]).catch(err => {
    console.error(`Failed to handle NEW BUNDLE (id: ${bundleId})`, err);
  });
}

function updateExtrasForBundle(bundleId, bundleBefore, bundleAfter) {
  let removedPlaceIds = arrayDifference(bundleBefore.places, bundleAfter.places);
  let addedPlaceIds = arrayDifference(bundleAfter.places, bundleBefore.places);

  let batch = db.batch();
  if (addedPlaceIds.length) {
    batch = addBundleToPlaceInBatch(batch, addedPlaceIds, bundleId, bundleAfter);
  }
  if (removedPlaceIds.length) {
    batch = removeBundleFromPlaceInBatch(batch, removedPlaceIds, bundleId);
  }

  if (!areArraysEquivalent(bundleBefore.places, bundleAfter.places)) {
    writeBundleDetails(bundleId, bundleAfter);
  }

  if (
    bundleBefore.title !== bundleAfter.title ||
    bundleBefore.subtitle !== bundleAfter.subtitle ||
    !objectsAreEquivalent(bundleBefore.thumbPhoto, bundleAfter.thumbPhoto) ||
    !objectsAreEquivalent(bundleBefore.coverPhoto, bundleAfter.coverPhoto)
  ) {
    batch = updateBundleInPlaceInBatch(batch, bundleId, bundleAfter, bundleAfter.places);
  }

  console.log(
    `WILL UPDATE DOCS in /${collections.PLACES_EXTRAS} (BUNDLE UPDATED - bundle_id: ${bundleId}), removed and added placeIds:`,
    removedPlaceIds,
    addedPlaceIds
  );

  return batch.commit().catch(err => {
    console.error(
      `Failed to write to /${collections.placeExtras} on UPDATED bundle (id: ${bundleId})`,
      err
    );
  });
}

function removeExtrasForBundle(bundleId, bundle) {
  if (!bundle || !bundle.places || !bundle.places.length) {
    return false;
  }

  const placeIds = bundle.places;

  let batch = removeBundleFromPlaceInBatch(false, placeIds, bundleId);

  console.log(
    `WILL UPDATE DOCS in /${collections.PLACES_EXTRAS} (BUNDLE REMOVED or switched to disabled status code - bundle_id: ${bundleId}), placeIds:`,
    placeIds
  );

  return batch.commit().catch(err => {
    console.error(
      `Failed to write to /${collections.placeExtras} on REMOVED bundle (id: ${bundleId})`,
      err
    );
  });
}

function addBundleToPlaceInBatch(batch, placeIdsToAdd, bundleId, bundleAfter) {
  if (!batch) {
    batch = db.batch();
  }
  if (placeIdsToAdd && placeIdsToAdd.length)
    placeIdsToAdd.forEach(placeId => {
      batch.set(
        db.collection(collections.PLACES_EXTRAS).doc(placeId),
        {
          bundles: {
            [bundleId]: {
              coverPhoto: bundleAfter.coverPhoto || null,
              thumbPhoto: bundleAfter.thumbPhoto || null,
              subtitle: bundleAfter.subtitle || null,
              title: bundleAfter.title || null,
            },
          },
        },
        { merge: true }
      );
    });

  return batch;
}

function removeBundleFromPlaceInBatch(batch, placeIdsToRemove, bundleId) {
  if (!batch) {
    batch = db.batch();
  }
  if (placeIdsToRemove && placeIdsToRemove.length)
    placeIdsToRemove.forEach(placeId => {
      batch.set(
        db.collection(collections.PLACES_EXTRAS).doc(placeId),
        {
          bundles: {
            [bundleId]: admin.firestore.FieldValue.delete(),
          },
        },
        { merge: true }
      );
    });

  return batch;
}

function updateBundleInPlaceInBatch(batch, bundleId, bundleAfter, placeIds) {
  if (placeIds && placeIds.length)
    placeIds.forEach(placeId => {
      batch.set(
        db.collection(collections.PLACES_EXTRAS).doc(placeId),
        {
          bundles: {
            [bundleId]: {
              coverPhoto: bundleAfter.coverPhoto || null,
              thumbPhoto: bundleAfter.thumbPhoto || null,
              subtitle: bundleAfter.subtitle || null,
              title: bundleAfter.title || null,
            },
          },
        },
        { merge: true }
      );
    });
  return batch;
}

function writeBundleDetails(bundleId, bundle) {
  console.log(
    `WILL UPDATE DOC /${collections.BUNDLES}/${bundleId} (calculating and setting new .lat, .lng, .box for bundle)`
  );

  const bundleRef = db.collection(collections.BUNDLES).doc(bundleId);

  if (!Array.isArray(bundle.places)) {
    bundle.places = [];
  }

  const placeRefs = bundle.places.map(placeId => {
    return db.collection(collections.PLACES).doc(placeId);
  });

  return db.runTransaction(t => {
    return t.getAll(...placeRefs).then(placeDocs => {
      let { lat, lng, latMin, latMax, lngMin, lngMax } = aggregatePlaceLocations(placeDocs);
      let categories = mergePlaceCategories(placeDocs);

      return t.set(
        bundleRef,
        {
          lat,
          lng,
          categories,
          box: {
            latMin,
            latMax,
            lngMin,
            lngMax,
          },
        },
        { merge: true }
      );
    });
  });
}
