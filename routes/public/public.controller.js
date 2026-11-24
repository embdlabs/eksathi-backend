const { mysqlcon } = require("../../model/db");
const { sendContactUsAck } = require("../../utils/transactionalMails");

async function postContactUs(req, res) {
  const { contactNo, email, name, message, role } = req.body;
  if (!contactNo || !email) {
    return res.status(400).json({ message: "Phone No or Email is required" });
  }
  // Store role in message text (no schema change). Skip if FE already prefixed.
  const storedMessage =
    role && message && !String(message).startsWith("[Role:")
      ? `[Role: ${role}]\n${message}`
      : message;
  try {
    mysqlcon.query(
      `INSERT INTO contacts(name, email, contact_no, message) VALUES (?,?,?,?)`,
      [name, email, contactNo, storedMessage],
      function (err) {
        if (err) {
          return res.status(500).json({ message: "Internal Server Error" });
        }

        sendContactUsAck({ email, name });

        return res
          .status(200)
          .json({ message: "Contact Submitted Successfully" });
      }
    );
  } catch (error) {
    console.log("contactus error");
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  postContactUs,
};
