const sequelize = require("../model/connection");
const { DBMODELS } = require("../models/init-models");
const { Op } = require("sequelize");

const getLastNewApplicants = async (req, res) => {
  const { instituteId } = req.params;
  try {
    const jobDescriptions = await DBMODELS.job_descriptions.findAll({
      where: { institute_id: instituteId },
    });

    // Get the last 6 new job applicants
    const newApplicants = await DBMODELS.job_applications.findAll({
      where: {
        job_id: {
          [Op.in]: jobDescriptions.map((job) => job.id),
        },
      },
      order: [["createdAt", "DESC"]],
      limit: 6,
      include: [
        {
          model: DBMODELS.users,
          as: "users",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "role",
            "display_name",
            "avatar_url",
          ],
        },
        {
          model: DBMODELS.job_descriptions,
          as: "job_descriptions",
          attributes: ["id", "job_title"],
        },
      ],
    });

    res.json(newApplicants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getJobPostsWithApplicationsCount = async (req, res) => {
  const { instituteId } = req.params;
  try {
    const jobPosts = await DBMODELS.job_descriptions.findAll({
      where: { institute_id: instituteId },
      include: [
        {
          model: DBMODELS.job_applications,
          as: "job_applications",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "title",
        "expiry_date",
        [
          sequelize.fn("COUNT", sequelize.col("job_applications.id")),
          "applications_count",
        ],
      ],
      group: ["job_descriptions.id"],
    });

    res.json(jobPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getLastNewApplicants,
  getJobPostsWithApplicationsCount,
};
