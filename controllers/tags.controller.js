const { mysqlcon } = require("../model/db");

const getTags = async (req, res) => {
    const id = req.params.id;

    if (!id) {
        return res.status(400).json({
            error: 'You must provide an id'
        });
    }

    try {
        let sql = `SELECT * FROM tags WHERE categoryId = ${id};`;
        mysqlcon.query(sql, (err, rows) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
            console.log("Tags: ",rows)
            return res.status(200).json({
                tags: rows,
                message: 'Tags were successfully retrieved'
            });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}

const getAllTags = async (req, res) => {

    try {
        let sql = `SELECT * FROM tags;`;
        mysqlcon.query(sql, (err, rows) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
            return res.status(200).json({
                tags: rows,
                message: 'Tags were successfully retrieved'
            });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}

module.exports = {
    getTags,
    getAllTags
}