const { mysqlcon } = require("../model/db");

const createCategory = (req, res) => {
    const {name} = req.body;
    if (!name) return res.status(409).json({message: "Category name is required"});
    try {
        mysqlcon.query(`INSERT INTO categories (name) VALUES (?)`, [name], (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({message: "Internal server error"});
            } else {
              console.log(result);
              return res.status(201).json({message: 'Category created successfully', id: result.insertId});
            }
          });
    } catch (error) {
        console.log(error);
        return res.status(201).send('Something went wrong');
    }
}
const getCategories = (req, res) => {

    try {
        mysqlcon.query(`SELECT * FROM categories`,
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({message: "Internal server error"});
            }
            return res.status(200).json({
                message: "Categories Found",
                results
            });
        });
    } catch(error) {
        console.log(error);
        return res.status(409).json({message: "Something went wrong"});
    }
}

module.exports = {
    createCategory,
    getCategories
}