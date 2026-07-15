const { DBMODELS } = require("../models/init-models");

const getUniversities = async (req, res) => {
    try {
        const universities = await DBMODELS.university.findAll({
            attributes: ['id', 'name', 'location', 'establishedYear', 'website', 'logo'],
        });
        return res.status(200).json(universities);
    } catch (error) {
        console.error('Error fetching universities:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const getUniversity = async (req, res) => {
    const universityId = req.params.id;
    try {
        const university = await DBMODELS.university.findByPk(universityId, {
            attributes: ['id', 'name', 'location', 'establishedYear', 'website', 'logo'],
        });
        if (!university) {
            return res.status(404).json({ message: 'University not found' });
        }
        return res.status(200).json(university);
    } catch (error) {
        console.error('Error fetching university:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const createUniversity = async (req, res) => {
    const { name, location, establishedYear, website, logo } = req.body;
    console.log('Creating University with Data : ', { name, location, establishedYear, website, logo });
    try {
        const university = await DBMODELS.university.create({
            name,
            location,
            establishedYear,
            website,
            logo,
        });
        return res.status(201).json(university);
    } catch (error) {
        console.error('Error creating university:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const updateUniversity = async (req, res) => {
    const universityId = req.params.id;
    const { name, location, establishedYear, website, logo } = req.body;
    try {
        const university = await DBMODELS.university.findByPk(universityId);
        if (!university) {
            return res.status(404).json({ message: 'University not found' });
        }
        await university.update({
            name,
            location,
            establishedYear,
            website,
            logo,
        });
        return res.status(200).json(university);
    } catch (error) {
        console.error('Error updating university:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteUniversity = async (req, res) => {
    const universityId = req.params.id;
    try {
        const university = await DBMODELS.university.findByPk(universityId);
        if (!university) {
            return res.status(404).json({ message: 'University not found' });
        }
        await university.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Error deleting university:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const createUniversitiesBulk = async (req, res) => {
    const universitiesData = req.body; // Array of university objects

    try {
        const universities = await DBMODELS.university.bulkCreate(universitiesData);
        return res.status(201).json(universities);
    } catch (error) {
        console.error('Error creating universities:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getUniversities,
    getUniversity,
    createUniversity,
    createUniversitiesBulk,
    updateUniversity,
    deleteUniversity
}