const errors = {
  // futourist frontend errors
  "futourist/empty-email": "Please enter your email",
  "futourist/empty-username": "Please choose your username",
  "futourist/empty-password": "Please enter your password",
  "futourist/empty-terms": "You have to agree with our terms and conditions",
  "futourist/captcha_validation_fail": `'I'm not a robot' verification failed. Don't be a robot and try again.`,
  "futourist/username_in_use": "Username is already in use. Choose another one.",
  "futourist/unknown_error": "An unknown error occured. Please refresh and try again.",
  "futourist/non_alphanumeric_username":
    "Username can consist only of lower case letters, numbers and underscores.",
  "futourist/invalid_username_length": "Username must be between 6 and 30 characters long.",
  "futourist/not_logged_in": "You must be logged in to do that",
  "futourist/invalid_firstname_length": "Your first name must be between 2 and 50 characters long.",
  "futourist/invalid_lastname_length": "Your last name must be between 2 and 50 characters long.",
  "futourist/invalid_bio_length": "Your bio must not be longer than 140 characters.",

  "futourist/invalid_field_key": "Received data contains invalid field keys",
  "futourist/invalid_report_code": "The sent report code is invalid",

  // writers application errors
  "futourist/invalid_writers_articlesample_length":
    "Your article sample must be between 500 and 3000 characters long.",
  "futourist/invalid_writers_expertise_length":
    "Expertise field must be at most 30 characters long.",
  "futourist/invalid_writers_wheredidyouhear_length":
    "'Where did you hear about Futourist' field must be at most 30 characters long.",
  "futourist/invalid_writers_additionalinfo_length":
    "'Additional info' field must be at most 30 characters long.",

  // firebase auth errors
  "auth/user-not-found": "This email is not registered. Please sign up first.",
  "auth/email-already-exists":
    "Email is already in use, please choose another one or try loging in.",
  "auth/invalid-password": "Password must be a be at least six characters long.",
  "auth/invalid-email":
    "The provided email address is invalid. Please enter a valid email address.",
  "auth/internal-error": "An unexpected error occured. Please refresh and try again.",
  "auth/wrong-password": "The password is incorrect, please try again.",

  //
};

module.exports = errors;
