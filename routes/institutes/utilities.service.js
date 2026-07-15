const { mysqlcon } = require("../../model/db");

const getTotalVotes = (db, id, type) => {
    switch (type) {
        case 'question':
            try {
                return new Promise((resolve, reject) => {
                    const sql = `SELECT COUNT(*) AS totalCount,
                    (SELECT COUNT(*) FROM ${db}.votes WHERE question_id=${id} AND vote_type = 'upvote') AS upVoteCount,
                    (SELECT COUNT(*) FROM ${db}.votes WHERE question_id=${id} AND vote_type = 'downvote') AS downVoteCount,
                    (SELECT COUNT(*) FROM ${db}.votes WHERE question_id=${id} AND vote_type = 'novote') AS noVoteCount 
                    FROM ${db}.votes WHERE question_id = ?;`
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
                    (SELECT COUNT(*) FROM ${db}.votes WHERE answer_id=${id} AND vote_type = 'upvote') AS upVoteCount,
                    (SELECT COUNT(*) FROM ${db}.votes WHERE answer_id=${id} AND vote_type = 'downvote') AS downVoteCount,
                    (SELECT COUNT(*) FROM ${db}.votes WHERE answer_id=${id} AND vote_type = 'novote') AS noVoteCount 
                    FROM ${db}.votes WHERE question_id = ?;`
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

const findUser = (db, id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id, username, name, email, profile_pic, institute_name, delegate_country, delegate_designation FROM ${db}.users WHERE id=${id};`;
            mysqlcon.query(sql, (error, user) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(user[0]);
                }
            });
        });
    } catch (error) {
        return console.log(error);
    }
}

const checkUser = (db, id) => {
    console.log({db, id});
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS count FROM ${db}.users WHERE id = ${id}`;
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

const checkUserByEmail = (db, email) => {
    console.log({db, email});
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) AS count FROM ${db}.users WHERE email = '${email}'`;
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

const getUserIDByEmail = (db, email) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ${db}.users WHERE email = '${email}'`;
            mysqlcon.query(sql, (error, user) => {
                if (error) {
                    reject(error);
                } else {
                    console.log({user});
                    if(user.length) {
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

const findReplies = (db, id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id, user_id, reply, createdAt FROM ${db}.replies WHERE comment_id=${id};`;
            mysqlcon.query(sql, async (error, replies) => {
                if (error) {
                    reject(error);
                } else {
                    for (var i = 0; i < replies.length; i++) {
                        let user = await findUser(db, replies[i].user_id);
                        replies[i] = { ...replies[i], auther: user };
                    }
                    resolve(replies);
                }
            });
        });
    } catch (error) {
        return console.log(error);
    }
}

const findReplyThread = (db, id) => {
    try {
        return new Promise((resolve, reject) => {
            const sql = `SELECT id, user_id, reply, createdAt FROM ${db}.replies WHERE id=${id} AND is_thread='true';`;
            mysqlcon.query(sql, async (error, replies) => {
                if (error) {
                    reject(error);
                } else {
                    for (var i = 0; i < replies.length; i++) {
                        let user = await findUser(db, replies[i].user_id);
                        replies[i] = { ...replies[i], auther: user };
                    }
                    resolve(replies);
                }
            });
        });
    } catch (error) {
        return console.log(error);
    }
}

const findComments = (db, id, type) => {
    switch (type) {
        case 'question':
            try {
                return new Promise((resolve, reject) => {
                    const sql = `SELECT * FROM ${db}.comments WHERE question_id = ${id};`;
                    mysqlcon.query(sql, async (error, comments) => {
                        if (error) {
                            reject(error);
                        } else {
                            for (var i = 0; i < comments.length; i++) {
                                let user = await findUser(db, comments[i].user_id);
                                let replies = await findReplies(db, comments[i].id);
                                comments[i] = { ...comments[i], auther: user, replies };
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
                    const sql = `SELECT * FROM ${db}.comments WHERE answer_id=${id};`;
                    mysqlcon.query(sql, async (error, comments) => {
                        if (error) {
                            reject(error);
                        } else {
                            for (var i = 0; i < comments.length; i++) {
                                let user = await findUser(db, comments[i].user_id);
                                let replies = await findReplies(db, comments[i].id);
                                comments[i] = { ...comments[i], auther: user, replies };
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

module.exports = {
    getTotalVotes,
    findUser,
    findComments,
    findReplies,
    findReplyThread,
    checkUser,
    getUserIDByEmail,
    checkUserByEmail
}