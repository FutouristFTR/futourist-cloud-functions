const admin = require("firebase-admin");
const collections = require("../../constants/collections");
const arrayDifference = require("../../helpers/arrayDifference");
const areArraysEquivalent = require("../../helpers/areArraysEquivalent");
const objectsAreEquivalent = require("../../helpers/objectsAreEquivalent");

const aggregatePlaceLocations = require("../../helpers/dataManipulators/aggregatePlaceLocations");
const mergePlaceCategories = require("../../helpers/dataManipulators/mergePlaceCategories");

const db = admin.firestore();

module.exports = {
  addExtrasForOutfit,
  updateExtrasForOutfit,
  removeExtrasForOutfit,
};

function addExtrasForOutfit(outfitId, outfit) {
  if (
    !outfit ||
    !outfit.morning ||
    !outfit.evening ||
    !outfit.day ||
    (!outfit.morning.places && !outfit.day.places && outfit.evening.places)
  ) {
    return false;
  }

  const placeIds = [...outfit.morning.places, ...outfit.day.places, ...outfit.evening.places];

  let batch = addOutfitToPlaceInBatch(false, placeIds, outfitId, outfit);

  console.log(
    `WILL UPDATE DOCS in /${collections.PLACES_EXTRAS} (NEW OUTFIT added or switched to enabled status code), places to update:`,
    placeIds
  );

  const outfitPromise = writeOutfitDetails(outfitId, outfit);
  const extrasPromise = batch.commit();

  return Promise.all([extrasPromise, outfitPromise]).catch(err => {
    console.error(`Failed to handle NEW OUTFIT (id: ${outfitId})`, err);
  });
}

function updateExtrasForOutfit(outfitId, outfitBefore, outfitAfter) {
  // FOR REMOVED PLACES

  const beforePlaces = [
    ...outfitBefore.morning.places,
    ...outfitBefore.day.places,
    ...outfitBefore.evening.places,
  ];
  const afterPlaces = [
    ...outfitAfter.morning.places,
    ...outfitAfter.day.places,
    ...outfitAfter.evening.places,
  ];

  let removedPlaceIds = arrayDifference(beforePlaces, afterPlaces);
  let addedPlaceIds = arrayDifference(afterPlaces, beforePlaces);

  let batch = db.batch();
  if (addedPlaceIds.length) {
    batch = addOutfitToPlaceInBatch(batch, addedPlaceIds, outfitId, outfitAfter);
  }
  if (removedPlaceIds.length) {
    batch = removeOutfitFromPlaceInBatch(batch, removedPlaceIds, outfitId);
  }

  if (!areArraysEquivalent(beforePlaces, afterPlaces)) {
    writeOutfitDetails(outfitId, outfitAfter);
  }

  if (
    !objectsAreEquivalent(outfitBefore.thumbPhoto, outfitAfter.thumbPhoto) ||
    !objectsAreEquivalent(outfitBefore.coverPhoto, outfitAfter.coverPhoto) ||
    outfitBefore.title !== outfitAfter.title ||
    outfitBefore.subtitle !== outfitAfter.subtitle
  ) {
    batch = updateOutfitInPlaceInBatch(batch, outfitId, outfitAfter, afterPlaces);
  }

  console.log(
    `WILL UPDATE DOCS in /${collections.PLACES_EXTRAS} (OUTFIT UPDATED - outfit_id: ${outfitId}), removed and added placeIds:`,
    removedPlaceIds,
    addedPlaceIds
  );

  return batch.commit().catch(err => {
    console.error(
      `Failed to write to /${collections.placeExtras} on UPDATED outfit (id: ${outfitId})`,
      err
    );
  });
}

function removeExtrasForOutfit(outfitId, outfit) {
  if (
    !outfit ||
    !outfit.morning ||
    !outfit.evening ||
    !outfit.day ||
    (!outfit.morning.places && !outfit.day.places && outfit.evening.places)
  ) {
    return false;
  }

  const placeIds = [...outfit.morning.places, ...outfit.day.places, ...outfit.evening.places];

  let batch = removeOutfitFromPlaceInBatch(false, placeIds, outfitId);

  console.log(
    `WILL UPDATE DOCS in /${collections.PLACES_EXTRAS} (OUTFIT REMOVED or switched to disabled status code - outfit_id: ${outfitId}), placeIds:`,
    placeIds
  );

  return batch.commit().catch(err => {
    console.error(
      `Failed to write to /${collections.placeExtras} on REMOVED outfit (id: ${outfitId})`,
      err
    );
  });
}

function addOutfitToPlaceInBatch(batch, placeIdsToAdd, outfitId, outfit) {
  if (!batch) {
    batch = db.batch();
  }
  if (placeIdsToAdd && placeIdsToAdd.length)
    placeIdsToAdd.forEach(placeId => {
      batch.set(
        db.collection(collections.PLACES_EXTRAS).doc(placeId),
        {
          outfits: {
            [outfitId]: {
              title: outfit.title || null,
              subtitle: outfit.subtitle || null,
              coverPhoto: outfit.coverPhoto || null,
              thumbPhoto: outfit.thumbPhoto || null,
            },
          },
        },
        { merge: true }
      );
    });

  return batch;
}

function removeOutfitFromPlaceInBatch(batch, placeIdsToRemove, outfitId) {
  if (!batch) {
    batch = db.batch();
  }
  if (placeIdsToRemove && placeIdsToRemove.length)
    placeIdsToRemove.forEach(placeId => {
      batch.set(
        db.collection(collections.PLACES_EXTRAS).doc(placeId),
        {
          outfits: {
            [outfitId]: admin.firestore.FieldValue.delete(),
          },
        },
        { merge: true }
      );
    });

  return batch;
}

function updateOutfitInPlaceInBatch(batch, outfitId, outfitAfter, placeIds) {
  if (placeIds && placeIds.length)
    placeIds.forEach(placeId => {
      batch.set(
        db.collection(collections.PLACES_EXTRAS).doc(placeId),
        {
          outfits: {
            [outfitId]: {
              title: outfitAfter.title || null,
              subtitle: outfitAfter.subtitle || null,
              coverPhoto: outfitAfter.coverPhoto || null,
              thumbPhoto: outfitAfter.thumbPhoto || null,
            },
          },
        },
        { merge: true }
      );
    });
  return batch;
}

function writeOutfitDetails(outfitId, outfit) {
  console.log(
    `WILL UPDATE DOC /${collections.OUTFITS}/${outfitId} (calculating and setting new .lat, .lng, .box for outfit)`
  );

  const outfitRef = db.collection(collections.OUTFITS).doc(outfitId);

  if (!outfit.morning.places) {
    outfit.morning.places = [];
  }

  if (!outfit.day.places) {
    outfit.day.places = [];
  }

  if (!outfit.evening.places) {
    outfit.evening.places = [];
  }

  let allPlaces = [...outfit.morning.places, ...outfit.day.places, ...outfit.evening.places];

  const placeRefs = allPlaces.map(placeId => {
    return db.collection(collections.PLACES).doc(placeId);
  });

  return db.runTransaction(t => {
    return t.getAll(...placeRefs).then(placeDocs => {
      let { lat, lng, latMin, latMax, lngMin, lngMax } = aggregatePlaceLocations(placeDocs);
      let categories = mergePlaceCategories(placeDocs);

      return t.update(
        outfitRef,
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
