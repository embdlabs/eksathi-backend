const { postEventDetails, getEventsByInstituteId, getAllEvents, getEventByeventId, updateEventByeventId, deleteEventById, registerUser, } = require("../controllers/events.controller");
  const { routeVerifierJwt } = require("../service/auth.service");
  
  const EventsRouter = require("express").Router();
  
  EventsRouter.post("/postEvents",postEventDetails);
  EventsRouter.get("/getEventByinstituteId/:instituteId",getEventsByInstituteId);
  EventsRouter.get("/getAllevents",getAllEvents);
  EventsRouter.get("/getEventByeventId/:eventId",getEventByeventId);
  EventsRouter.get("/updateEventByeventId/:eventId",updateEventByeventId);
  EventsRouter.get("/deleteEventById/:deleteEventById",deleteEventById);
  EventsRouter.post("/registerUser",registerUser);


  module.exports = EventsRouter;