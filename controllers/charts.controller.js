const sequelize = require("../model/connection");
const { mysqlcon } = require("../model/db");
const { DBMODELS } = require("../models/init-models");
const { Op } = require("sequelize");

// API endpoint to get chart data for application status based on time series
const getJobApplicationStatusByInstitute = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const { instituteId } = req.params;

    const jobDescriptions = await DBMODELS.job_descriptions.findAll({
      where: { institute_id: instituteId },
    });

    if (!jobDescriptions.length) {
      return res
        .status(404)
        .json({ message: "No job descriptions found for this institute" });
    }

    const now = new Date();
    let startDate, endDate, timeInterval;

    switch (timeRange) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = now;
        timeInterval = 1; // 1 hour
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = now;
        timeInterval = 24; // 1 day
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = now;
        timeInterval = 24 * 7; // 1 week
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = now;
        timeInterval = 24 * 30; // 1 month
        break;
      default:
        return res.status(400).json({ message: "Invalid time range" });
    }

    const categories = [];
    let currentTime = startDate;
    while (currentTime <= endDate) {
      categories.push(new Date(currentTime).toISOString());
      currentTime.setHours(currentTime.getHours() + timeInterval);
    }

    const series = [
      { name: "Pending", data: [] },
      { name: "Hired", data: [] },
      { name: "Hold", data: [] },
      { name: "Rejected", data: [] },
      { name: "Reviewed", data: [] },
    ];
    for (const category of categories) {
      const periodStart = new Date(category);
      const periodEnd = new Date(periodStart);
      periodEnd.setHours(periodEnd.getHours() + timeInterval);

      const applications = await DBMODELS.job_applications.findAll({
        where: {
          job_id: {
            [Op.in]: jobDescriptions.map((job) => job.id),
          },
          updatedAt: {
            [Op.between]: [periodStart, periodEnd],
          },
        },
      });

      series.forEach((status) => {
        const count = applications.filter(
          (app) => app.status.toLowerCase() === status.name.toLowerCase()
        ).length;
        status.data.push(count);
      });
    }
    const response = {
      series,
      options: {
        chart: {
          height: 350,
          type: "area",
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: "smooth",
        },
        xaxis: {
          type: "datetime",
          categories,
        },
        tooltip: {
          x: {
            format: "dd/MM/yy HH:mm",
          },
        },
      },
    };

    res.json({ response });
  } catch (error) {
    console.error("Error fetching job application status by institute:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Endpoint to get application status statistics and total applications
const getApplicationsStats = async (req, res) => {
  const { instituteId } = req.params;
  try {
    const jobDescriptions = await DBMODELS.job_descriptions.findAll({
      where: { institute_id: instituteId },
      attributes: ["id"], // Only select the required field to minimize data transfer
    });

    if (jobDescriptions.length === 0) {
      return res.json({
        totalApplications: 0,
        applicationStatusStats: {},
      });
    }

    const jobIds = jobDescriptions.map((job) => job.id);

    // Get application counts for each status
    const statusCounts = await DBMODELS.job_applications.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      where: {
        job_id: {
          [Op.in]: jobIds,
        },
      },
      group: ["status"],
      raw: true,
    });

    const applicationStatusStats = {};

    let totalApplications = 0;
    for (const { status, count } of statusCounts) {
      totalApplications += parseInt(count, 10);
      applicationStatusStats[status] = { count: parseInt(count, 10) };
    }

    // Calculate percentage for each status
    for (const status in applicationStatusStats) {
      applicationStatusStats[status].percentage =
        (applicationStatusStats[status].count / totalApplications) * 100;
    }

    // Create response object
    const response = {
      totalApplications,
      applicationStatusStats,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching application statistics: ", error);
    res.status(500).json({ message: "Server Error" });
  }
};
const getJobAppliedbyStatus = async (req, res) => {
  const { instituteId, status } = req.params;
  try {
    // Step 1: Get job descriptions by institute_id
    const jobDescriptions = await DBMODELS.job_descriptions.findAll({
      where: { institute_id: instituteId },
      attributes: ["id", "job_title"], // Only select the required fields to minimize data transfer
    });
    
    if (jobDescriptions.length === 0) {
      return res.json({
        totalApplications: 0,
        applicationStatusStats: {},
      });
    }

    const jobIds = jobDescriptions.map((job) => job.id);
    const jobIdToTitleMap = {};
    jobDescriptions.forEach((job) => {
      console.log(jobIdToTitleMap[job.id] = job.id)
      jobIdToTitleMap[job.id] = job.job_title;
    });

    // Step 2: Get user_ids, job_ids, and createdAt from job_applications based on jobIds and status
    const applicationQuery = `
      SELECT user_id, job_id, createdAt
      FROM job_applications 
      WHERE job_id IN (?) AND status = ?
    `;
    const [userApplicationsRows] = await mysqlcon
      .promise()
      .query(applicationQuery, [jobIds, status]);

    if (userApplicationsRows.length === 0) {
      return res.json({
        totalApplications: 0,
        applicationStatusStats: {
          [status]: {
            count: 0,
            users: [],
          },
        },
      });
    }

    const userIdsArray = userApplicationsRows.map((row) => row?.user_id);

    // Step 3: Get user details based on userIds
    const userQuery = `
      SELECT id, first_name, last_name, email
      FROM users 
      WHERE id IN (?)
    `;
    const [usersRows] = await mysqlcon
      .promise()
      .query(userQuery, [userIdsArray]);

    // Map user_id to job titles and applied dates
    const userJobMap = {};
    userApplicationsRows.forEach((row) => {
      if (!userJobMap[row.user_id]) {
        userJobMap[row.user_id] = { jobTitles: [], appliedDates: [] };
      }
      userJobMap[row.user_id].jobTitles.push(jobIdToTitleMap[row.job_id]);
      userJobMap[row.user_id].appliedDates.push(row.createdAt);
    });
    

    // Step 4: Structure the response data
    const userData = usersRows.map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name !== null ? user.last_name : ""}`.trim(),
      email: user.email,
      jobTitles: userJobMap[user.id] ? userJobMap[user.id].jobTitles : [],
      appliedDates: userJobMap[user.id] ? userJobMap[user.id].appliedDates : [],
    }));

    const totalApplications = userApplicationsRows.length;

    const applicationStatusStats = {
      [status]: {
        count: totalApplications,
        users: userData,
      },
    };

    // Step 5: Send the response
    res.json({ applicationStatusStats });
  } catch (error) {
    console.error("Error fetching application statistics: ", error);
    res.status(500).json({ message: "Server Error" });
  }
};


module.exports = {
  getJobApplicationStatusByInstitute,
  getApplicationsStats,
  getJobAppliedbyStatus,
};
