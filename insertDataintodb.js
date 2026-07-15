// const { DBMODELS } = require("./models/init-models");

// const createUsersWithProfiles = async (rawData) => {
//   try {
//     for (const raw of rawData) {
//       // Extract userData
//       const userData = {
//         username: raw.email.split("@")[0],
//         password: raw.password,
//         email: raw.email,
//         first_name: raw.first_name,
//         middle_name: raw.middle_name,
//         last_name: raw.last_name,
//         phone: raw.contact,
//         role: raw.profession,
//         display_name: raw.displayName,
//         location: raw.address,
//         bio: raw.bio,
//         subject: raw.subject,
//         teaching_method: raw.teaching_method,
//         nearestLocation: raw.nearestLocation,
//       };

//       // Insert into users table
//       const userCreate = await DBMODELS.users.create(userData);

//       // Teacher data (only if teacher)
//       if (raw.profession === "teacher" || raw.role === "teacher") {
//         const teacherData = {
//           name: `${raw.first_name} ${raw.last_name}`,
//           subject: raw.subject,
//           class: raw.classname,
//           city: raw.address.city,
//           state: raw.address.state,
//           contact_info: raw.email,
//         };
//         await DBMODELS.teacher.create(teacherData);
//       }

//       // Location data
//       const locationData = {
//         user_id: userCreate.id,
//         city_name: raw.address.city,
//         district: raw.address.country,
//         state_name: raw.address.state,
//         area: raw.nearestLocation,
//       };
//       await DBMODELS.locations.create(locationData);

//       // User Profile data
//       const userProfileData = {
//         user_id: userCreate.id,
//         first_name: raw.first_name,
//         middle_name: raw.middle_name,
//         last_name: raw.last_name,
//         profession: raw.profession,
//         dob: raw.dob,
//         gender: raw.gender,
//         location: raw.address,
//         selectedSubjects: raw.subject,
//         classLevel: raw.classname,
//         school: raw.school,
//         board: raw.board,
//         twitter: raw.twitter,
//         facebook: raw.facebook,
//         instagram: raw.instagram,
//         youtube: raw.youtube,
//         github: raw.github,
//         linkedin: raw.linkedin,
//       };
//       await DBMODELS.user_profiles.create(userProfileData);
//     }

//     console.log("All users created successfully ✅");
//   } catch (err) {
//     console.error("Error creating users:", err);
//   }
// };

// module.exports = createUsersWithProfiles;





