const { mysqlcon } = require("../../model/db");

async function postContactUs(req, res) {
  const { contactNo, email, name, message } = req.body;
  console.log("ContactUs Payload: ", req.body);
  if (!contactNo || !email)
    return res.status(404).json({ message: "Phone No or Email is required" });
  try {
    mysqlcon.query(
      `INSERT INTO contacts(name, email, contact_no, message) VALUES (?,?,?,?)`,
      [
        name,
        email,
        contactNo,
        message
      ],
      function (err, result) {
        if (err) {
          return res.status(500).json({ message: "Internal Server Error" });
        }

        return res
          .status(200)
          .json({ message: "Contact Submitted Successfully", result });

      }
    );
  } catch (error) {
    console.log("error", error);
  }
}

module.exports = {
  postContactUs
};
