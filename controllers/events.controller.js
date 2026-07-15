const sequelize = require("../model/connection");
const { DBMODELS } = require("../models/init-models");
const { Op } = require("sequelize");

const postEventDetails = async (req, res) => {
  const {
    instituteId,
    instituteName,
    title,
    description,
    coordinatorName,
    email,
    contactNumber,
    eventStartDate,
    eventEndDate,
    registrationLink,
    location,
    chiefGuest,
    fees,
    award,
    remarks,
    programs
  } = req.body;

  try {
    // Start a transaction to ensure atomicity
    const result = await sequelize.transaction(async (transaction) => {
      // Insert the main event details
      const newEvent = await DBMODELS.events.create({
        institute_id: instituteId,
        instituteName,
        title,
        description,
        coordinatorName,
        email,
        contactNumber,
        eventStartDate,
        eventEndDate,
        registrationLink,
        location,
        chiefGuest,
        fees,
        award,
        remarks,
      }, { transaction });

      // Insert associated programs if they exist
      if (programs && programs.length > 0) {
        const programData = programs.map((program) => ({
          eventId: newEvent.id,
          program: program.name,
          date: program.date,
          startTime: program.startTime,
          endTime: program.endTime,
        }));
        await DBMODELS.event_programs.bulkCreate(programData, { transaction });
      }
      return newEvent;
    });

    console.log("resulte is ",result)
    res.status(201).json({
      success: true,
      message: 'Event saved successfully!',
      data: result,
    });
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while saving the event.',
      error: error.message,
    });
  }
};


const getEventsByInstituteId = async (req, res) => {
  const instituteId = req.params.instituteId;

  console.log(instituteId);

  try {
    // Find events by instituteId and include associated programs and user registrations
    const events = await DBMODELS.events.findAll({
      where: { institute_id: instituteId },
      include: [
        {
          model: DBMODELS.event_programs,
          as: 'programs', // Alias for associated programs
          attributes: ['program', 'date', 'startTime', 'endTime'],
        },
        {
          model: DBMODELS.event_registerUser,
          as: 'registrations', // Alias for event_registerUser
          attributes: ['user_id', 'email', 'firstName', 'lastName', 'phone', 'profile', 'role'], // Fetch user registration details
          // Removed include for users data
          required: false, // This will allow events without registrations to still be included
          include: [
            {
            model: DBMODELS.users,
            as: 'user',
            attributes: ['username']
            }
          ]
        }
      ],
    });

  console.log("All Eventes is ",events)
    if (events.length === 0) {
      return res.status(204).json({
        success: true,
        message: 'No events found for this institute.',
        results: []
      });
    }

    // Map the events to include user registrations
    const eventData = events.map(event => {
      const registrations = event.registrations.map(registration => {
        return {
          user_id: registration.user_id,
          email: registration.email,
          firstName: registration.firstName,
          lastName: registration.lastName,
          phone: registration.phone,
          profile: registration.profile,
          role: registration.role,
          username: registration.user?.username,
        };
      });

      return {
        ...event.toJSON(),
        registrations, // Add the registrations array with user data to the event
      };
    });

    res.status(200).json({
      success: true,
      results: eventData,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching events.',
      error: error.message,
    });
  }
};

// Function to fetch all events
const getAllEvents = async (req, res) => {
  try {
    // Fetch all events and include associated programs
    const events = await DBMODELS.events.findAll({
      include: [
        {
          model: DBMODELS.event_programs,
          as: 'programs', // Ensure this matches your association alias
          attributes: ['program', 'date', 'startTime', 'endTime'],
        }
      ],
    });

    if (events.length === 0) {
      return res.status(204).json({
        success: true,
        message: 'No events found.',
        results: []
      });
    }

    res.status(200).json({
      success: true,
      results: events,
    });
  } catch (error) {
    console.error('Error fetching all events:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching events.',
      error: error.message,
    });
  }
};


const getEventByeventId = async (req, res) => {
  const eventId = req.params.eventId;

  try {
    // Find the event by eventId and include associated programs
    const event = await DBMODELS.events.findOne({
      where: { id: eventId },
      include: [
        {
          model: DBMODELS.event_programs,
          as: 'programs', // Ensure this matches your association alias
          attributes: ['program', 'date', 'startTime', 'endTime'],
        }
      ],
    });

    if (!event) {
      return res.status(204).json({
        success: true,
        message: 'No event found for the given event ID.',
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      results: event,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the event.',
      error: error.message,
    });
  }
};


const updateEventByeventId = async (req, res) => {
  const eventId = req.params.eventId;

  const {
    instituteId,
    instituteName,
    title,
    description,
    coordinatorName,
    email,
    contactNumber,
    eventStartDate,
    eventEndDate,
    registrationLink,
    location,
    chiefGuest,
    fees,
    award,
    remarks,
    programs
  } = req.body;

  try {
    // Find the event by eventId
    const event = await DBMODELS.events.findOne({ where: { id: eventId } });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // Update event details
    event.institute_id = instituteId || event.institute_id;
    event.instituteName = instituteName || event.instituteName;
    event.title = title || event.title;
    event.description = description || event.description;
    event.coordinatorName = coordinatorName || event.coordinatorName;
    event.email = email || event.email;
    event.contactNumber = contactNumber || event.contactNumber;
    event.eventStartDate = eventStartDate || event.eventStartDate;
    event.eventEndDate = eventEndDate || event.eventEndDate;
    event.registrationLink = registrationLink || event.registrationLink;
    event.location = location || event.location;
    event.chiefGuest = chiefGuest || event.chiefGuest;
    event.fees = fees || event.fees;
    event.award = award || event.award;
    event.remarks = remarks || event.remarks;

    // Save updated event
    await event.save();

    // Update associated programs if provided
    if (programs && programs.length > 0) {
      // First, delete existing programs for this event
      await DBMODELS.event_programs.destroy({ where: { eventId: event.id } });

      // Insert new programs
      const programData = programs.map((program) => ({
        eventId: event.id,
        program: program.name,
        date: program.date,
        startTime: program.startTime,
        endTime: program.endTime,
      }));

      await DBMODELS.event_programs.bulkCreate(programData);
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
      data: event,
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the event.',
      error: error.message,
    });
  }
};

const deleteEventById = async (req, res) => {
  const eventId = req.params.eventId;  // Get eventId from the request parameters

  console.log("Event for delete : ",eventId)
  try {
    // Find the event by eventId to check if it exists
    const event = await DBMODELS.events.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found!',
      });
    }

    // Delete the event
    await event.destroy();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully!',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the event.',
      error: error.message,
    });
  }
};

const registerUser = async (req, res) => {
  // Extract the data from the request body
  const { userId, eventId, email, firstName, lastName, phone, profile, role } = req.body;

  // Validate the data
  if (!userId || !eventId || !email || !firstName || !lastName || !phone || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
     // Check if the user has already registered for the event
     const existingRegistration = await DBMODELS.event_registerUser.findOne({
      where: {
        user_id: userId,
        eventId: eventId,
      }
    });

    if (existingRegistration) {
      // If the registration already exists, return a message indicating the user is already registered
      return res.status(400).json({
        message: 'You have already registered for this event.',
      });
    }
    // Create a new registration record in the event_registerUser table
    const registration = await DBMODELS.event_registerUser.create({
      user_id: userId,
      eventId,
      email,
      firstName,
      lastName,
      phone,
      profile,
      role
    });

    // Respond with a success message
    return res.status(201).json({

      message: 'Successfully registered for the event',
      registration,
    });
  } catch (error) {
    // Handle any errors
    console.error('Error registering user:', error);
    return res.status(500).json({
      message: 'Error registering user. Please try again.',
      error: error.message,
    });
  }
};

module.exports = { registerUser };


module.exports = {
  postEventDetails,
  getEventsByInstituteId,
  getAllEvents,
  getEventByeventId,
  updateEventByeventId,
  deleteEventById,
  registerUser,
};
