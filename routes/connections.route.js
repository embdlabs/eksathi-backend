// const { sendConnectionRequest, pendingRequestsSent,pendingRequestsReceived, actionConnection, getConnections } = require('../controllers/connections.controller');
// const { routeVerifierJwt } = require('../service/auth.service');

// const ConnectionRouter = require('express').Router();

// ConnectionRouter.post('/send-request', routeVerifierJwt, sendConnectionRequest);
// ConnectionRouter.get('/sent-pending',routeVerifierJwt,pendingRequestsSent);
// ConnectionRouter.get('/received-pending',routeVerifierJwt, pendingRequestsReceived);
// ConnectionRouter.get('/',routeVerifierJwt, getConnections);
// ConnectionRouter.put('/action/:connectionId', routeVerifierJwt, actionConnection);

// module.exports = ConnectionRouter;


const { 
    sendConnectionRequest, 
    pendingRequestsSent,
    pendingRequestsReceived, 
    actionConnection, 
    getConnections,
    checkConnectionStatus,
    handleConnectionRequest,
    withdrawConnection,
    hideConnection,
    unhideConnection,
    adminBlockConnectionUser,
    adminUnblockConnectionUser,
} = require('../controllers/connections.controller');
const { routeVerifierJwt, authorizeRole } = require('../service/auth.service');

const ConnectionRouter = require('express').Router();

// Send connection request with comprehensive checking
ConnectionRouter.post('/send-request', routeVerifierJwt, sendConnectionRequest);

// Check connection status between two users
ConnectionRouter.get('/check-status', routeVerifierJwt, checkConnectionStatus);

// Comprehensive connection handler for all scenarios
ConnectionRouter.post('/handle-request', routeVerifierJwt, handleConnectionRequest);

// Get pending requests sent by the user
ConnectionRouter.get('/sent-pending', routeVerifierJwt, pendingRequestsSent);

// Get pending requests received by the user
ConnectionRouter.get('/received-pending', routeVerifierJwt, pendingRequestsReceived);

// Accepted connections list is public (profile Connections tab for guests).
// Pending / send / action routes stay auth-protected below.
ConnectionRouter.get('/', getConnections);

// Accept or reject a connection request (with question creation on accept)
ConnectionRouter.put('/action/:connectionId', routeVerifierJwt, actionConnection);

// Hide / unhide (privacy) — connection stays accepted
ConnectionRouter.put('/:connectionId/hide', routeVerifierJwt, hideConnection);
ConnectionRouter.put('/:connectionId/unhide', routeVerifierJwt, unhideConnection);

// Admin: block connection requests to/from a user after abuse
ConnectionRouter.post(
  '/admin/block-user/:userId',
  routeVerifierJwt,
  authorizeRole(['admin', 'superadmin']),
  adminBlockConnectionUser
);
ConnectionRouter.delete(
  '/admin/block-user/:userId',
  routeVerifierJwt,
  authorizeRole(['admin', 'superadmin']),
  adminUnblockConnectionUser
);

// Withdraw pending request or remove accepted connection
ConnectionRouter.delete('/:connectionId', routeVerifierJwt, withdrawConnection);

module.exports = ConnectionRouter;