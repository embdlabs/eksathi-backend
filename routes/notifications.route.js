const { getNotifications, markRead, getAllNotification, markAllAsRead, clearAllNotifications, getNotificationContent } = require('../controllers/notifications.controller');
const { routeVerifierJwt } = require('../service/auth.service');

const NotificationRouter = require('express').Router();

NotificationRouter.get('/', routeVerifierJwt, getNotifications);
NotificationRouter.put('/mark-read', routeVerifierJwt, markRead);
NotificationRouter.patch('/mark-all-read', routeVerifierJwt, markAllAsRead);
NotificationRouter.delete('/clear-all', routeVerifierJwt, clearAllNotifications);
NotificationRouter.get('/:userId', routeVerifierJwt, getAllNotification);
NotificationRouter.get('/content/:notificationType/:contentId', routeVerifierJwt, getNotificationContent);

module.exports = NotificationRouter;