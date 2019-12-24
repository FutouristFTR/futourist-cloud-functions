/*

Copyright (c) 2019 Futourist

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");
const collections = require("./constants/collections");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: functions.config().google.storage_bucket,
});

const db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

const authorizedFunctions = require("./controllers/authorizedFunctions");
const publicFunctions = require("./controllers/publicFunctions");

const video = require("./controllers/videoReviewUpload");
const imageUploadHandler = require("./controllers/imageUploadHandler");
const derivativeCleaner = require("./controllers/storageCleaners/derivativeCleaner");
const writeHandler = require("./controllers/writeHandler/");
const reviewHandler = require("./controllers/reviewHandler/");
const placeHandler = require("./controllers/placeHandler/");
const outfitHandler = require("./controllers/outfitHandler/");
const bundleHandler = require("./controllers/bundleHandler/");

exports.af = functions.https.onRequest(authorizedFunctions.expressApp);
exports.pf = functions.https.onRequest(publicFunctions.expressApp);
exports.derivativeCleaner = functions.storage.object().onDelete(derivativeCleaner);
exports.imageUploadHandler = functions.storage.object().onFinalize(imageUploadHandler);
exports.videoReviewUpload = functions.https.onRequest(video);

exports.writeHandler = functions.firestore
  .document("{collectionId}/{documentId}")
  .onWrite((change, context) => {
    process.setMaxListeners(20);
    let collectionId = context.params.collectionId;
    let documentId = context.params.documentId;

    return (
      writeHandler
        // Manages: .updated, .created in every collection
        .somethingWasWritten(collectionId, documentId, change)
        .then(() => {
          if (documentId === "_meta") {
            return true;
          }
          // Manages: placesExtras.latestReviews, placesExtras.rating, placesExtras.ratingCount, placesExtras.ratingSum, usersExtras.reviews
          if (collectionId === collections.REVIEWS) {
            return reviewHandler.reviewWasWritten(documentId, change);
          }
          if (collectionId === collections.PLACES) {
            return placeHandler.placeWasWritten(documentId, change);
          }
          // Manages: outfits.lat, outfits.lng, placeExtras.outfits
          if (collectionId === collections.OUTFITS) {
            return outfitHandler.outfitWasWritten(documentId, change);
          }
          // Manages: bundles.lat, bundles.lng, bundles.box, placeExtras.bundles
          if (collectionId === collections.BUNDLES) {
            return bundleHandler.bundleWasWritten(documentId, change);
          }
          return true;
        })
        .catch(error => {
          console.error(error);
        })
    );
  });

exports.onCreateUser = functions.auth.user().onCreate(async user => {
  console.log("NEW USER created", user);
  const formatUsername = require("./utils/formatUsername.js");
  let formattedUsername = formatUsername(user.displayName);

  console.log("Original: ", user.displayName, "Formatted: ", formattedUsername);
  let usersWithSuchUsername = await db
    .collection(collections.USERS)
    .where("username", "==", formattedUsername)
    .get();

  while (!usersWithSuchUsername.empty) {
    console.log(`Username ${formattedUsername} already exists...`);
    formattedUsername = formatUsername(formattedUsername, true);
    console.log(`...trying with username '${formattedUsername}'.`);

    usersWithSuchUsername = await db
      .collection(collections.USERS)
      .where("username", "==", formattedUsername)
      .get();
  }

  return await db.doc("users/" + user.uid).set({
    username: formattedUsername,
    status: 100,
    bio: "",
  });
});
