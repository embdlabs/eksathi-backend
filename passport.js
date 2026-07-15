const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
})
passport.deserializeUser(function (user, done) {
    done(null, user);
});

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: '/oauth2/callback/google'
  },
  (accessToken, refreshToken, profile, done) => {
    console.log("Google profile:", profile);
    done(null, profile);
  }));
} else {
  console.warn("Google OAuth disabled: GOOGLE_ID / GOOGLE_SECRET not set");
}

module.exports = passport;
