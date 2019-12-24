const makeResponseErrorFromCode = require("../../../utils/makeResponseErrorFromCode");
const collections = require("../../../constants/collections");
const admin = require("firebase-admin");
const db = admin.firestore();

function changeUserData(req, res) {
  const userId = req.user.uid;
  const user = req.body.user;
  return new Promise((resolve, reject) => {
    let validateFiledsX = validateFields(user, userId)
      .then(result => resolve(result))
      .catch(err => reject(err));
    return validateFiledsX;
  })
    .then(() => {
      return db
        .collection(collections.USERS)
        .doc(userId)
        .set(user, { merge: true });
    })
    .then(() => res.status(200).send())
    .catch(error => {
      if (error.code && error.code.length) {
        let errorToSend = makeResponseErrorFromCode(error.code);
        if (errorToSend.code === "futourist/unknown_error") {
          console.error(error);
        }
        return res.status(400).json({ error: errorToSend });
      } else {
        console.error(error);
        return res
          .status(500)
          .json({ error: makeResponseErrorFromCode("futourist/unknown_error") });
      }
    });
}

function validateFields(userData, userId) {
  const fieldNames = ["username", "bio"];
  const userDataFields = Object.keys(userData);

  userDataFields.forEach(fieldName => {
    if (fieldNames.indexOf(fieldName) < 0) {
      throw makeResponseErrorFromCode("futourist/invalid_field_key");
    }
  });
  if (userData.bio && userData.bio.length && userData.bio.length > 140)
    throw makeResponseErrorFromCode("futourist/invalid_bio_length");

  if (userData.username && !userData.username.match(/^.{6,28}$/)) {
    throw makeResponseErrorFromCode("futourist/invalid_username_length");
  } else if (userData.username && !userData.username.match(/^[a-z0-9_]*$/)) {
    throw makeResponseErrorFromCode("futourist/non_alphanumeric_username");
  }

  return db
    .collection(collections.USERS)
    .where("username", "==", userData.username)
    .get()
    .then(usersWithSameUsernameSnapshot => {
      if (usersWithSameUsernameSnapshot.size === 0) {
        return true;
      } else {
        let usernameExists = false;
        usersWithSameUsernameSnapshot.forEach(doc => {
          if (doc.id !== userId) usernameExists = true;
        });
        if (usernameExists) {
          throw makeResponseErrorFromCode("futourist/username_in_use");
        }
        return true;
      }
    });
}

module.exports = changeUserData;
