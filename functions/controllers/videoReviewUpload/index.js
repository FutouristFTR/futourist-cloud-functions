const express = require("express");
const axios = require("axios");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const pino = require("express-pino-logger")();
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");
const functions = require("firebase-functions");

const validateFirebaseIdToken = require("../../utils/validateFirebaseIdToken");
const collections = require("../../constants/collections");

// CLOUD FUNCTION INITIALIZATION
const app = express();
app.use(cors);
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(pino);

const db = admin.firestore();

// CONSTANT VARIABLES
const upload = {
  ASSET_CREATED: "video.upload.asset_created",
  READY: "video.asset.ready",
  ERRORED: "video.asset.errored",
};

// DYNAMIC VARIABLES
let uploadMediaSet = {};

// function pushNotification(mediaId, title, body, icon) {
//   var message = {
//     data: {
//       title,
//       body,
//       icon,
//     },
//     token: uploadMediaSet[mediaId].fcmToken,
//   };

//   admin
//     .messaging()
//     .send(message)
//     .then(response => console.log("Successfully sent message:", response))
//     .catch(error => console.log("Error sending message:", error));
// }

app.post("/getUrl", [validateFirebaseIdToken], (request, response) => {
  const credentials = Buffer.from(
    functions.config().mux.token_id + ":" + functions.config().mux.token_secret
  ).toString("base64");
  return axios({
    method: "post",
    url: "https://api.mux.com/video/v1/uploads",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    data: {
      cors_origin: "https://" + request.get("host"),
      new_asset_settings: { playback_policy: ["public"] },
    },
  })
    .then(resp => {
      uploadMediaSet[resp.data.data.id] = {
        // fcmToken: request.body.fcmToken,
        placeId: request.body.placeId,
        rating: request.body.rating,
        text: request.body.text,
        userId: request.body.userId,
        type: request.body.type,
        timeCreated: Date.now(),
      };
      return response.json(resp.data.data);
    })
    .catch(err => {
      console.error(err);
    });
});

app.post("/webhook", (request, response) => {
  const webhook = request.body;

  switch (webhook.type) {
    case upload.ASSET_CREATED: {
      try {
        uploadMediaSet[webhook.data.asset_id] = {
          // fcmToken: uploadMediaSet[webhook.data.id].fcmToken,
          assetId: webhook.data.asset_id,
          placeId: uploadMediaSet[webhook.data.id].placeId,
          rating: uploadMediaSet[webhook.data.id].rating,
          text: uploadMediaSet[webhook.data.id].text,
          userId: uploadMediaSet[webhook.data.id].userId,
          type: uploadMediaSet[webhook.data.id].type,
          timeCreated: uploadMediaSet[webhook.data.id].timeCreated,
        };
        delete uploadMediaSet[webhook.data.id];
      } catch (err) {
        console.error(err, "(uploadMediaSet probably doesn't contain the expected review)");
      }
      break;
    }

    case upload.READY: {
      if (!uploadMediaSet[webhook.data.id]) break;

      const credentials = Buffer.from(
        functions.config().mux.token_id + ":" + functions.config().mux.token_secret
      ).toString("base64");
      return axios({
        method: "post",
        url: `https://api.mux.com/video/v1/assets/${request.body.data.id}/playback-ids`,
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        data: {
          policy: "public",
        },
      })
        .then(res => {
          return db
            .collection(collections.REVIEWS)
            .doc()
            .set({
              placeId: uploadMediaSet[webhook.data.id].placeId,
              rating: uploadMediaSet[webhook.data.id].rating,
              text: uploadMediaSet[webhook.data.id].text,
              userId: uploadMediaSet[webhook.data.id].userId,
              type: uploadMediaSet[webhook.data.id].type,
              assetId: uploadMediaSet[webhook.data.id].assetId,
              mediaId: res.data.data.id,
            });
        })
        .then(() => {
          console.log(
            `Succssfully added new video review (place: ${
              uploadMediaSet[webhook.data.id].placeId
            }, user: ${uploadMediaSet[webhook.data.id].userId})`
          );
          delete uploadMediaSet[webhook.data.id];
          return response.status(200).send();
        })
        .catch(error => {
          console.error("ERROR retrieving the playback_id - ", error);
          return response.status(200).send();
        });
    }

    case upload.ERRORED: {
      // pushNotification(
      //   webhook.data.id,
      //   "Review upload",
      //   "Something went wrong while uploading your review. Try again later..",
      //   "https://icon2.kisspng.com/20180320/zfe/kisspng-red-x-x-mark-computer-icons-clip-art-red-x-png-5ab19105d9ebc7.5641284615215864378926.jpg"
      // );
      delete uploadMediaSet[webhook.data.id];
      response.status(200).send();
      console.error("ERROR returned by MUX", request.body);
      break;
    }

    default: {
      // console.log("case default - ", request.body.data, uploadMediaSet, webhook.data.id);
      break;

      // const oneHour = 60 * 60 * 1000;
      // const timeNow = Date.now();
      // try {
      //   for (let mediaKey of Object.keys(uploadMediaSet)) {
      //     if (timeNow - uploadMediaSet[mediaKey].timeCreated >= oneHour) {
      //       delete uploadMediaSet[mediaKey];
      //     }
      //   }
      // } catch (e) {
      //   console.info("INFO - uploadMediaSet empty", uploadMediaSet);
      // }
      // console.info("INFO -", request.body);

      // try {
      //   if (Object.keys(uploadMediaSet).length > 0) {
      //     logExistingMediaSet();
      //   }
      // } catch (e) {
      //   console.info("INFO - uploadMediaSet is empty :)");
      // }

      // break;
    }
  }
  return response.status(200).send();
});

module.exports = app;
