// const { updateUserActivity } = require('../service/utilities.service');

// const trackActivity = async (req, res, next) => {
//   const { userId, isActive } = req.body;
//   console.log('Active User : ', { userId, isActive });
//   try {
//     await updateUserActivity(userId, isActive);
//     next();
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//     console.log("Error : ",err)
//   }
// };

// module.exports = trackActivity;