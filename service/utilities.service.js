const { mysqlcon } = require("../model/db");
const { DBMODELS } = require("../models/init-models");
const research = require("../models/research");


// const updateUserActivity = async (userId, isActive) => {
//     try {
//       const user = await user.findByPk(userId);
//       if (!user) {
//         throw new Error('User not found');
//       }
//       user.is_online = isActive ? 'true' : 'false';
//       await user.save();
//     } catch (error) {
//       throw new Error(error.message);
//     }
//   };

const getTotalVotes = (id, type) => {
    switch (type) {
        case 'question':
            try {
                return new Promise((resolve, reject) => {
                    const sql = `SELECT COUNT(*) AS totalCount,
                    (SELECT COUNT(*) FROM votes WHERE question_id=${id} AND vote_type = 'upvote') AS upVoteCount,
                    (SELECT COUNT(*) FROM votes WHERE question_id=${id} AND vote_type = 'downvote') AS downVoteCount,
                    (SELECT COUNT(*) FROM votes WHERE question_id=${id} AND vote_type = 'novote') AS noVoteCount 
                    FROM votes WHERE question_id = ?;`
                    const values = [id];
                    mysqlcon.query(sql, values, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            const count = results[0].count;

                            resolve(results[0]);
                        }
                    });
                });
            } catch (error) {
                return console.log(error);
            }
        case 'answer':
            try {
                return new Promise((resolve, reject) => {
                    const sql = `SELECT COUNT(*) AS totalCount,
                    (SELECT COUNT(*) FROM votes WHERE answer_id=${id} AND vote_type = 'upvote') AS upVoteCount,
                    (SELECT COUNT(*) FROM votes WHERE answer_id=${id} AND vote_type = 'downvote') AS downVoteCount,
                    (SELECT COUNT(*) FROM votes WHERE answer_id=${id} AND vote_type = 'novote') AS noVoteCount 
                    FROM votes WHERE question_id = ?;`
                    const values = [id];
                    mysqlcon.query(sql, values, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            const count = results[0].count;

                            resolve(results[0]);
                        }
                    });
                });
            } catch (error) {
                return console.log(error);
            }
        default:
            return 0
    }
}

const findUser = (id) => {
    try {
        return new Promise((resolve, reject) => {
            // First query to get user details
            const userSql = `SELECT id, username, first_name, last_name, CONCAT(first_name, ' ', last_name) AS name, email, role, avatar_url as profile_pic, bio FROM users WHERE id=${id};`;
            
            mysqlcon.query(userSql, (userError, userResults) => {
                if (userError) {
                    console.error("Error fetching user details:", userError);
                    return reject(userError);
                }

                if (userResults.length === 0) {
                    console.warn("No user found with id:", id);
                    return resolve(null); // Resolve as null if user not found
                }

                // Initialize user object with fetched user details
                let user = { ...userResults[0] };

                // Second query to get user skills
                const skillSql = `SELECT skill_name FROM skills WHERE user_id=${id} AND proficiency_level='Expert';`;

                mysqlcon.query(skillSql, async (skillError, skills) => {
                    if (skillError) {
                        console.error("Error fetching user skills:", skillError);
                        return reject(skillError);
                    }

                    // Process skills data
                    let expertise = [];
                    if (skills.length > 0) {
                        let skillName = skills[0].skill_name;

                        // Check if skill_name is an array or a string
                        if (Array.isArray(skillName)) {
                            expertise = skillName;
                        } else if (typeof skillName === 'string') {
                            expertise = skillName.split(',').map(skill => skill.trim());
                        } else {
                            console.error("Unexpected skill_name format:", skillName);
                        }
                    }

                    // Fetch user rating (ensure findUserRating function is defined)
                    let rating = await findUserRating(id);

                    // Merge skills and rating into the user object
                    user = { ...user, expertise, rating };
                    
                    // Resolve with the complete user object
                    resolve(user);
                });
            });
        });
    } catch (error) {
        console.error("Unexpected error in findUser:", error);
    }
};


const findUserRating = (id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT FORMAT(AVG(rating), 1) AS average_rating FROM ratings WHERE rated_user_id = ${id}`;
            mysqlcon.query(sql, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    const averageRating = result[0]?.average_rating || '0.0';
                    // console.log("averageRating ",averageRating)
                    resolve(averageRating);
                }
            });
        });
    } catch (error) {
        return console.error(error);
    }
}

const checkUser = (id) => {
    console.log({ db, id });
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS count FROM users WHERE id = ${id}`;
            mysqlcon.query(sql, (error, user) => {
                if (error) {
                    reject(error);
                } else {
                    const count = user[0].count;
                    resolve(count === 1);
                }
            });
        });
    } catch (error) {
        return console.error(error);
    }
}

const checkUserByEmail = (email) => {
    // console.log({ db, email });
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS count FROM users WHERE email = '${email}'`;
            mysqlcon.query(sql, (error, user) => {
                if (error) {
                    reject(error);
                } else {
                    const count = user[0].count;
                    resolve(count === 1);
                }
            });
        });
    } catch (error) {
        return console.error(error);
    }
}

const getUserIDByEmail = (email) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE email = '${email}'`;
            mysqlcon.query(sql, (error, user) => {
                if (error) {
                    reject(error);
                } else {
                    // console.log({ user });
                    if (user.length) {
                        resolve(user[0]?.id);
                    } else {
                        return reject(console.log("Error: User Not Found"));
                    }
                }
            });
        });
    } catch (error) {
        return console.log(error);
    }
}

const findReplies = (id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id, user_id, reply, createdAt FROM replies WHERE comment_id=${id};`;
            mysqlcon.query(sql, async (error, replies) => {
                if (error) {
                    reject(error);
                } else {
                    for (var i = 0; i < replies.length; i++) {
                        let user = await findUser(replies[i].user_id);
                        replies[i] = { ...replies[i], author: user };
                    }
                    resolve(replies);
                }
            });
        });
    } catch (error) {
        return console.log(error);
    }
}

const findReplyThread = (id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id, user_id, reply, createdAt FROM replies WHERE id=${id} AND is_thread='true';`;
            mysqlcon.query(sql, async (error, replies) => {
                if (error) {
                    reject(error);
                } else {
                    for (var i = 0; i < replies.length; i++) {
                        let user = await findUser(replies[i].user_id);
                        replies[i] = { ...replies[i], author: user };
                    }
                    resolve(replies);
                }
            });
        });
    } catch (error) {
        return console.log(error);
    }
}

const findComments = (id, type) => {
    switch (type) {
        case 'question':
            try {
                return new Promise((resolve, reject) => {
                    const sql = `SELECT * FROM comments WHERE question_id = ${id};`;
                    mysqlcon.query(sql, async (error, comments) => {
                        if (error) {
                            reject(error);
                        } else {
                            for (var i = 0; i < comments.length; i++) {
                                let user = await findUser(comments[i].user_id);
                                let replies = await findReplies(comments[i].id);
                                comments[i] = { ...comments[i], author: user, replies };
                            }
                            resolve(comments);
                        }
                    });
                });
            } catch (error) {
                return console.log(error);
            }
        case 'answer':
            try {
                return new Promise((resolve, reject) => {
                    const sql = `SELECT * FROM comments WHERE answer_id=${id};`;
                    mysqlcon.query(sql, async (error, comments) => {
                        if (error) {
                            reject(error);
                        } else {
                            for (var i = 0; i < comments.length; i++) {
                                let user = await findUser(comments[i].user_id);
                                let replies = await findReplies(comments[i].id);
                                comments[i] = { ...comments[i], author: user, replies };
                            }
                            resolve(comments);
                        }
                    });
                });
            } catch (error) {
                return console.log(error);
            }
        default:
            return [];
    }
}

const findExpertise = (id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT skill_name FROM skills WHERE user_id = ${id}`;
            mysqlcon.query(sql, (err, result) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    // Ensure result is not empty
                    if (result.length > 0) {
                        let skills = result[0]?.skill_name;

                        // Check if skills is a valid array (since it's stored as JSON)
                        if (Array.isArray(skills)) {
                            resolve(skills);  // Resolve the array directly
                        } else {
                            resolve([]);  // Resolve an empty array if it's not an array
                        }
                    } else {
                        resolve([]);  // No result found, resolve an empty array
                    }
                }
            });
        });
    } catch (error) {
        console.log(error);
    }
};


// Function to get the count of answers, questions, and connections for a user
function getUserStats(userId) {
    return new Promise((resolve, reject) => {
        // Count the number of answers for the user
        mysqlcon.query('SELECT COUNT(*) AS answer_count FROM answers WHERE user_id = ?', [userId], (err, results) => {
            if (err) {
                console.error(err);
                return reject(err);
            }
            const answerCount = results[0].answer_count;

            // Count the number of questions for the user
            mysqlcon.query('SELECT COUNT(*) AS question_count FROM questions WHERE user_id = ?', [userId], (err, results) => {
                if (err) {
                    console.error(err);
                    return reject(err);
                }
                const questionCount = results[0].question_count;

                let query =
                    `SELECT DISTINCT users.id
                FROM connections
                INNER JOIN users ON (connections.receiver_id = users.id OR connections.sender_id = users.id)
                WHERE (connections.sender_id = ? OR connections.receiver_id = ?) AND connections.status = 'accepted' AND users.id != ?
                ORDER BY users.username ASC`;

                // Count the number of connections for the user
                mysqlcon.query(query, [userId, userId, userId], (err, results) => {
                    if (err) {
                        console.error(err);
                        return reject(err);
                    }
                    const connectionCount = results?.length;

                    // Return the counts as an object
                    resolve({
                        answerCount,
                        questionCount,
                        connectionCount
                    });
                });
            });
        });
    });
}

// Function to update user activities with a callback
const updateUserActivities = (userId, activityType, callback) => {
    const timestamp = new Date().toISOString();
    const sql = `INSERT INTO user_activity (user_id, activity_type, timestamp) VALUES (?, ?, ?)`;
    const values = [userId, activityType, timestamp];

    try {
        mysqlcon.query(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                callback(err, null);
            } else {
                console.log('User activity updated successfully');
                callback(null, result);
            }
        });
    } catch (error) {
        callback(error, null);
    }
};



function createOrUpdateEducations(userId, educationDetails) {
    return new Promise((resolve, reject) => {
        // Check if educations exist for the user
        const checkQuery = 'SELECT COUNT(*) AS count FROM educations WHERE user_id = ?';
        mysqlcon.query(checkQuery, [userId], (err, result) => {
            if (err) {
                console.error(err);
                reject('Error checking educations');
            } else {
                const count = result[0].count;
                if (count === 0) {
                    // If no educations exist, insert new entries
                    const insertQuery = 'INSERT INTO educations (user_id, institution, degree, field_of_study, start_year, end_year) VALUES ?';
                    const educationValues = educationDetails.map(edu => [
                        userId,
                        edu.institution,
                        edu.degree,
                        edu.fieldOfStudy,
                        edu.startYear,
                        edu.endYear
                    ]);
                    mysqlcon.query(insertQuery, [educationValues], (err, result) => {
                        if (err) {
                            console.error(err);
                            reject('Error creating educations');
                        } else {
                            resolve('Educations created successfully');
                        }
                    });
                } else {
                    // If educations exist, update the entries
                    const updateQuery = 'UPDATE educations SET institution = ?, degree = ?, field_of_study = ?, start_year = ?, end_year = ? WHERE user_id = ?';
                    const updatePromises = educationDetails.map(edu => {
                        const updateValues = [
                            edu.institution,
                            edu.degree,
                            edu.fieldOfStudy,
                            edu.startYear,
                            edu.endYear,
                            userId
                        ];
                        return new Promise((resolve, reject) => {
                            mysqlcon.query(updateQuery, updateValues, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    reject('Error updating educations');
                                } else {
                                    resolve('Education updated successfully');
                                }
                            });
                        });
                    });
                    Promise.all(updatePromises)
                        .then(() => resolve('Educations updated successfully'))
                        .catch(err => reject(err));
                }
            }
        });
    });
}

function createOrUpdateCertifications(userId, certificationDetails) {
    return new Promise((resolve, reject) => {
        // Check if certifications exist for the user
        const checkQuery = 'SELECT COUNT(*) AS count FROM certifications WHERE user_id = ?';
        mysqlcon.query(checkQuery, [userId], (err, result) => {
            if (err) {
                console.error(err);
                reject('Error checking certifications');
            } else {
                const count = result[0].count;
                if (count === 0) {
                    // If no certifications exist, insert new entries
                    const insertQuery = 'INSERT INTO certifications (user_id, certification_name, issuing_organization, issue_date, expiration_date) VALUES ?';
                    const certificationValues = certificationDetails.map(cert => [
                        userId,
                        cert.certificationName,
                        cert.issuingOrganization,
                        cert.issueDate,
                        cert.expirationDate
                    ]);
                    mysqlcon.query(insertQuery, [certificationValues], (err, result) => {
                        if (err) {
                            console.error(err);
                            reject('Error creating certifications');
                        } else {
                            resolve('Certifications created successfully');
                        }
                    });
                } else {
                    // If certifications exist, update the entries
                    const updateQuery = 'UPDATE certifications SET certification_name = ?, issuing_organization = ?, issue_date = ?, expiration_date = ? WHERE user_id = ?';
                    const updatePromises = certificationDetails.map(cert => {
                        const updateValues = [
                            cert.certificationName,
                            cert.issuingOrganization,
                            cert.issueDate,
                            cert.expirationDate,
                            userId
                        ];
                        return new Promise((resolve, reject) => {
                            mysqlcon.query(updateQuery, updateValues, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    reject('Error updating certifications');
                                } else {
                                    resolve('Certification updated successfully');
                                }
                            });
                        });
                    });
                    Promise.all(updatePromises)
                        .then(() => resolve('Certifications updated successfully'))
                        .catch(err => reject(err));
                }
            }
        });
    });
}

function createOrUpdateWorkExperiences(userId, workExperienceDetails) {
    return new Promise((resolve, reject) => {
        // Check if work experiences exist for the user
        const checkQuery = 'SELECT COUNT(*) AS count FROM work_experience WHERE user_id = ?';
        mysqlcon.query(checkQuery, [userId], (err, result) => {
            if (err) {
                console.error(err);
                reject('Error checking work experiences');
            } else {
                const count = result[0].count;
                if (count === 0) {
                    // If no work experiences exist, insert new entries
                    const insertQuery = 'INSERT INTO work_experience (user_id, company_name, position, start_date, end_date) VALUES ?';
                    const workExperienceValues = workExperienceDetails.map(exp => [
                        userId,
                        exp.companyName,
                        exp.position,
                        exp.startDate,
                        exp.endDate
                    ]);
                    mysqlcon.query(insertQuery, [workExperienceValues], (err, result) => {
                        if (err) {
                            console.error(err);
                            reject('Error creating work experiences');
                        } else {
                            resolve('Work experiences created successfully');
                        }
                    });
                } else {
                    // If work experiences exist, update the entries
                    const updateQuery = 'UPDATE work_experience SET company_name = ?, position = ?, start_date = ?, end_date = ? WHERE user_id = ?';
                    const updatePromises = workExperienceDetails.map(exp => {
                        const updateValues = [
                            exp.companyName,
                            exp.position,
                            exp.startDate,
                            exp.endDate,
                            userId
                        ];
                        return new Promise((resolve, reject) => {
                            mysqlcon.query(updateQuery, updateValues, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    reject('Error updating work experiences');
                                } else {
                                    resolve('Work experience updated successfully');
                                }
                            });
                        });
                    });
                    Promise.all(updatePromises)
                        .then(() => resolve('Work experiences updated successfully'))
                        .catch(err => reject(err));
                }
            }
        });
    });
}

function createOrUpdateSkills(userId, skillDetails) {
    return new Promise((resolve, reject) => {
        // Check if skills exist for the user
        const checkQuery = 'SELECT COUNT(*) AS count FROM skills WHERE user_id = ?';
        mysqlcon.query(checkQuery, [userId], (err, result) => {
            if (err) {
                console.error(err);
                reject('Error checking skills');
            } else {
                const count = result[0].count;
                if (count === 0) {
                    // If no skills exist, insert new entries
                    const insertQuery = 'INSERT INTO skills (user_id, skill_name, proficiency) VALUES ?';
                    const skillValues = skillDetails.map(skill => [
                        userId,
                        skill.skillName,
                        skill.proficiency
                    ]);
                    mysqlcon.query(insertQuery, [skillValues], (err, result) => {
                        if (err) {
                            console.error(err);
                            reject('Error creating skills');
                        } else {
                            resolve('Skills created successfully');
                        }
                    });
                } else {
                    // If skills exist, update the entries
                    const updateQuery = 'UPDATE skills SET proficiency = ? WHERE user_id = ? AND skill_name = ?';
                    const updatePromises = skillDetails.map(skill => {
                        const updateValues = [
                            skill.proficiency,
                            userId,
                            skill.skillName
                        ];
                        return new Promise((resolve, reject) => {
                            mysqlcon.query(updateQuery, updateValues, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    reject('Error updating skills');
                                } else {
                                    resolve('Skills updated successfully');
                                }
                            });
                        });
                    });
                    Promise.all(updatePromises)
                        .then(() => resolve('Skills updated successfully'))
                        .catch(err => reject(err));
                }
            }
        });
    });
}

function createOrUpdateResearch(userId, researchDetails){
    return new Promise((resolve, reject)=>{
        const checkQuery = 'SELECT COUNT(*) AS count FROM research WHERE user_id = ?';
        mysqlcon.query( checkQuery ,[userId], (err,result)=>{
            if(err){
                console.error(err);
                reject("Error to fetching research")
            }else{
                const count = result[0].count;
                if(count === 0){
                    // if no research exist insert new research
                    const insertQuery = 'INSERT INTO research (user_id, research_name, description, status, start_date, end_date) VALUES ?';
                    const researchValues = researchDetails.map(research => [
                        userId,
                        research.research_name,
                        research.description,
                        research.status,
                        research.start_date,
                        research.end_date
                    ]);
                    mysqlcon.query(insertQuery, [researchValues], (err, result) => {
                        if (err) {
                            console.error(err);
                            reject('Error creating research');
                        } else {
                            resolve('Research created successfully');
                        }
                    });
                }else {
                    // If research exist, update the entries
                    const updateQuery = 'UPDATE research SET research_name = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE user_id = ?';
                    const updatePromises = researchDetails.map(research => {
                        const updateValues = [
                            research.research_name,
                            research.description,
                            research.status,
                            research.start_date,
                            research.end_date,
                            userId
                        ];
                        return new Promise((resolve, reject) => {
                            mysqlcon.query(updateQuery, updateValues, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    reject('Error updating research');
                                } else {
                                    resolve('Research updated successfully');
                                }
                            });
                        });
                    });
                    Promise.all(updatePromises)
                        .then(() => resolve('Research updated successfully'))
                        .catch(err => reject(err));
                }
            }
        })
    });
}

// function createOrUpdateAward(userId, awardDetails){
//     return new Promise((resolve, reject)=>{

//     });
// }

function getLastActive(userId) {
    return new Promise((resolve, reject) => {
        mysqlcon.query(
            `SELECT timestamp FROM user_activity WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1`,
            [userId],
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    if (result.length > 0) {
                        resolve(result[0].timestamp);
                    } else {
                        resolve(null);
                    }
                }
            }
        );
    });
}


const getAvailableLocations = () => {
    return new Promise((resolve, reject) => {
        try {
            mysqlcon.query("SELECT DISTINCT location FROM users WHERE location IS NOT NULL", (err, locations) => {
                if (err) {
                    console.error(err);
                    reject('Error getting location')
                } else {
                    const distinctLocations = locations.map((location) => location.location);

                    resolve(distinctLocations);
                }
            });
        } catch (err) {
            reject('Error getting location');
        }
    });
}

const getAvailableExpertise = () => {
    return new Promise((resolve, reject) => {
        try {
            mysqlcon.query("SELECT DISTINCT skill_name as skills FROM skills WHERE skill_name IS NOT NULL AND proficiency_level = 'Expert'", (err, expertises) => {
                if (err) {
                    console.error(err);
                    reject('Error getting Expertie list');
                } else {
                    const distinctExpertise = expertises.map((skill) => skill.skills);

                    resolve(distinctExpertise);
                }
            });
        } catch (err) {
            reject('Error getting expertise');
        }
    });
}

function extractKeywords(text) {
    // Define a list of common stop words to exclude from keywords
    const stopWords = ['a', 'an', 'the', 'in', 'on', 'at', 'of', 'is', 'are', 'and', 'or', 'but', 'not'];

    // Convert the text to lowercase and split it into an array of words
    const words = text.toLowerCase().split(' ');

    // Filter out the stop words and any empty strings
    const keywords = words.filter(word => !stopWords.includes(word) && word.trim() !== '');

    return keywords;
}

const getConnectionStatus = (sender, receiver) => {
    return new Promise((resolve, reject) => {
        // if(!sender || !receiver || sender === 'undefined')  {
        //     return resolve(null);
        // }

        // console.log("SEnder Id ================== > :",sender)
        // console.log("Receiver Id ================== > :",receiver)

        try {
            mysqlcon.query(`SELECT status FROM connections WHERE sender_id = ${sender} AND receiver_id = ${receiver}`, (err, result) => {
                if (err) {
                    console.error(err);
                    reject('Error getting connection status');
                } else {
                    // console.log(`Connection Status of ${sender} and ${receiver} is : `, result);
                    resolve(result[0]?.status || null);
                }
            });
        } catch (err) {
            reject('Error getting expertise');
        }
    });
}
const getPresentWorkExperience = (userId) => {
    return new Promise((resolve, reject) => {

        try {
            mysqlcon.query(`SELECT * FROM work_experience WHERE user_id = '${userId}' AND is_working = 1`, (err, result) => {
                if (err) {
                    console.error(err);
                    reject('Error getting present work status');
                } else {

                    resolve(result[0] || null);
                }
            });
        } catch (err) {
            reject('Error getting present work status');
        }
    });
}

async function fetchUserProfile(userId) {
    // Implement your logic to fetch the user's profile data
    // from the database or any other data source
    // Return the user's profile data as an object
    // console.log("UserId : ",userId)

    return new Promise((resolve, reject) => {
        try {
            const query = `
              SELECT
                u.id,
                u.email,
                u.status,
                u.createdAt,
                u.display_name,
                u.first_name,
                u.middle_name,
                u.last_name,
                u.location,
                u.phone,
                u.avatar_url,
                u.bio,
                u.role,
                u.is_online,
                up.gender,
                up.dob,
                up.profile_pic,
                up.profession,
                up.designation,
                up.institute,
                up.education,
                up.website_url,
                up.twitter_link,
                up.facebook_link,
                up.linkedin_link,
                up.github_link,
                up.instagram_link,
                up.youtube_link,
                up.vimeo_link,
                a.address_line_1,
                a.address_line_2,
                a.city,
                a.state,
                a.country,
                a.zip_code,
                a.country,
                GROUP_CONCAT(DISTINCT s.skill_name ORDER BY s.skill_name ASC SEPARATOR ', ') AS skills,
                GROUP_CONCAT(DISTINCT e.institution_name ORDER BY e.start_date DESC SEPARATOR ', ') AS educations,
                GROUP_CONCAT(DISTINCT c.certification_name ORDER BY c.issue_date DESC SEPARATOR ', ') AS certifications,
                GROUP_CONCAT(DISTINCT w.organization ORDER BY w.start_date DESC SEPARATOR ', ') AS work_experience,
                GROUP_CONCAT(DISTINCT r.research_name ORDER BY r.start_date DESC SEPARATOR ', ') AS research
              FROM users u
              LEFT JOIN user_profiles up ON u.id = up.user_id
              LEFT JOIN address a ON u.id = a.user_id
              LEFT JOIN skills s ON u.id = s.user_id
              LEFT JOIN educations e ON u.id = e.user_id
              LEFT JOIN certifications c ON u.id = c.user_id
              LEFT JOIN work_experience w ON u.id = w.user_id
              LEFT JOIN research r ON u.id = r.user_id
              WHERE u.id = ?
              GROUP BY u.id, up.id, a.id;
            `;
            mysqlcon.query(query, [userId], async (err, rows) => {
                if (err) {
                    console.error(err);
                    reject({ message: "Internal Server Error", err });
                }
                if (!rows || !Array.isArray(rows) || rows.length === 0) {
                  return reject({ message: "User not found" });
                }
                const user = {
                    email: rows[0]?.email,
                    avatar_url: rows[0]?.avatar_url,
                    display_name: rows[0]?.display_name,
                    first_name: rows[0]?.first_name,
                    last_name: rows[0]?.last_name,
                    location: rows[0]?.location,
                    phone: rows[0]?.phone,
                    bio: rows[0]?.bio,
                    role: rows[0]?.role,
                    gender: rows[0]?.gender,
                    dob: rows[0]?.dob,
                    profession: rows[0]?.profession,
                    designation: rows[0]?.designation,
                    institute: rows[0]?.institute,
                    education: rows[0]?.education,
                    address_line_1: rows[0]?.address_line_1,
                    address_line_2: rows[0]?.address_line_2,
                    city: rows[0]?.city,
                    state: rows[0]?.state,
                    country: rows[0]?.country,
                    zip_code: rows[0]?.zip_code,
                    website: rows[0]?.website_url,
                    twitter: rows[0]?.twitter_link,
                    facebook: rows[0]?.facebook_link,
                    instagram: rows[0]?.instagram_link,
                    youtube: rows[0]?.youtube_link,
                    vimeo: rows[0]?.vimeo_link,
                    github: rows[0]?.github_link,
                    linkedin: rows[0]?.linkedin_link,
                    skills: rows[0]?.skills,
                    educations: rows[0]?.educations,
                    certifications: rows[0]?.certifications,
                    work_experience: rows[0]?.work_experience,
                    research: rows[0]?.research,
                };
                user.skills = user.skills ? user.skills.split(', ') : [];
                user.educations = user.educations ? user.educations.split(', ') : [];
                user.certifications = user.certifications ? user.certifications.split(', ') : [];
                user.work_experience = user.work_experience ? user.work_experience.split(', ') : [];

                resolve(user);
            });

        } catch (err) {
            console.error(err);
            reject({ message: 'Server error' }, err);
        }
    });
}

async function fetchinstituteProfile(userId) {
    // Implement your logic to fetch the user's profile data
    // from the database or any other data source
    // Return the user's profile data as an object
    console.log("UserId : ",userId)

    return new Promise((resolve, reject) => {
        try {
            const query = `
              SELECT
                i.id,
                i.username,
                i.name,
                i.email,
                i.mobile,
                i.status,
                i.createdAt,
                i.updatedAt,
                i.database_name,
                i.auth_verification_path,
                i.logo,
                id.name AS department_name,
                id.description AS department_descriptio,
                id.head_of_department,
                ip.eksathi_id,
                ip.aboutYou,
                ip.address,
                ip.city,
                ip.state,
                ip.country,
                ip.postal_code,
                ip.establishmentDate,
                ip.facebook,
                ip.github,
                ip.instagram,
                ip.instituteRegistrationNumber,
                ip.landmark,
                ip.linkdin,
                ip.pocdesignation,
                ip.pocemail,
                ip.pocname,
                ip.pocphone,
                ip.twitter,
                ip.website,
                ip.youtube
              FROM institutes i
              LEFT JOIN institute_profiles ip ON i.id = ip.institute_id
              LEFT JOIN institute_departments id ON id.id = id.institute_id
              WHERE i.id = ?
              GROUP BY i.id, ip.id, id.id;
            `;
            mysqlcon.query(query, [userId], async (err, rows) => {
                if (err) {
                    console.error(err);
                    reject({ message: "Internal Server Error", err });
                }
                if (!rows || !Array.isArray(rows) || rows.length === 0) {
                  return reject({ message: "institute not found" });
                }
                const institute = {
                    username: rows[0]?.username,
                    name: rows[0]?.name,
                    email: rows[0]?.email,
                    mobile: rows[0]?.mobile,
                    status: rows[0]?.status,
                    database_name: rows[0]?.database_name,
                    auth_verification_path: rows[0]?.auth_verification_path,
                    logo: rows[0]?.logo,
                    department_name: rows[0]?.department_name,
                    department_descriptio: rows[0]?.department_descriptio,
                    head_of_department: rows[0]?.head_of_department,
                    eksathi_id: rows[0]?.eksathi_id,
                    aboutYou: rows[0]?.aboutYou,
                    address: rows[0]?.address,
                    city: rows[0]?.city,
                    state: rows[0]?.state,
                    country: rows[0]?.country,
                    postal_code: rows[0]?.postal_code,
                    affiliate_id: rows[0]?.affiliate_id,
                    establishmentDate: rows[0]?.establishmentDate,
                    facebook: rows[0]?.facebook_link,
                    instagram: rows[0]?.instagram_link,
                    youtube: rows[0]?.youtube_link,
                    instituteRegistrationNumber: rows[0]?.instituteRegistrationNumber,
                    github: rows[0]?.github_link,
                    linkdin: rows[0]?.linkdin,
                    landmark: rows[0]?.landmark,
                    pocdesignation: rows[0]?.pocdesignation,
                    pocemail: rows[0]?.pocemail,
                    pocname: rows[0]?.pocname,
                    pocphone: rows[0]?.pocphone,
                    twitter: rows[0]?.twitter,
                    website: rows[0]?.website,
                    affiliate_type: rows[0]?.affiliate_type,
                };

                resolve(institute);
            });

        } catch (err) {
            console.error(err);
            reject({ message: 'Server error' }, err);
        }
    });
}


async function getTotalUsers(countQuery, params) {
    return new Promise((resolve, reject) => {
        try {
            mysqlcon.query(countQuery, params, (err, results) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    const totalUsers = results?.length || 0;
                    resolve(totalUsers);
                }
            });
        } catch (error) {
            console.log(err);
            reject(err);
        }
    });
}

async function isJobAppliedByUser(userId, jobId) {
    try {
      // Check if there's a job application by the specified user for the specified job
      const jobApplication = await DBMODELS.job_applications.findOne({
        where: {
          user_id: userId,
          job_id: jobId,
        },
      });
  
      // If a job application is found, return true; otherwise, return false
      return !!jobApplication;
    } catch (error) {
      console.error(error);
      // Handle the error appropriately (e.g., return false or throw an error)
      throw new Error('Error checking job application');
    }
  }



  // // utils/validateFormData.js
// function validateFormData(data, model) {
//   const attributes = model.rawAttributes;
//   let errors = {};

//   for (const field in attributes) {
//     const attr = attributes[field];

//     // Ignore auto-generated fields like id, createdAt, updatedAt
//     if (["id", "createdAt", "updatedAt"].includes(field)) continue;

//     // Required check (if allowNull = false and no defaultValue)
//     if (
//       attr.allowNull === false &&
//       attr.defaultValue === undefined &&
//       (data[field] === undefined ||
//         data[field] === null ||
//         (typeof data[field] === "string" && data[field].trim() === ""))
//     ) {
//       errors[field] = `${field} is required`;
//     }
//   }

//   return {
//     isValid: Object.keys(errors).length === 0,
//     errors,
//   };
// }

// module.exports = validateFormData;







async function validateUserFormData(requiredFields=[],data) {
//   const requiredFields = [
//     "username",
//     "email",
//     "password",
//     "role",
//     "phone",
//     "qualification",
//     "experience",
//     "teaching_method"
//   ];

  let errors = {};

  requiredFields.forEach((field) => {
    const value = data[field];

    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      errors[field] = `${field} is required`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
  

async function processUsers(rows) {
  return await Promise.all(rows.map(async (row) => {
    // Parse location JSON if it exists
    let parsedLocation = null;
    let cityName = row.city_name || '';
    let stateName = row.state_name || '';
    let district = row.district || '';

    if (row.location) {
      try {
        parsedLocation = typeof row.location === 'string' 
          ? JSON.parse(row.location) 
          : row.location;
        
        if (!cityName && parsedLocation.city) cityName = parsedLocation.city;
        if (!stateName && parsedLocation.state) stateName = parsedLocation.state;
        if (!district && parsedLocation.country) district = parsedLocation.country;
      } catch (e) {
        console.log('Error parsing location JSON:', e);
      }
    }

    // Format skills as array
    let skillsArray = [];
    if (row.skills) {
      skillsArray = row.skills.split('", "').map(skill => 
        skill.replace(/^\["|"\]$/g, '').replace(/^"|"$/g, '')
      );
    }

    // Get last active timestamp
    let lastActive = null;
    try {
      lastActive = await getLastActive(row.id);
    } catch (e) {
      console.log('Error getting last active:', e);
    }

    // Get class level from user_profiles if needed
    let classLevel = null;
    // You can add additional query here if class_level is in a different table

    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      username: row.username,
      role: row.role,
      show_contact_details: row.show_contact_details,
      is_online: row.is_online,
      subject: row.subject || "",
      location: row.location,
      education: row.education,
      profession: row.profession,
      classLevel: classLevel,
      profile_rating: row.rating ? row.rating.toString() : null,
      city_name: cityName,
      pincode: row.pincode,
      district: district,
      state_name: stateName,
      area: row.area || "",
      skills: JSON.stringify(skillsArray),
      rating: row.rating || 0,
      last_active: lastActive
    };
  }));
}
module.exports = {
    // updateUserActivity,
    processUsers,
    validateUserFormData,
    getTotalVotes,
    findUser,
    findComments,
    findReplies,
    findReplyThread,
    checkUser,
    getUserIDByEmail,
    checkUserByEmail,
    findExpertise,
    getUserStats,
    updateUserActivities,
    createOrUpdateEducations,
    createOrUpdateCertifications,
    createOrUpdateWorkExperiences,
    createOrUpdateSkills,
    createOrUpdateResearch,
    getLastActive,
    getAvailableLocations,
    getAvailableExpertise,
    extractKeywords,
    findUserRating,
    getConnectionStatus,
    getPresentWorkExperience,
    fetchUserProfile,
    getTotalUsers,
    isJobAppliedByUser,
    fetchinstituteProfile
}