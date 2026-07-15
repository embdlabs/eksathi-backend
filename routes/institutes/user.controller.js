const { mysqlcon } = require("../../model/db");

const updateUser = async (req, res) => {
    let id = req.instituteId;
    let db = req.institute.database_name;
    const email = req.query.email;
    const userData = req.body;
    const columnsToUpdate = [];

    if(!id){
        return res.status(498).json({message: 'Institute ID not found'});
    }

    // Check which columns to update based on available data
    if (userData.name) {
        columnsToUpdate.push(`name='${userData.name}'`);
    }
    // if (userData.email) {
    //     columnsToUpdate.push(`email='${userData.email}'`);
    // }
    if (userData.profile_pic) {
        columnsToUpdate.push(`profile_pic='${userData.profile_pic}'`);
    }
    if (userData.instituteName) {
        columnsToUpdate.push(`institute_name='${userData.instituteName}'`);
    }
    if (userData.delegateCountry) {
        columnsToUpdate.push(`delegate_country='${userData.delegateCountry}'`);
    }
    if (userData.delegateDesignation) {
        columnsToUpdate.push(`delegate_designation='${userData.delegateDesignation}'`);
    }

    if (columnsToUpdate.length === 0) {
        // No columns to update
        res.status(400).json({ success: false, message: 'No data provided for update' });
        return;
    }

    try {
        // Update the user data
        const query = `UPDATE ${db}.users SET ${columnsToUpdate.join(', ')} WHERE email=?`;
       await mysqlcon.query(query, [email], 
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({message: 'Internal Server Error'});
            }
            if (results.affectedRows === 1) {
                res.json({ success: true, message: 'User details updated successfully' });
            } else {
                res.status(404).json({ success: false, message: 'User not found' });
            }
        });

       
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

module.exports = {
    updateUser
}
