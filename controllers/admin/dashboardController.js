const { mysqlcon } = require("../../model/db");

const totalUsers = async (req, res) => {
  try {
    // SQL query to count total users, group by role and status
    const query = `
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS total_students,
        SUM(CASE WHEN role = 'student' AND status = 'active' THEN 1 ELSE 0 END) AS students_active,
        SUM(CASE WHEN role = 'student' AND status = 'inactive' THEN 1 ELSE 0 END) AS students_inactive,
        SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) AS total_teachers,
        SUM(CASE WHEN role = 'teacher' AND status = 'active' THEN 1 ELSE 0 END) AS teachers_active,
        SUM(CASE WHEN role = 'teacher' AND status = 'inactive' THEN 1 ELSE 0 END) AS teachers_inactive,
        SUM(CASE WHEN role = 'professional' THEN 1 ELSE 0 END) AS total_professionals,
        SUM(CASE WHEN role = 'professional' AND status = 'active' THEN 1 ELSE 0 END) AS professionals_active,
        SUM(CASE WHEN role = 'professional' AND status = 'inactive' THEN 1 ELSE 0 END) AS professionals_inactive,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admins,
        SUM(CASE WHEN role = 'admin' AND status = 'active' THEN 1 ELSE 0 END) AS admins_active,
        SUM(CASE WHEN role = 'admin' AND status = 'inactive' THEN 1 ELSE 0 END) AS admins_inactive,
        SUM(CASE WHEN role = 'moderator' THEN 1 ELSE 0 END) AS total_moderators,
        SUM(CASE WHEN role = 'moderator' AND status = 'active' THEN 1 ELSE 0 END) AS moderators_active,
        SUM(CASE WHEN role = 'moderator' AND status = 'inactive' THEN 1 ELSE 0 END) AS moderators_inactive,
        SUM(CASE WHEN role = 'institute' THEN 1 ELSE 0 END) AS total_institutes,
        SUM(CASE WHEN role = 'institute' AND status = 'active' THEN 1 ELSE 0 END) AS institutes_active,
        SUM(CASE WHEN role = 'institute' AND status = 'inactive' THEN 1 ELSE 0 END) AS institutes_inactive
      FROM users;
    `;

    // Execute the query
    const [result] = await mysqlcon.promise().query(query);

    // Extract all counts
    const counts = result[0];

    console.log("User counts:", counts);

    // Return the counts in the response
    return res.status(200).json({
      message: "Role-based user counts with status retrieved successfully",
      data: {
        total_users: counts.total_users,
        students: {
          total: counts.total_students,
          active: counts.students_active,
          inactive: counts.students_inactive,
        },
        teachers: {
          total: counts.total_teachers,
          active: counts.teachers_active,
          inactive: counts.teachers_inactive,
        },
        professionals: {
          total: counts.total_professionals,
          active: counts.professionals_active,
          inactive: counts.professionals_inactive,
        },
        admins: {
          total: counts.total_admins,
          active: counts.admins_active,
          inactive: counts.admins_inactive,
        },
        moderators: {
          total: counts.total_moderators,
          active: counts.moderators_active,
          inactive: counts.moderators_inactive,
        },
        institutes: {
          total: counts.total_institutes,
          active: counts.institutes_active,
          inactive: counts.institutes_inactive,
        },
      },
    });
  } catch (err) {
    // Log the error for debugging
    console.error("Error retrieving role-based user counts:", err);

    // Return an internal server error response
    return res.status(500).json({ message: "Internal Server Error" });
  }
};




const newUsers = (req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // Subtract 7 days from the current date

  try {
    mysqlcon.query(
      "SELECT COUNT(*) AS new_users FROM users WHERE createdAt >= ?",
      [oneWeekAgo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        const newUsersCount = result[0].new_users;
        return res.status(200).json({ new_users: newUsersCount });
      }
    );
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const newInstitute = (req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // Subtract 7 days from the current date

  try {
    mysqlcon.query(
      "SELECT COUNT(*) AS new_institutes FROM institutes WHERE createdAt >= ? ",
      [oneWeekAgo],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        const newUsersCount = result[0].new_institutes;

        return res.status(200).json({ new_institute: newUsersCount });
      }
    );
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const totalInstitute = async (req, res) => {
  try {
    // SQL query to count total institutes and group by status
    const query = `
      SELECT 
        COUNT(*) AS total_institutes,
        SUM(CASE WHEN status = 'Verification' THEN 1 ELSE 0 END) AS verification,
        SUM(CASE WHEN status = 'Onboarding' THEN 1 ELSE 0 END) AS onboarding,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN status = 'On-Hold' THEN 1 ELSE 0 END) AS on_hold,
        SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END) AS suspended,
        SUM(CASE WHEN status = 'Re-Verification' THEN 1 ELSE 0 END) AS re_verification
      FROM institutes;
    `;

    // Execute the query
    const [result] = await mysqlcon.promise().query(query);

    // Extract the counts
    const counts = result[0];

    console.log("Institute counts:", counts);

    // Return the counts in the response
    return res.status(200).json({
      message: "Total institutes with status retrieved successfully",
      data: {
        total_institutes: counts.total_institutes,
        by_status: {
          verification: counts.verification,
          onboarding: counts.onboarding,
          active: counts.active,
          inactive: counts.inactive,
          on_hold: counts.on_hold,
          suspended: counts.suspended,
          re_verification: counts.re_verification,
        },
      },
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Error retrieving total institutes:", err);

    // Return a server error response
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



const totalQuestions = async (req, res) => {
  try {
    // SQL query to count total questions
    const query = "SELECT COUNT(*) AS total_questions FROM questions";

    // Execute the query
    const [result] = await mysqlcon.promise().query(query);

    // Extract the total count
    const totalCount = result[0]?.total_questions;

    // Return the total count in the response
    return res.status(200).json({
      message: "Total questions retrieved successfully",
      total_count: totalCount,
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Error retrieving total questions:", err);

    // Return a server error response
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const lineChart = (req, res) => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  try {
    mysqlcon.query(
      "SELECT Month(createdAt) AS month, COUNT(*) AS total_users FROM users WHERE createdAt >= ? GROUP BY Month(createdAt);",
      (err, userResult) => {
        if (err) {
          console.log(err);
          return;
        }
        mysqlcon.query(
          "SELECT Month(createdAt) AS month, COUNT(*) AS total_institutes FROM institutes WHERE createdAt >= ? GROUP BY Month(createdAt);",
          (err, institueResult) => {
            if (err) {
              console.log(err);
              return;
            }

            const response = {
              users: userResult,
              institutes: institueResult,
            };
            res.json(response);
          }
        );
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
//get Teachers Data
const getTeachers = (req, res) => {
  try {
    const query = "SELECT * FROM user_profiles";
    mysqlcon.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      res.status(200).send(result);
    });
  } catch (err) {
    console.log(err);
  }
};
const totalJobs = async (req, res) => {
  try {
    // SQL query to count total jobs and group by status
    const query = `
      SELECT 
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN status = 'renewed' THEN 1 ELSE 0 END) AS renewed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM job_descriptions;
    `;

    // Execute the query
    const [result] = await mysqlcon.promise().query(query);

    // Extract the counts
    const counts = result[0];

    console.log("Job counts:", counts);

    // Return the counts in the response
    return res.status(200).json({
      message: "Total jobs with status retrieved successfully",
      data: {
        total_jobs: counts.total_jobs,
        by_status: {
          active: counts.active,
          inactive: counts.inactive,
          expired: counts.expired,
          renewed: counts.renewed,
          cancelled: counts.cancelled,
        },
      },
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Error retrieving total jobs:", err);

    // Return a server error response
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



const totalComments = async (req, res) => {
  try {
    // SQL query to fetch all comments
    const query = "SELECT * FROM comments";

    // Execute the query
    const [comments] = await mysqlcon.promise().query(query);

    // Return the list of comments
    return res.status(200).json({
      message: "Comments retrieved successfully",
      data: comments,
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Error retrieving comments:", err);

    // Return a server error response
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const totalAnswers = async (req, res) => {
  try {
    // SQL query to fetch all answers
    const query = "SELECT * FROM answers";

    // Execute the query
    const [answers] = await mysqlcon.promise().query(query);

    // Return the list of answers
    return res.status(200).json({
      message: "Answers retrieved successfully",
      data: answers,
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Error retrieving answers:", err);

    // Return a server error response
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const totalEvents = async (req, res) => {
  try {
    // SQL query to fetch all events
    const query = `
      SELECT * FROM events;
    `;

    // Execute the raw query
    const [results] = await mysqlcon.promise().query(query);

    if (results.length === 0) {
      return res.status(204).json({
        success: true,
        message: 'No events found.',
        results: []
      });
    }

    // Return the list of events
    return res.status(200).json({
      success: true,
      message: 'Events retrieved successfully.',
      results: results,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching events.',
      error: error.message,
    });
  }
};

const getUserActivityStatus = async (req, res) => {
  try {
    // SQL query to get activity counts grouped by year, month, day, hour, and activity_type
    const activityQuery = `
      SELECT 
        YEAR(timestamp) AS year, 
        MONTH(timestamp) AS month, 
        DAY(timestamp) AS day, 
        HOUR(timestamp) AS hour, 
        activity_type, 
        COUNT(*) AS user_count 
      FROM user_activity
      GROUP BY year, month, day, hour, activity_type
      ORDER BY year ASC, month ASC, day ASC, hour ASC;
    `;

    // Execute the query
    const [activityData] = await mysqlcon.promise().query(activityQuery);

    // Transform the data into a nested structure for easier charting
    const structuredData = activityData.reduce((acc, row) => {
      const { year, month, day, hour, activity_type, user_count } = row;

      // Ensure the year exists in the structure
      if (!acc[year]) acc[year] = {};
      // Ensure the month exists
      if (!acc[year][month]) acc[year][month] = {};
      // Ensure the day exists
      if (!acc[year][month][day]) acc[year][month][day] = {};
      // Ensure the hour exists
      if (!acc[year][month][day][hour]) acc[year][month][day][hour] = {};
      // Add the activity count for the given activity type
      acc[year][month][day][hour][activity_type] = user_count;

      return acc;
    }, {});

    // Return the structured data as a response
    return res.status(200).json({
      message: "User activity data retrieved successfully",
      data: structuredData,
    });
  } catch (err) {
    console.error("Error fetching user activity chart data:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



const getTutors = async (req, res) => {
  try {
    // SQL query to fetch all events
    const query = `
      SELECT * FROM tutors;
    `;

    // Execute the raw query
    const [results] = await mysqlcon.promise().query(query);

    if (results.length === 0) {
      return res.status(204).json({
        success: true,
        message: 'No Tutor found.',
        results: []
      });
    }

    // Return the list of events
    return res.status(200).json({
      success: true,
      message: ' Tutor retrieved successfully.',
      results: results,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching tutor.',
      error: error.message,
    });
  }
};


// const userTrends = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         DATE_FORMAT(createdAt, '%b') as month,
//         DATE_FORMAT(createdAt, '%Y-%m') as yearMonth,
//         SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as Students,
//         SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as Teachers,
//         SUM(CASE WHEN role = 'professional' THEN 1 ELSE 0 END) as Professionals
//       FROM users
//       WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
//       GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), DATE_FORMAT(createdAt, '%b')
//       ORDER BY yearMonth ASC;
//     `;

//     // Execute the raw query
//     const [results] = await mysqlcon.promise().query(query);

//     // Map to desired format
//     const trends = results.map(row => ({
//       month: row.month,
//       Students: row.Students,
//       Teachers: row.Teachers,
//       Professionals: row.Professionals
//     }));

//     res.status(200).json({
//       success: true,
//       data: trends
//     });

//   } catch (error) {
//     console.error('Error fetching user trends:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch user trends',
//       error: error.message
//     });
//   }
// };

const userTrends = async (req, res) => {
  try {
    const query = `
      SELECT 
        DATE_FORMAT(createdAt, '%b') as month,
        DATE_FORMAT(createdAt, '%Y-%m') as yearMonth,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as Students,
        SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as Teachers,
        SUM(CASE WHEN role = 'professional' THEN 1 ELSE 0 END) as Professionals
      FROM users
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), DATE_FORMAT(createdAt, '%b')
      ORDER BY yearMonth ASC;
    `;

    // Execute the raw query
    const [results] = await mysqlcon.promise().query(query);

    // Generate last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = months[date.getMonth()];
      last6Months.push({ yearMonth, month: monthName });
    }

    // Create a map of existing data
    const dataMap = {};
    results.forEach(row => {
      dataMap[row.yearMonth] = {
        Students: row.Students,
        Teachers: row.Teachers,
        Professionals: row.Professionals
      };
    });

    // Fill in all 6 months
    const trends = last6Months.map(({ yearMonth, month }) => {
      const data = dataMap[yearMonth] || { Students: 0, Teachers: 0, Professionals: 0 };
      
      return {
        month,
        Students: data.Students,
        Teachers: data.Teachers,
        Professionals: data.Professionals
      };
    });

    res.status(200).json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Error fetching user trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user trends',
      error: error.message
    });
  }
};

const getWeeklyActivity = async (req, res) => {
  try {
    // SQL query to get weekly activity from last 7 days
    const query = `
      SELECT 
        DAYNAME(activity_date) as day,
        COALESCE(SUM(posts), 0) as Posts,
        COALESCE(SUM(comments), 0) as Comments,
        COALESCE(SUM(messages), 0) as Messages,
        COALESCE(SUM(appointments), 0) as Appointments,
        DAYOFWEEK(activity_date) as day_order
      FROM (
        -- Comments
        SELECT 
          DATE(createdAt) as activity_date,
          COUNT(*) as posts,
          0 as comments,
          0 as messages,
          0 as appointments
        FROM comments
        WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(createdAt)
        
        UNION ALL
        
        -- Comments (duplicate for visual purpose)
        SELECT 
          DATE(createdAt) as activity_date,
          0 as posts,
          COUNT(*) as comments,
          0 as messages,
          0 as appointments
        FROM comments
        WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(createdAt)
        
        UNION ALL
        
        -- Messages
        SELECT 
          DATE(createdAt) as activity_date,
          0 as posts,
          0 as comments,
          COUNT(*) as messages,
          0 as appointments
        FROM messages
        WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(createdAt)
        
        UNION ALL
        
        -- Answers (for Appointments)
        SELECT 
          DATE(createdAt) as activity_date,
          0 as posts,
          0 as comments,
          0 as messages,
          COUNT(*) as appointments
        FROM answers
        WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(createdAt)
      ) as combined_activity
      GROUP BY activity_date, day, day_order
      ORDER BY day_order;
    `;

    // Execute the query
    const [results] = await mysqlcon.promise().query(query);

    // Format day names to 3 letters (Mon, Tue, etc.)
    const formattedResults = results.map(row => ({
      day: row.day.substring(0, 3), // Convert "Monday" to "Mon"
      // Posts: parseInt(row.Posts),
      Comments: parseInt(row.Comments),
      Messages: parseInt(row.Messages),
      Appointments: parseInt(row.Appointments)
    }));

    // Ensure all 7 days are present (fill missing days with 0)
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activityMap = new Map();

    // Initialize all days with 0
    daysOfWeek.forEach(day => {
      activityMap.set(day, {
        day: day,
        Posts: 0,
        Comments: 0,
        Messages: 0,
        Appointments: 0
      });
    });

    // Fill with actual data
    formattedResults.forEach(row => {
      activityMap.set(row.day, row);
    });

    // Convert map to array in correct order
    const finalResults = daysOfWeek.map(day => activityMap.get(day));

    res.status(200).json({
      success: true,
      data: finalResults
    });

  } catch (error) {
    console.error('Error fetching weekly activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly activity',
      error: error.message
    });
  }
};





module.exports = {
  totalUsers,
  newUsers,
  newInstitute,
  totalInstitute,
  totalQuestions,
  lineChart,
  getTeachers,
  totalJobs,
  totalComments,
  totalAnswers,
  totalEvents,
  getUserActivityStatus,
  getTutors,
  userTrends,
  getWeeklyActivity
};
