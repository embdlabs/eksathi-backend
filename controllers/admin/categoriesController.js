const axios = require("axios");
const { default: slugify } = require("slugify");
const { mysqlcon } = require("../../model/db");

const getCategories = (req, res) => {
  try {
    mysqlcon.query(
      `SELECT id,name,slug,icon,createdAt FROM categories order by createdAt DESC`,
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Internal server error" });
        }
        return res.status(200).json({
          message: "Categories Found",
          results,
        });
      }
    );
  } catch (error) {
    console.log(error);
    return res.status(409).json({ message: "Something went wrong" });
  }
};

const createCategory = (req, res) => {
  try {
    const { name, icon,slug } = req.body;

    // Check if name and icon are provided
    if (!name || !icon) {
      return res
        .status(400)
        .json({ message: "Category name and icon are required" });
    }

    // Check minimum length for category name
    if (name.length < 3) {
      return res
        .status(400)
        .json({ message: "Category name must be at least 3 characters" });
    }

    // Check if category already exists
    const existCategoryQuery = "SELECT * FROM categories WHERE name = ?";
    mysqlcon.query(existCategoryQuery, [name], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (results.length > 0) {
        return res.status(409).json({ message: "Category already exists" });
      }

      // Generate slug for the category
      let slug = slugify(
        name.toLowerCase().replace(/[^a-zA-Z0-9()!@#$%^&*|\<>,./?_]/g, "-")
      );

      // Check if slug already exists
      mysqlcon.query(
        `SELECT COUNT(*) as count FROM categories WHERE slug = ?`,
        [slug],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal server error" });
          }
          if (result[0].count > 0) {
            slug = slug + "-";
          }

          // Insert the category into the database
          const insertCategoryQuery = `INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)`;
          const values = [name, slug, icon];
          mysqlcon.query(insertCategoryQuery, values, (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Internal server error" });
            }
            return res.status(201).json({
              message: "Category created successfully",
              id: result.insertId,
            });
          });
        }
      );
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


const updateCategories = (req, res) => {
  const categoryId = req.params.id;
  const { name, slug, icon } = req.body.category;

  const query =
    "UPDATE categories SET name = ?, icon = ? ,slug = ?, updatedAt = NOW() WHERE id = ?";

  const values = [name, icon, slug, categoryId];

  try {
    mysqlcon.query(query, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: "Internal server error" });
      }
      return res
        .status(200)
        .json({ message: "Categories updated successfully" });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteCategories = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    const sql = "DELETE FROM categories WHERE id=?";
    const values = [id];

    mysqlcon.query(sql, values, (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Failed to delete category", error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.status(200).json({ message: "Category deleted successfully" });
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err });
  }
};
module.exports = {
  getCategories,
  createCategory,
  updateCategories,
  deleteCategories,
};
