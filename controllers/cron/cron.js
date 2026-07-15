const cron = require('node-cron');
const {DBMODELS} = require("../../models/init-models")
const { Op } = require('sequelize');
const sequelize = require('../../model/connection');
const { QueryTypes } = require('sequelize');
const { updateRating } = require('../ratings.controller');


const deleteOldJobs = async () => {
  try {
    const currentDate = new Date();
    await sequelize.query(
     "Update job_descriptions set status = 'expired' where expiry_date < :currentDate",
      {
        replacements: { currentDate },
        type: QueryTypes.UPDATE,
      }
    );    
    console.log('Old jobs Status Updated successfully');
  } catch (error) {
    console.error('Error Updating old jobs:', error);
  }
};
cron.schedule('59 23 * * *', async () => {
  await deleteOldJobs()
});

cron.schedule('0 */4 * * *', async () => {
  // updateRating run every 4 hours
  updateRating();
});