"use strict";
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp({}, "publicHttpsFunctions");
const express = require("express");
const cors = require("cors")({ origin: true });
const axios = require("axios");
const collections = require("../../constants/collections");
const makeResponseErrorFromCode = require("../../utils/makeResponseErrorFromCode");

const app = express();

const db = admin.firestore();

app.use(cors);

app.post("/signup/", (req, res) => {
  return signup(req, res, false);
});

app.post("/signupMobile/", (req, res) => {
  return signup(req, res, true);
});

function signup(req, res, isMobile) {
  const { email, password, username } = req.body;

  console.log(`SIGNUP: RECEIVED ${isMobile ? "MOBILE" : "WEB"} signup request:`, "email:" + email);

  return new Promise((resolve, reject) => {
    if (!isMobile) {
      const recaptchaSecret = functions.config().google.recaptcha_secret;
      const { recaptcha } = req.body;

      axios
        .post(
          `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptcha}`,
          {},
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            },
          }
        )
        .then(response => {
          // validate captcha
          let apiResponse = response.data;
          if (apiResponse.success) {
            resolve(true);
            return true;
          } else {
            console.log("SIGNUP: RECAPTCHA verification failed, api response:", response.data);
            throw makeResponseErrorFromCode("futourist/captcha_validation_fail");
          }
        })
        .catch(error => reject(error));
    } else {
      resolve(true);
    }
  })
    .then(() => {
      // validate username
      if (!username.match(/^.{6,32}$/)) {
        throw makeResponseErrorFromCode("futourist/invalid_username_length");
      } else if (!username.match(/^[a-z0-9_]*$/)) {
        throw makeResponseErrorFromCode("futourist/non_alphanumeric_username");
      }
      return true;
    })
    .then(() => {
      // validate if duplicate username
      return db
        .collection(collections.USERS)
        .where("username", "==", username)
        .get();
    })
    .then(usersWithSameUsernameSnapshot => {
      if (!usersWithSameUsernameSnapshot.empty) {
        throw makeResponseErrorFromCode("futourist/username_in_use");
      }
      return true;
    })
    .then(() => {
      // create user
      const formatUsername = require("../../utils/formatUsername.js");
      return admin.auth().createUser({
        email: email,
        emailVerified: false,
        password: password,
        displayName: formatUsername(username),
        disabled: false,
      });
    })
    .then(userRecord => {
      console.log(`SIGNUP: SUCCESSFUL user creation (uid: ${userRecord.uid})`);
      return res.status(200).json(userRecord);
    })
    .catch(error => {
      console.log(`SIGNUP: ERROR:`, error);
      if (error.code && error.code.length) {
        const responseError = makeResponseErrorFromCode(error.code);
        return res.status(400).json({
          error: responseError,
        });
      } else {
        const responseError = makeResponseErrorFromCode("futourist/unknown_error");
        return res.status(500).json({
          error: responseError,
        });
      }
    });
}

module.exports.expressApp = app;
