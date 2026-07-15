const { Op, DataTypes } = require('sequelize');
const { findExpertise, getUserStats, getLastActive, getAvailableLocations, getAvailableExpertise, getConnectionStatus } = require("../service/utilities.service");
const { sequelize } = require("../model/db");
const { DBMODELS } = require('../models/init-models');

const getSuggestedExperts = async (req, res) => {
    const { userId, category, search, tags, skill, location, expertise, rating, page, limit, sort } = req.body;
    console.log("Suggested Expert Body: ", req.body);

    // Set default values for pagination and sorting
    const currentPage = page || 1;
    const itemsPerPage = limit || 5;
    const sortField = sort || 'first_name';
    const sortOrder = sort === 'rating' ? 'DESC' : 'ASC';

    try {
        // Build the query conditions
        let whereConditions = {
            role: {
                [Op.in]: ['teacher', 'professional']
            }
        };

        // Remove logged in user from the list
        if (userId) {
            whereConditions.id = { [Op.ne]: userId };
        }

        // Apply search filter if provided
        if (search) {
            whereConditions[Op.or] = [
                { first_name: { [Op.like]: `%${search}%` } },
                { last_name: { [Op.like]: `%${search}%` } },
                { location: { [Op.like]: `%${search}%` } },
                { '$skills.skill_name$': { [Op.like]: `%${search}%` } }
            ];
        }

        // Apply skill filter if provided
        if (skill && skill !== 'undefined') {
            whereConditions['$skills.skill_name$'] = { [Op.like]: `%${skill}%` };
        }

        // Apply tag filter if provided
        if (tags) {
            const tagIds = JSON.parse(tags).map(tag => tag.id);
            whereConditions['$tags.id$'] = { [Op.in]: tagIds };
        }

        // Apply location filter if provided
        if (location) {
            whereConditions.location = { [Op.like]: `%${location}%` };
        }

        // Apply expertise filter if provided
        if (expertise) {
            whereConditions['$skills.skill_name$'] = { [Op.like]: `%${expertise}%` };
        }

        // Apply rating filter if provided
        let havingConditions = {};
        if (rating) {
            havingConditions.average_rating = { [Op.gte]: rating };
        }

        // Query to fetch users with the specified conditions
        const results = await DBMODELS.users.findAll({
            where: whereConditions,
            include: [
                {
                    model: DBMODELS.skills,
                    as: 'skills', // Ensure alias matches the association definition
                    attributes: ['skill_name'],
                    required: false
                },
                {
                    model: DBMODELS.user_profiles,
                    as: 'user_profiles', // Ensure alias matches the association definition
                    attributes: ['rating'],
                    required: false
                },
                {
                    model: DBMODELS.ratings,
                    as: 'ratings', // Ensure alias matches the association definition
                    attributes: [],
                    required: false
                }
            ],
            attributes: {
                include: [
                    [sequelize.fn('AVG', sequelize.col('ratings.rating')), 'average_rating']
                ]
            },
            group: ['users.id'], // Group by user to avoid duplicate rows
            having: havingConditions,
            order: [[sortField === 'location' ? 'location' : sortField === 'rating' ? sequelize.literal('average_rating') : 'first_name', sortOrder]],
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
            subQuery: false
        });

        // Process results
        for (let user of results) {
            const userData = user.get({ plain: true }); // Get plain data to avoid instance methods
            userData.skills = userData.skills.map(skill => skill.skill_name);
            userData.rating = userData.user_profiles ? parseFloat(userData.user_profiles.rating) : null;
            userData.expertise = userData.skills.map(skill => skill.skill_name); // Adjust this logic if needed
            userData.last_active = await getLastActive(userData.id);
            if (userId || userId !== "undefined") {
                userData.connectionStatus = await getConnectionStatus(userId, userData.id).catch(err => console.log(err));
            }
            userData.average_rating = parseFloat(userData.average_rating || 0.0);
        }

        // Query to fetch total count of results
        const totalCount = await DBMODELS.users.count({
            where: whereConditions,
            include: [
                {
                    model: DBMODELS.skills,
                    as: 'skills', // Ensure alias matches the association definition
                    required: false
                },
                {
                    model: DBMODELS.ratings,
                    as: 'ratings', // Ensure alias matches the association definition
                    required: false
                },
                {
                    model: DBMODELS.user_profiles,
                    as: 'user_profiles', // Ensure alias matches the association definition
                    attributes: ['rating'],
                    required: false
                },
            ],
            distinct: true
        });

        const locations = await getAvailableLocations();
        const expertises = await getAvailableExpertise();

        return res.status(200).json({
            message: "Users Found",
            results,
            totalCount,
            locations,
            expertises
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getSuggestedExperts };
