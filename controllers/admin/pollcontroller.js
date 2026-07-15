const { DataTypes } = require('sequelize');
const  sequelize =require('../../model/connection')
const Poll = require('../../models/Polls');

// Get all polls
const getAllPolls = async (req, res) => {
  try {
    const polls = await Poll.findAll();
    res.json({ polls });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new poll
const createPoll = async (req, res) => {
  try {
    const { title, category, startDate, endDate, location } = req.body;
    const newPoll = await Poll.create({ title, category, startDate, endDate, location });
    res.json({ poll: newPoll });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an existing poll
const updatePoll = async (req, res) => {
  console.log(req.body);
  try {
    const { id } = req.params;
    const { title, category, startDate, endDate, location } = req.body;
    await Poll.update({ title, category, startDate, endDate, location }, { where: { id } });
    res.json({ message: 'Poll updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a poll
const deletePoll = async (req, res) => {
  try {
    const { id } = req.params;
    await Poll.destroy({ where: { id } });
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getNearbyPolls = async (req, res) => {
  try {
    const { state, category } = req.query;
    let query;
    let replacements = { state };

    // If state is "All States", return all data from all states
    if (state === "All States") {
      switch (category) {
        case "institutes":
          query = `
            SELECT ip.*, i.name, i.email, i.mobile, i.logo
            FROM institute_profiles AS ip
            JOIN institutes AS i ON ip.institute_id = i.id
          `;
          break;
        case "teachers":
          query = `SELECT * FROM Teachers`;
          break;
        case "students":
          query = `SELECT * FROM students`;
          break;
        case "professionals":
          query = `SELECT * FROM professionals`;
          break;
        default:
          return res.status(400).json({ error: "Invalid category" });
      }
    } else {
      switch (category) {
        case "institutes":
          query = `
            SELECT ip.*, i.name, i.email, i.mobile, i.logo
            FROM institute_profiles AS ip
            JOIN institutes AS i ON ip.institute_id = i.id
            WHERE ip.state = :state
          `;
          break;
        case "teachers":
          query = `SELECT * FROM Teachers WHERE state = :state`;
          break;
        case "students":
          query = `SELECT * FROM students WHERE state = :state`;
          break;
        case "professionals":
          query = `SELECT * FROM professionals WHERE state = :state`;
          break;
        default:
          return res.status(400).json({ error: "Invalid category" });
      }
    }

    const polls = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    //if empty data is returned, return an empty array
    if (polls.length === 0) {
      return res.status(204).json('No polls found');
    }
    res.json({ polls: polls, category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
    getAllPolls,
    createPoll,
    updatePoll,
    deletePoll,
    getNearbyPolls
};