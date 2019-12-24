const admin = require("firebase-admin");
const firebaseCollections = require("../../constants/collections");
const defaults = require("../../constants/defaults");

db = admin.firestore();

module.exports.somethingWasWritten = somethingWasWritten;

function somethingWasWritten(collectionId, docId, change) {
  if (!change.before.exists) {
    return handleWritingNewDocument(collectionId, docId, change);
  } else if (change.before.exists && change.after.exists) {
    return handleUpdatingDocument(collectionId, docId, change);
  } else if (!change.after.exists) {
    return handleDeletingDocument(collectionId, docId, change);
  }
  return Promise.reject(
    new Error(
      "somethingWasWritten: Could not figure out if this is a CREATE, UPDATE or DELETE operation."
    )
  );
}

function handleWritingNewDocument(collectionId, docId, change) {
  const docPath = makePathFromCollectionAndDocument(collectionId, docId);
  const document = change.after;

  console.info("CREATED DOC '" + docPath + "':", change.after.data());

  return addDefaultFields(document, collectionId);
}

function handleUpdatingDocument(collectionId, docId, change) {
  const beforeData = change.before.data();
  const afterData = change.after.data();

  // let changed = extractOnlyChangedFields(beforeData, afterData);
  const docPath = makePathFromCollectionAndDocument(collectionId, docId);

  // console.info("UPDATED DOC '" + docPath);

  if (
    // 1. updated document's timestamp has not been set yet ( before.updated == undefined), nor will it be after this request (after.updated == undefined)
    (beforeData.updated === undefined &&
      afterData.updated === undefined &&
      beforeData.created !== undefined) ||
    // 2. previous updated timestamp is the same as this one (we changed something, but timestamp is still old)
    (isFirebaseTimestamp(beforeData.updated) &&
      isFirebaseTimestamp(afterData.updated) &&
      firebaseTimestampToString(beforeData.updated) ===
        firebaseTimestampToString(afterData.updated))
  ) {
    const newUpdatedValue = admin.firestore.FieldValue.serverTimestamp();
    return change.after.ref.set({ updated: newUpdatedValue }, { merge: true });
  }
  return Promise.resolve(true);
}

function handleDeletingDocument(collectionId, docId, change) {
  const docPath = makePathFromCollectionAndDocument(collectionId, docId);
  console.info("DELETED DOC '" + docPath + "'");
  return Promise.resolve(true);
}

function addDefaultFields(document, collectionId) {
  const collectionsWithStatus = [
    firebaseCollections.PLACES,
    firebaseCollections.REVIEWS,
    firebaseCollections.OUTFITS,
    firebaseCollections.BUNDLES,
  ];
  let docData = document.data();
  let addedData = {
    created: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (!docData.status && collectionsWithStatus.indexOf(collectionId) >= 0) {
    addedData.status = defaults[collectionId + "_status"];
  }
  let createdPromise = document.ref.set(addedData, { merge: true });

  return createdPromise;
}

function makePathFromCollectionAndDocument(collectionId, documentId) {
  const documentPath = collectionId + "/" + documentId;
  return documentPath;
}

function extractOnlyChangedFields(beforeObject, afterObject) {
  beforeObject = JSON.parse(JSON.stringify(beforeObject));
  afterObject = JSON.parse(JSON.stringify(afterObject));

  let newBefore = {};
  let newAfter = {};

  for (var beforeKey in beforeObject) {
    if (isFirebaseTimestamp(beforeObject[beforeKey])) {
      beforeObject[beforeKey] = firebaseTimestampToString(beforeObject[beforeKey]);
    }
    if (isFirebaseTimestamp(afterObject[beforeKey])) {
      afterObject[beforeKey] = firebaseTimestampToString(afterObject[beforeKey]);
    }

    if (JSON.stringify(beforeObject[beforeKey]) !== JSON.stringify(afterObject[beforeKey])) {
      newBefore[beforeKey] = beforeObject[beforeKey];
      newAfter[beforeKey] = afterObject[beforeKey];
    }
  }

  for (var afterKey in afterObject) {
    if (isFirebaseTimestamp(beforeObject[beforeKey])) {
      beforeObject[beforeKey] = firebaseTimestampToString(beforeObject[beforeKey]);
    }
    if (isFirebaseTimestamp(afterObject[beforeKey])) {
      afterObject[beforeKey] = firebaseTimestampToString(afterObject[beforeKey]);
    }

    if (JSON.stringify(afterObject[afterKey]) !== JSON.stringify(beforeObject[afterKey])) {
      newAfter[afterKey] = afterObject[afterKey];
      newBefore[afterKey] = beforeObject[afterKey];
    }
  }

  return {
    before: newBefore,
    after: newAfter,
  };
}

function firebaseTimestampToString(firebaseTimestamp) {
  if (firebaseTimestamp instanceof admin.firestore.Timestamp) {
    return firebaseTimestamp.toDate().toString();
  } else {
    throw new Error("firebaseTimestamp is not an instance of admin.firestore.Timestamp");
  }
}

function isFirebaseTimestamp(firebaseTimestamp) {
  if (firebaseTimestamp === undefined) return false;
  return firebaseTimestamp instanceof admin.firestore.Timestamp;
}
