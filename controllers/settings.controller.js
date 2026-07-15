const { mysqlcon } = require("../model/db");


const updatePrivacySettings = async (req, res, next) => {
    const { userId } = req.params;
    const { profile, email, avatar, country, bio, social_links } = req.body;
    console.log("Updated Privacy Setting", req.body);
    
    try {
        // Use INSERT ... ON DUPLICATE KEY UPDATE (requires user_id to be PRIMARY/UNIQUE KEY)
        const upsertQuery = `
            INSERT INTO privacy_settings 
                (user_id, profile, email, avatar, country, bio, social_links) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                profile = VALUES(profile),
                email = VALUES(email),
                avatar = VALUES(avatar),
                country = VALUES(country),
                bio = VALUES(bio),
                social_links = VALUES(social_links)
        `;
        
        const values = [
            userId,
            profile !== undefined ? profile : 'public',
            email !== undefined ? email : 'public',
            avatar !== undefined ? avatar : 'public',
            country !== undefined ? country : 'public',
            bio !== undefined ? bio : 'public',
            social_links !== undefined ? social_links : 'public'
        ];

        mysqlcon.query(upsertQuery, values, (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            
            const message = result.affectedRows === 1 
                ? 'Privacy settings created successfully' 
                : 'Privacy settings updated successfully';
                
            return res.status(200).json({ message });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const getPrivacySettings = (req, res) => {
    const { userId } = req.params;

    try {
        const query = `SELECT * FROM privacy_settings WHERE user_id = ?`;
        mysqlcon.query(query, [userId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: 'Privacy settings doest not exists' });
            }

            const privacySettings = result[0];
            res.status(200).json({ message: "Privacy Settings Fectched", privacySettings });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const updateEmail = (req, res) => {
  const { userId } = req.params;
  const { email,isInstitute } = req.body;

  try {
    let sql;
    if(isInstitute){

        sql= `UPDATE institutes SET email = ? WHERE id = ?`;
    } else {
        sql = `UPDATE users SET email = ? WHERE id = ?`;

    }

    mysqlcon.query(sql, [email, userId], (err, result) => {
      if (err) {
        console.error("Error updating email:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      return res.json({ success: true, message: "Email updated successfully" });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
    updatePrivacySettings,
    getPrivacySettings,
    updateEmail
}