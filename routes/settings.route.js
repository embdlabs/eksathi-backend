const { updatePrivacySettings, getPrivacySettings,updateEmail } = require('../controllers/settings.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const SettingsRouter = require('express').Router();

SettingsRouter.patch('/privacy/:userId', routeVerifierJwt, updatePrivacySettings);
SettingsRouter.get('/privacy/:userId', routeVerifierJwt, getPrivacySettings);
SettingsRouter.put('/email/:userId', routeVerifierJwt, updateEmail);



module.exports = SettingsRouter;