const cron = require('node-cron');
const {DBMODELS} = require("../../models/init-models")
const { Op } = require('sequelize');
const sequelize = require('../../model/connection');
const { QueryTypes } = require('sequelize');
// const { updateRating } = require('../ratings.controller');

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

// Disabled: random overwrite of user_profiles.rating broke real Gyani averages.
// cron.schedule('0 */4 * * *', async () => { updateRating(); });

// 1st of each month 09:00 — activity summary table email to top active users
cron.schedule('0 9 1 * *', async () => {
  try {
    const {
      runMonthlyActivitySummary,
    } = require('../../utils/monthlyActivitySummary');
    const result = await runMonthlyActivitySummary();
    console.log('Monthly activity summary:', result);
  } catch (error) {
    console.error('Monthly activity summary failed:', error);
  }
});