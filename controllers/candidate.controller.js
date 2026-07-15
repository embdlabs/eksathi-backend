const { mysqlcon } = require("../model/db");
const { DataTypes } = require("sequelize");
const sequelize = require("../model/connection");
const research = require("../models/research");
const Skills = require("../models/skills")(sequelize, DataTypes);


const addExperience = async (req, res) => {
    // Add the ability to create a new experience for the user
    const { title, description, organization, ctc, subject, standard, location, employment_type, is_working, start_date, end_date, user_id } = req.body;

    try {
        //Query to insert the new experience
        let query = `INSERT INTO work_experience (user_id, title, description, organization, ctc, subject, standard, location, employment_type, is_working, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        //Inserting the new experience
        mysqlcon.query(query, [user_id, title, description, organization, ctc, subject, standard, location, employment_type, is_working, start_date, end_date], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            return res.status(200).json({ message: "New Experience Added", result });
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error creating new experience' });
    }
};

// Get a specific work experience
const getUserExperiences = (req, res) => {
    const id = req.params.id;

    try {
        mysqlcon.query('SELECT * FROM work_experience WHERE user_id = ?', [id], (error, results) => {
            if (error) {
                console.error('Error retrieving work experience:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else if (results.length === 0) {
                res.status(404).json({ error: 'Work experience not found' });
            } else {
                res.status(200).json({ message: "Experiences Found", results });
            }
        });
    } catch (error) {
        console.error('Error retrieving work experience:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update a work experience
const updateExperience = (req, res) => {
    const id = req.params.id;
    // console.log("Experience Id: =====> ",id)
    const workExperience = req.body;

    try {
        mysqlcon.query('UPDATE work_experience SET ? WHERE id = ?', [workExperience, id], (error, result) => {
            if (error) {
                console.error('Error updating work experience:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Work experience not found' });
            } else {
                res.status(200).json({ message: 'Work experience updated' });
            }
        });
    } catch (error) {
        console.error('Error updating work experience:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a work experience
const deleteExperience = (req, res) => {
    // const id = req.params.id;
    const experienceId = req.params.id;
    const query = 'DELETE FROM work_experience WHERE id = ?';
    const values = [experienceId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Experience not found' });
            }
            return res.status(200).json({ message: 'Experience deleted successfully' });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// CRUD operations of Education

// Create Education 

const AddEducation = (req, res) => {
    const { user_id, institution_name, degree, field_of_study, start_date, end_date, description, grade } = req.body;
    const query = `
      INSERT INTO educations (user_id, institution_name, degree, field_of_study, start_date, end_date, description, grade)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [user_id, institution_name, degree, field_of_study, start_date, end_date, description, grade];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            return res.status(201).json({ message: 'Education created successfully', educationId: result.insertId });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getEducation = (req, res) => {
    const educationId = req.params.id;
    const query = 'SELECT * FROM educations WHERE id = ?';
    const values = [educationId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: 'Education not found' });
            }
            return res.status(200).json(result[0]);
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getUserEducation = (req, res) => {
    const educationId = req.params.id;
    const query = 'SELECT * FROM educations WHERE user_id = ?';
    const values = [educationId];

    try {
        mysqlcon.query(query, values, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Education not found' });
            }
            return res.status(200).json({
                message: 'Educations Found',
                results
            });
        });
    } catch (error) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const updateEducation = (req, res) => {
    const educationId = req.params.id;
    const { institution_name, degree, field_of_study, start_date, end_date, description, grade } = req.body;
    const query = `
      UPDATE educations
      SET institution_name = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?, description = ?, grade = ?
      WHERE id = ?
    `;
    const values = [institution_name, degree, field_of_study, start_date, end_date, description, grade, educationId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Education not found' });
            }
            return res.status(200).json({ message: 'Education updated successfully' });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const deleteEducation = (req, res) => {
    const educationId = req.params.id;
    const query = 'DELETE FROM educations WHERE id = ?';
    const values = [educationId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Education not found' });
            }
            return res.status(200).json({ message: 'Education deleted successfully' });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const addCertification = (req, res) => {
    const { user_id, certification_name, issuing_organization, certificate_id, certificate_url, issue_date, expiration_date } = req.body;

    const query = 'INSERT INTO certifications (user_id, certification_name, issuing_organization, certificate_id, certificate_url, issue_date, expiration_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [user_id, certification_name, issuing_organization, certificate_id, certificate_url, issue_date, expiration_date];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            return res.status(201).json({ message: 'Certification created successfully' });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getCertifications = (req, res) => {
    try {
        const query = 'SELECT * FROM certifications';

        mysqlcon.query(query, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            return res.status(200).json(results);
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getUserCertifications = (req, res) => {
    const certificationId = req.params.id;

    const query = 'SELECT * FROM certifications WHERE user_id = ?';
    const values = [certificationId];

    try {
        mysqlcon.query(query, values, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Certification not found' });
            }

            return res.status(200).json({
                message: 'Certification found',
                results
            });
        });
    } catch (error) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const updateCertification = (req, res) => {
    const certificationId = req.params.id;
    const { user_id, certification_name, issuing_organization, certificate_id, certificate_url, issue_date, expiration_date } = req.body;

    const query = 'UPDATE certifications SET user_id = ?, certification_name = ?, issuing_organization = ?, certificate_id = ?, certificate_url = ?, issue_date = ?, expiration_date = ? WHERE id = ?';
    const values = [user_id, certification_name, issuing_organization, certificate_id, certificate_url, issue_date, expiration_date, certificationId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Certification not found' });
            }

            return res.status(200).json({ message: 'Certification updated successfully' });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const deleteCertification = (req, res) => {
    const certificationId = req.params.id;

    const query = 'DELETE FROM certifications WHERE id = ?';
    const values = [certificationId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                // console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Certificate not found' });
            }
            return res.status(200).json({ message: 'Certificate deleted successfully' });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

const getSkills = (req, res) => {

    const sql = 'SELECT DISTINCT skill_name FROM skills';

    try {
        mysqlcon.query(sql, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to fetch user skills.' });
            }
            return res.status(200).json({ message: "Skills Found", results });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch user skills.' });
    }
};


const getUserSkills = (req, res) => {
    const { id } = req.params;
    try {
        const sql = 'SELECT * FROM skills WHERE user_id = ?';
        const values = [id];

        mysqlcon.query(sql, values, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to fetch user skill.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'User skill not found.' });
            }
            return res.status(200).json({
                message: "User skill Found",
                results
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to fetch user skill.' });
    }
};


const addSkill = async (req, res) => {
    const { id } = req.params; // Get user ID from params
    const { skill_name, proficiency_level } = req.body; // Get skill name and proficiency level from body
    console.log("Request Body: ", req.body);

    try {
        // Check if the user has an existing skill record
        const skillRecord = await Skills.findOne({ where: { user_id: id } });

        if (skillRecord) {
            const currentSkills = skillRecord.skill_name || []; // Get existing skills
            console.log("Current skill array: ", currentSkills);

            // Check if the skill already exists in the array
            if (currentSkills.includes(skill_name)) {
                return res.status(400).json({ message: `${skill_name} is already in the skill list!` });
            }

            // Add the new skill to the array
            currentSkills.push(skill_name);
            console.log("Updated skill array: ", currentSkills);

            // Use raw SQL to update the skill_name array
            await sequelize.query(
                `UPDATE skills SET skill_name = :skills WHERE user_id = :userId`,
                {
                    replacements: {
                        skills: JSON.stringify(currentSkills), // Convert to JSON string
                        userId: id,
                    },
                    type: sequelize.QueryTypes.UPDATE,
                }
            );

            return res.status(200).json({
                message: `${skill_name} added successfully`,
                user_id: id,
                skill_name,
                proficiency_level,
            });
        } else {
            console.log("No existing skill record found. Creating new entry.");
            // Create a new skill entry
            const newSkillRecord = await Skills.create({
                user_id: id,
                skill_name: [skill_name], // Initialize with the new skill
                proficiency_level,
            });

            console.log("Created Skill Record: ", newSkillRecord);
            return res.status(201).json({
                message: "New skill entry created successfully",
                user_id: id,
                skill_name,
                proficiency_level,
            });
        }
    } catch (error) {
        console.error("Error adding/updating skill:", error);
        return res.status(500).json({ message: 'Failed to add/update skill for user.' });
    }
};




const updateSkill = (req, res) => {
    const { id } = req.params;
    const { skill_name } = req.body;
    const userId = req.user.id;

    try {
        const sql = 'UPDATE skills SET skill_name = ? WHERE user_id = ? AND id = ?';
        const values = [skill_name, userId, id];

        mysqlcon.query(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to update user skill.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User skill not found.' });
            }
            return res.status(200).json({ message: "Skill Updated", id, userId, skill_name });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update user skill.' });
    }
};

const deleteSkill = async (req, res) => {
    const { userId, skillToRemove } = req.body; 
    console.log("Skill to : ",req.body) // skillToRemove is the skill name
  
    try {
      // Fetch the user's current skills based on user_id
      let skillRecord = await Skills.findOne({ 
        where: { user_id: userId }
      });
  
    //   console.log("skillRecord : ",skillRecord)
      if (!skillRecord) {
        return res.status(404).json({ message: 'User or skill record not found' });
      }
  
      // Get the array of skills (skill_name is a JSON array)
      let skillArray = skillRecord.skill_name || [];
      console.log("skillArray : ",skillArray)

  
      // Check if the skill exists in the array
      if (!skillArray.includes(skillToRemove)) {
        return res.status(400).json({ message: 'Skill not found' });
      }
  
      // Remove the skill by name (not by index)
      skillArray = skillArray.filter(skill => skill !== skillToRemove);
  
      // Update the database with the modified skill array
      await skillRecord.update({ skill_name: skillArray });
  
      res.status(200).json({ message: 'Skill removed successfully', skillArray });
    } catch (error) {
      console.error("Error deleting skill:", error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  




  

const addResearch = (req, res) => {
    const { user_id, research_name, description, status, start_date, end_date, research_url} = req.body;

    const query = 'INSERT INTO research (user_id, research_name, description, status, start_date, end_date, research_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [user_id, research_name, description, status, start_date, end_date, research_url];

    try {
        mysqlcon.query(query, values, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            return res.status(201).json({ message: 'Research created successfully' });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getResearch = (req, res) => {
    try {
        const query = 'SELECT * FROM research';
        console.log("Query : ",query)

        mysqlcon.query(query, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            return res.status(200).json(results);
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getUserResearch = (req, res) => {
    const researchId = req.params.id;

    const query = 'SELECT * FROM research WHERE user_id = ?';
    const values = [researchId];

    try {
        mysqlcon.query(query, values, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Research not found' });
            }

            return res.status(200).json({
                message: 'Research found',
                results
            });
        });
    } catch (error) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const updateResearch = (req, res) => {
    const {id} = req.params;
    // console.log("Id ===> : ",id)
    const research = req.body;
    // console.log("Research====> : ",research)

    try {
        mysqlcon.query('UPDATE research SET ? WHERE id = ?', [research, id], (error, result) => {
            if (error) {
                console.error('Error updating research:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Research not found' });
            } else {
                res.status(200).json({ message: 'Research updated' });
            }
        });
    } catch (error) {
        console.error('Error updating Research:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteResearch = (req, res) => {
    const researchId = req.params.id;

    const query = 'DELETE FROM research WHERE id = ?';
    const values = [researchId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Research not found' });
            }
            return res.status(200).json({ message: 'Research deleted successfully' });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

const addAward = (req,res) => {
    const { user_id, award_name, description, issuing_organization, issuer, issue_date} = req.body
    
    const query = `INSERT INTO award (user_id, award_name, description, issuing_organization, issuer, issue_date) VALUES (?, ?, ?, ?, ?, ?);`
    const values = [user_id, award_name, description, issuing_organization, issuer, issue_date];
    try {
        try {
            mysqlcon.query(query, values, (err, results) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }
    
                return res.status(201).json({ message: 'Award created successfully' });
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    } catch (error) {
        
    }
};
const getAward = (req, res) => {
    try {
        const query = 'SELECT * FROM award';
        console.log("Query : ",query)

        mysqlcon.query(query, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            return res.status(200).json(results);
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
const getUserAward = (req,res) => {
    const awardId = req.params.id;
    console.log("Award Id =====> : ",awardId)

    const query = 'SELECT * FROM award WHERE user_id = ?';
    const values = [awardId];

    try {
        mysqlcon.query(query, values, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'award not found' });
            }

            return res.status(200).json({
                message: 'award found',
                results
            });
        });
    } catch (error) {
        console.log(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
const updateAward = (req,res) => {
    const {id} = req.params;
    console.log("Id ===> : ",id)
    const award = req.body;
    console.log("Award====> : ",award)

    try {
        mysqlcon.query('UPDATE award SET ? WHERE id = ?', [award, id], (error, result) => {
            if (error) {
                console.error('Error updating award:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else if (result.affectedRows === 0) {
                res.status(404).json({ error: 'Award not found' });
            } else {
                res.status(200).json({ message: 'Award updated' });
            }
        });
    } catch (error) {
        console.error('Error updating Award:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
const deleteAward = (req,res) => {
    const awardId = req.params.id;

    const query = 'DELETE FROM award WHERE id = ?';
    const values = [awardId];

    try {
        mysqlcon.query(query, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Award not found' });
            }
            return res.status(200).json({ message: 'Award deleted successfully' });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = {
    addExperience,
    getUserExperiences,
    updateExperience,
    deleteExperience,
    AddEducation,
    getEducation,
    getUserEducation,
    updateEducation,
    deleteEducation,
    addCertification,
    getCertifications,
    getUserCertifications,
    updateCertification,
    deleteCertification,
    getSkills,
    getUserSkills,
    addSkill,
    updateSkill,
    deleteSkill,
    addResearch,
    getResearch,
    updateResearch,
    getUserResearch,
    deleteResearch,
    addAward,
    getAward,
    getUserAward,
    updateAward,
    deleteAward
}