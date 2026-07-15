const { getNotifications, markRead, getAllNotification, markAllAsRead, getNotificationContent } = require('../controllers/notifications.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const NotificationRouter = require('express').Router();

NotificationRouter.get('/', routeVerifierJwt, getNotifications);
NotificationRouter.put('/mark-read', routeVerifierJwt, markRead);
NotificationRouter.patch('/mark-all-read', routeVerifierJwt, markAllAsRead);
NotificationRouter.get('/:userId', getAllNotification);
NotificationRouter.get('/content/:notificationType/:contentId', routeVerifierJwt, getNotificationContent);

module.exports = NotificationRouter;