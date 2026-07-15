const { validationResult } = require("express-validator");
const { mysqlcon } = require("../../model/db");

// Helper function to parse JSON fields safely
const parseJSONField = (fieldValue, fieldName) => {
  if (!fieldValue && fieldValue !== "") return [];

  if (Array.isArray(fieldValue)) {
    return fieldValue.map((item) => String(item).trim()).filter((item) => item);
  }

  if (typeof fieldValue === "string") {
    let cleanString = fieldValue;
    if (fieldValue.includes('\\"')) {
      cleanString = fieldValue.replace(/\\"/g, '"');
    }

    try {
      const parsed = JSON.parse(cleanString);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter((item) => item);
      } else if (typeof parsed === "object" && parsed !== null) {
        if (parsed.users && Array.isArray(parsed.users)) {
          return parsed.users;
        }
        return Object.values(parsed)
          .map((item) => String(item).trim())
          .filter((item) => item);
      }
      return [String(parsed).trim()].filter((item) => item);
    } catch (e) {
      if (cleanString.includes(",")) {
        return cleanString
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);
      }
      return cleanString.trim() ? [cleanString.trim()] : [];
    }
  }

  return [];
};

// Helper function to determine survey status
const determineSurveyStatus = (survey, responseCount = 0) => {
  const now = new Date();
  const startDate = new Date(survey.start_date);
  const endDate = new Date(survey.end_date);
  const isActive = survey.is_active === 1 || survey.is_active === true;

  // Get current status from database or use default
  let currentStatus = survey.status || "draft";

  // If survey is archived, keep it archived (manual operation)
  if (currentStatus === "archived") {
    return {
      status: "archived",
      is_currently_active: false,
      days_remaining: 0,
    };
  }

  // If survey is closed, keep it closed (manual operation)
  if (currentStatus === "closed") {
    return {
      status: "closed",
      is_currently_active: false,
      days_remaining: 0,
    };
  }

  // If survey is not active
  if (!isActive) {
    // If it was published before, mark as closed
    if (currentStatus === "published") {
      return {
        status: "closed",
        is_currently_active: false,
        days_remaining: 0,
      };
    }
    // Otherwise keep as draft
    return {
      status: "draft",
      is_currently_active: false,
      days_remaining: 0,
    };
  }

  // Active surveys
  if (now < startDate) {
    // Not started yet
    return {
      status: "draft", // Or could be 'scheduled' but your enum doesn't have it
      is_currently_active: false,
      days_remaining: Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)),
    };
  } else if (now > endDate) {
    // Past end date
    return {
      status: "expired",
      is_currently_active: false,
      days_remaining: 0,
    };
  } else {
    // Currently running
    // Check if it has responses to determine if it's "complete"
    if (responseCount > 0 && responseCount >= survey.target_count) {
      // If we have target count, we could check completion rate
      return {
        status: "published", // Still published even with responses
        is_currently_active: true,
        days_remaining: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
      };
    }
    return {
      status: "published",
      is_currently_active: true,
      days_remaining: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
    };
  }
};

// 1. Get all surveys (Admin only) - UPDATED
const getAllSurveys = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      is_active,
      search,
      subject,
      location,
      class_level,
      target_role,
      status, // Add status filter
      sort_by = "created_at",
      sort_order = "DESC",
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Base query
    let query = `
      SELECT 
        s.*,
        creator.username as creator_username,
        creator.display_name as creator_display_name,
        creator.role as creator_role,
        actual_creator.username as actual_creator_username,
        actual_creator.display_name as actual_creator_display_name,
        COUNT(sr.id) as response_count
      FROM surveys s 
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN users actual_creator ON s.actual_created_by = actual_creator.id
      LEFT JOIN survey_responses sr ON s.id = sr.survey_id
      WHERE 1=1
    `;

    let countQuery = `SELECT COUNT(*) as total FROM surveys s WHERE 1=1`;
    let queryParams = [];
    let countParams = [];

    // Apply filters
    if (is_active !== undefined && is_active !== "") {
      const activeValue = is_active === "1" || is_active === "true" ? 1 : 0;
      query += ` AND s.is_active = ?`;
      countQuery += ` AND s.is_active = ?`;
      queryParams.push(activeValue);
      countParams.push(activeValue);
    }

    if (status && status.trim() !== "") {
      query += ` AND s.status = ?`;
      countQuery += ` AND s.status = ?`;
      queryParams.push(status.trim());
      countParams.push(status.trim());
    }

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (s.title LIKE ? OR s.description LIKE ?)`;
      countQuery += ` AND (s.title LIKE ? OR s.description LIKE ?)`;
      queryParams.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    if (target_role && target_role.trim() !== "") {
      query += ` AND JSON_CONTAINS(s.target_roles, ?)`;
      countQuery += ` AND JSON_CONTAINS(s.target_roles, ?)`;
      queryParams.push(JSON.stringify(target_role.trim()));
      countParams.push(JSON.stringify(target_role.trim()));
    }

    if (subject && subject.trim() !== "") {
      query += ` AND JSON_CONTAINS(s.target_subjects, ?)`;
      countQuery += ` AND JSON_CONTAINS(s.target_subjects, ?)`;
      queryParams.push(JSON.stringify(subject.trim()));
      countParams.push(JSON.stringify(subject.trim()));
    }

    if (location && location.trim() !== "") {
      query += ` AND JSON_CONTAINS(s.target_locations, ?)`;
      countQuery += ` AND JSON_CONTAINS(s.target_locations, ?)`;
      queryParams.push(JSON.stringify(location.trim()));
      countParams.push(JSON.stringify(location.trim()));
    }

    if (class_level && class_level.trim() !== "") {
      query += ` AND JSON_CONTAINS(s.target_classes, ?)`;
      countQuery += ` AND JSON_CONTAINS(s.target_classes, ?)`;
      queryParams.push(JSON.stringify(class_level.trim()));
      countParams.push(JSON.stringify(class_level.trim()));
    }

    query += ` GROUP BY s.id`;

    const validSortColumns = [
      "created_at",
      "start_date",
      "end_date",
      "rating",
      "experience",
      "title",
      "id",
      "status",
    ];
    const validSortOrders = ["ASC", "DESC"];
    const sortColumn = validSortColumns.includes(sort_by)
      ? sort_by
      : "created_at";
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase())
      ? sort_order.toUpperCase()
      : "DESC";

    query += ` ORDER BY s.${sortColumn} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limitNum, offset);

    const [surveys, countResult] = await Promise.all([
      new Promise((resolve, reject) => {
        mysqlcon.query(query, queryParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        mysqlcon.query(countQuery, countParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
    ]);

    // Parse survey data
    const parsedSurveys = surveys.map((survey) => {
      const statusInfo = determineSurveyStatus(survey, survey.response_count);

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        target_classes: parseJSONField(survey.target_classes, "target_classes"),
        target_subjects: parseJSONField(
          survey.target_subjects,
          "target_subjects",
        ),
        target_locations: parseJSONField(
          survey.target_locations,
          "target_locations",
        ),
        target_roles: parseJSONField(survey.target_roles, "target_roles"),
        created_for: parseJSONField(survey.created_for, "created_for"),
        rating: survey.rating,
        experience: survey.experience,
        questions: parseJSONField(survey.questions, "questions"),
        start_date: survey.start_date,
        end_date: survey.end_date,
        is_active: survey.is_active === 1 || survey.is_active === true,
        status: statusInfo.status,
        database_status: survey.status, // Keep original for reference
        is_currently_active: statusInfo.is_currently_active,
        days_remaining: statusInfo.days_remaining,
        response_count: survey.response_count || 0,
        created_by: {
          id: survey.created_by,
          username: survey.creator_username,
          display_name: survey.creator_display_name,
          role: survey.creator_role,
        },
        actual_created_by: survey.actual_created_by
          ? {
              id: survey.actual_created_by,
              username: survey.actual_creator_username,
              display_name: survey.actual_creator_display_name,
            }
          : null,
        created_by_role: survey.created_by_role,
        created_at: survey.created_at,
        updated_at: survey.updated_at,
      };
    });

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      surveys: parsedSurveys,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_surveys: total,
        surveys_per_page: limitNum,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch surveys",
      error: error.message,
    });
  }
};

// 2. Create Survey - UPDATED with status field
const createSurvey = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      target_classes,
      target_subjects,
      target_locations,
      target_roles,
      created_by,
      created_by_role,
      created_for,
      rating,
      experience,
      questions,
      start_date,
      end_date,
      is_active = true,
      status = "draft", // Default status
    } = req.body;

    console.log("Req.body data is ", req.body);

    const adminId = req.user.id;

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Validate status
    const validStatuses = [
      "draft",
      "published",
      "expired",
      "closed",
      "archived",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Auto-update status based on dates if not specified
    let finalStatus = status;
    const now = new Date();
    if (status === "draft") {
      if (startDate <= now && endDate >= now && is_active) {
        finalStatus = "published";
      } else if (endDate < now) {
        finalStatus = "expired";
      }
    }

    let createdForData = created_for;
    if (
      typeof created_for === "object" &&
      created_for !== null &&
      !Array.isArray(created_for)
    ) {
      createdForData = created_for;
    } else if (!Array.isArray(created_for)) {
      createdForData = [];
    }

    const query = `
      INSERT INTO surveys (
        title, description, target_classes, target_subjects, target_locations,
        target_roles, rating, experience, questions, created_for, status,
        start_date, end_date, is_active, created_by, created_by_role, actual_created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const queryParams = [
      title,
      description || "",
      JSON.stringify(target_classes || []),
      JSON.stringify(target_subjects || []),
      JSON.stringify(target_locations || []),
      JSON.stringify(target_roles || []),
      rating || null,
      experience || null,
      JSON.stringify(questions || []),
      JSON.stringify(createdForData),
      finalStatus,
      start_date,
      end_date,
      is_active ? 1 : 0,
      created_by,
      created_by_role,
      adminId,
    ];

    const result = await new Promise((resolve, reject) => {
      mysqlcon.query(query, queryParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    res.status(201).json({
      success: true,
      message: "Survey created successfully",
      survey_id: result.insertId,
      status: finalStatus,
      created_by: created_by,
      actual_created_by: adminId,
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create survey",
      error: error.message,
    });
  }
};

// 3. Get Survey by ID - UPDATED
const getSurveyById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.*,
        creator.username as creator_username,
        creator.display_name as creator_display_name,
        creator.role as creator_role,
        actual_creator.username as actual_creator_username,
        actual_creator.display_name as actual_creator_display_name,
        COUNT(sr.id) as response_count
      FROM surveys s 
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN users actual_creator ON s.actual_created_by = actual_creator.id
      LEFT JOIN survey_responses sr ON s.id = sr.survey_id
      WHERE s.id = ?
      GROUP BY s.id
    `;

    const results = await new Promise((resolve, reject) => {
      mysqlcon.query(query, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Survey not found",
      });
    }

    const survey = results[0];
    const statusInfo = determineSurveyStatus(survey, survey.response_count);

    const parsedSurvey = {
      ...survey,
      target_classes: survey.target_classes
        ? parseJSONField(survey.target_classes, "target_classes")
        : [],
      target_subjects: survey.target_subjects
        ? parseJSONField(survey.target_subjects, "target_subjects")
        : [],
      target_locations: survey.target_locations
        ? parseJSONField(survey.target_locations, "target_locations")
        : [],
      target_roles: survey.target_roles
        ? parseJSONField(survey.target_roles, "target_roles")
        : [],
      created_for: survey.created_for
        ? parseJSONField(survey.created_for, "created_for")
        : [],
      questions: survey.questions
        ? parseJSONField(survey.questions, "questions")
        : [],
      is_active: survey.is_active === 1 || survey.is_active === true,
      calculated_status: statusInfo.status, // Calculated based on dates
      is_currently_active: statusInfo.is_currently_active,
      days_remaining: statusInfo.days_remaining,
      response_count: survey.response_count || 0,
      created_by: {
        id: survey.created_by,
        username: survey.creator_username || null,
        display_name: survey.creator_display_name || null,
        role: survey.creator_role || null,
      },
      actual_created_by: survey.actual_created_by
        ? {
            id: survey.actual_created_by,
            username: survey.actual_creator_username || null,
            display_name: survey.actual_creator_display_name || null,
          }
        : null,
    };

    delete parsedSurvey.creator_username;
    delete parsedSurvey.creator_display_name;
    delete parsedSurvey.creator_role;
    delete parsedSurvey.actual_creator_username;
    delete parsedSurvey.actual_creator_display_name;

    res.status(200).json({
      success: true,
      survey: parsedSurvey,
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch survey",
      error: error.message,
    });
  }
};

// 4. Update Survey - UPDATED with status validation
const updateSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      target_classes,
      target_subjects,
      target_locations,
      target_roles,
      created_by,
      created_by_role,
      created_for,
      rating,
      experience,
      questions,
      start_date,
      end_date,
      is_active,
      status, // Allow status updates
    } = req.body;

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = [
        "draft",
        "published",
        "expired",
        "closed",
        "archived",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }
    }

    // Check if survey exists
    const checkQuery = `SELECT id, status FROM surveys WHERE id = ?`;
    const checkResults = await new Promise((resolve, reject) => {
      mysqlcon.query(checkQuery, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    console.log("checkResults Survey is ", checkResults);

    // Check if results exist and is not empty
    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Survey not found",
      });
    }

    const currentSurvey = checkResults[0]; // Get first row from array
    console.log("Current Survey is ", currentSurvey);

    // Prevent updating archived surveys (except to unarchive)
    if (currentSurvey.status === "archived" && status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Cannot update archived survey. Change status to draft first.",
      });
    }

    // Build update query
    let updates = [];
    let queryParams = [];

    if (title !== undefined) {
      updates.push("title = ?");
      queryParams.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      queryParams.push(description);
    }
    if (target_classes !== undefined) {
      updates.push("target_classes = ?");
      queryParams.push(JSON.stringify(target_classes));
    }
    if (target_subjects !== undefined) {
      updates.push("target_subjects = ?");
      queryParams.push(JSON.stringify(target_subjects));
    }
    if (target_locations !== undefined) {
      updates.push("target_locations = ?");
      queryParams.push(JSON.stringify(target_locations));
    }
    if (target_roles !== undefined) {
      updates.push("target_roles = ?");
      queryParams.push(JSON.stringify(target_roles));
    }
    if (created_by !== undefined) {
      updates.push("created_by = ?");
      queryParams.push(created_by);
    }
    if (created_by_role !== undefined) {
      updates.push("created_by_role = ?");
      queryParams.push(created_by_role);
    }
    if (created_for !== undefined) {
      updates.push("created_for = ?");
      queryParams.push(JSON.stringify(created_for));
    }
    if (rating !== undefined) {
      updates.push("rating = ?");
      queryParams.push(rating);
    }
    if (experience !== undefined) {
      updates.push("experience = ?");
      queryParams.push(experience);
    }
    if (questions !== undefined) {
      updates.push("questions = ?");
      queryParams.push(JSON.stringify(questions));
    }
    if (start_date !== undefined) {
      updates.push("start_date = ?");
      queryParams.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push("end_date = ?");
      queryParams.push(end_date);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      queryParams.push(is_active ? 1 : 0);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      queryParams.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    queryParams.push(id);

    const query = `UPDATE surveys SET ${updates.join(", ")} WHERE id = ?`;

    const result = await new Promise((resolve, reject) => {
      mysqlcon.query(query, queryParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    res.status(200).json({
      success: true,
      message: "Survey updated successfully",
      affected_rows: result.affectedRows,
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update survey",
      error: error.message,
    });
  }
};

// 5. Delete Survey - UPDATED to check status
const deleteSurvey = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if survey exists and its status
    const checkQuery = `SELECT status FROM surveys WHERE id = ?`;
    const [checkResults] = await new Promise((resolve, reject) => {
      mysqlcon.query(checkQuery, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Survey not found",
      });
    }

    const survey = checkResults[0];

    // Prevent deletion of published or active surveys
    if (survey.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete published survey. Close or archive it first.",
      });
    }

    const query = `DELETE FROM surveys WHERE id = ?`;

    const [result] = await new Promise((resolve, reject) => {
      mysqlcon.query(query, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Survey not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Survey deleted successfully",
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete survey",
      error: error.message,
    });
  }
};

// 6. Get Surveys for Specific User - UPDATED to use database status
const getUserSurveys = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date().toISOString().split("T")[0];

    // Get user details
    const userQuery = `
      SELECT 
        u.id, u.username, u.display_name, u.role,
        u.subject, u.location, u.qualification,
        u.teaching_method, u.experience, u.rating
      FROM users u 
      WHERE u.id = ?
    `;

    const [userResult] = await new Promise((resolve, reject) => {
      mysqlcon.query(userQuery, [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult;

    const userRole = user.role;
    const userSubjects = parseJSONField(user.subject, "user_subject");
    const userLocation = parseJSONField(user.location, "user_location");
    const userQualification = user.qualification || "";
    const userExperience = parseInt(user.experience) || 0;
    const userRating = parseFloat(user.rating) || 0;

    // Get active and published surveys
    const surveyQuery = `
      SELECT s.* 
      FROM surveys s 
      WHERE s.is_active = 1 
        AND s.status = 'published'
        AND s.start_date <= CURDATE() 
        AND s.end_date >= CURDATE()
      ORDER BY s.created_at DESC
    `;

    const [surveysResulte] = await Promise.resolve(
      new Promise((resolve, reject) => {
        mysqlcon.query(surveyQuery, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
    );

    const surveys = Array.isArray(surveysResulte)
      ? surveysResulte
      : [surveysResulte];

    // Filter surveys based on targeting
    const matchingSurveys = surveys?.filter((survey) => {
      const targetRoles = parseJSONField(survey.target_roles, "target_roles");
      const targetClasses = parseJSONField(
        survey.target_classes,
        "target_classes",
      );
      const targetSubjects = parseJSONField(
        survey.target_subjects,
        "target_subjects",
      );
      const targetLocations = parseJSONField(
        survey.target_locations,
        "target_locations",
      );
      const createdFor = parseJSONField(survey.created_for, "created_for");

      if (targetRoles.length > 0 && !targetRoles.includes(userRole)) {
        return false;
      }

      if (createdFor.length > 0) {
        if (createdFor.some((item) => item.toString() === userId.toString())) {
          return true;
        }
        const hasMatchingCriteria = createdFor.some((criteria) => {
          if (typeof criteria === "object") {
            return checkUserAgainstCriteria(user, criteria);
          }
          return false;
        });
        if (hasMatchingCriteria) return true;
      }

      if (userRole === "student" && targetClasses.length > 0) {
        const classMatch = targetClasses.some((targetClass) => {
          return (
            userQualification
              .toLowerCase()
              .includes(targetClass.toLowerCase()) ||
            targetClass.toLowerCase().includes(userQualification.toLowerCase())
          );
        });
        if (!classMatch) return false;
      }

      if (targetSubjects.length > 0) {
        const subjectMatch = targetSubjects.some((targetSubject) => {
          return userSubjects.some((userSubject) => {
            const userSubjLower = userSubject.toLowerCase();
            const targetSubjLower = targetSubject.toLowerCase();
            return (
              userSubjLower.includes(targetSubjLower) ||
              targetSubjLower.includes(userSubjLower)
            );
          });
        });
        if (!subjectMatch) return false;
      }

      if (targetLocations.length > 0) {
        const locationMatch = targetLocations.some((targetLocation) => {
          return userLocation.some((userLoc) => {
            const userLocLower = userLoc.toLowerCase();
            const targetLocLower = targetLocation.toLowerCase();
            return (
              userLocLower.includes(targetLocLower) ||
              targetLocLower.includes(userLocLower)
            );
          });
        });
        if (!locationMatch) return false;
      }

      const surveyExperience = parseInt(survey.experience);
      if (!isNaN(surveyExperience) && userExperience < surveyExperience) {
        return false;
      }

      const surveyRating = parseFloat(survey.rating);
      if (!isNaN(surveyRating) && userRating < surveyRating) {
        return false;
      }

      return true;
    });

    const surveyIds = matchingSurveys.map((s) => s.id);
    let respondedSurveyIds = [];

    if (surveyIds.length > 0) {
      const responseQuery = `
        SELECT survey_id FROM survey_responses 
        WHERE user_id = ? AND survey_id IN (?)
      `;

      const [responses] = await new Promise((resolve, reject) => {
        mysqlcon.query(responseQuery, [userId, surveyIds], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      respondedSurveyIds = responses.map((r) => r.survey_id);
    }

    const availableSurveys = matchingSurveys
      .filter((s) => !respondedSurveyIds.includes(s.id))
      .map((survey) => {
        const statusInfo = determineSurveyStatus(survey);
        return {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          status: statusInfo.status,
          start_date: survey.start_date,
          end_date: survey.end_date,
          days_remaining: statusInfo.days_remaining,
          created_by: survey.created_by,
          has_responded: respondedSurveyIds.includes(survey.id),
        };
      });

    res.status(200).json({
      success: true,
      surveys: availableSurveys,
      total: availableSurveys.length,
      user_details: {
        role: userRole,
        subjects: userSubjects,
        location: userLocation,
        qualification: userQualification,
        experience: userExperience,
        rating: userRating,
      },
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user surveys",
      error: error.message,
    });
  }
};

// 9. Update survey status (new endpoint)
const updateSurveyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      "draft",
      "published",
      "expired",
      "closed",
      "archived",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Check if survey exists
    const checkQuery = `SELECT id, status FROM surveys WHERE id = ?`;
    const [checkResults] = await new Promise((resolve, reject) => {
      mysqlcon.query(checkQuery, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Survey not found",
      });
    }

    const currentSurvey = checkResults[0];

    // Validate status transitions
    const allowedTransitions = {
      draft: ["published", "archived"],
      published: ["closed", "archived"],
      expired: ["closed", "archived"],
      closed: ["published", "archived"],
      archived: ["draft"],
    };

    if (!allowedTransitions[currentSurvey.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentSurvey.status} to ${status}`,
      });
    }

    // Update status
    const query = `UPDATE surveys SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    const [result] = await new Promise((resolve, reject) => {
      mysqlcon.query(query, [status, id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update status",
      });
    }

    res.status(200).json({
      success: true,
      message: `Survey status updated to ${status}`,
      previous_status: currentSurvey.status,
      new_status: status,
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update survey status",
      error: error.message,
    });
  }
};

// 10. Bulk update surveys (cron job for auto-updating expired surveys)
const updateSurveyStatusesCron = async () => {
  try {
    const now = new Date();

    // Update expired surveys
    const expireQuery = `
      UPDATE surveys 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
      WHERE status IN ('draft', 'published') 
        AND end_date < ?
        AND is_active = 1
    `;

    // Update published surveys that should be active
    const publishQuery = `
      UPDATE surveys 
      SET status = 'published', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'draft' 
        AND start_date <= ? 
        AND end_date >= ?
        AND is_active = 1
    `;

    await Promise.all([
      new Promise((resolve, reject) => {
        mysqlcon.query(expireQuery, [now], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        mysqlcon.query(publishQuery, [now, now], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
    ]);

    console.log("Survey statuses updated successfully");
  } catch (error) {
    console.error("Cron job error:", error);
  }
};

// Helper function to check user against criteria
const checkUserAgainstCriteria = (user, criteria) => {
  if (criteria.role && user.role !== criteria.role) {
    return false;
  }

  if (criteria.subjects && Array.isArray(criteria.subjects)) {
    const userSubjects = parseJSONField(user.subject, "user_subject");
    const hasSubject = criteria.subjects.some((subject) =>
      userSubjects.some(
        (userSubj) =>
          userSubj.toLowerCase().includes(subject.toLowerCase()) ||
          subject.toLowerCase().includes(userSubj.toLowerCase()),
      ),
    );
    if (!hasSubject) return false;
  }

  if (criteria.experience) {
    const userExp = parseInt(user.experience) || 0;
    if (criteria.experience.min && userExp < criteria.experience.min) {
      return false;
    }
    if (criteria.experience.max && userExp > criteria.experience.max) {
      return false;
    }
  }

  return true;
};

// 7. Get Potential Creators
const getPotentialCreators = async (req, res) => {
  try {
    const { role, search } = req.query;

    let query = `SELECT id, username, display_name, email, role, subject, location FROM users WHERE 1=1`;
    let queryParams = [];

    if (role) {
      query += ` AND role = ?`;
      queryParams.push(role);
    }

    if (search && search.trim() !== "") {
      query += ` AND (username LIKE ? OR display_name LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY display_name ASC`;

    const [users] = await new Promise((resolve, reject) => {
      mysqlcon.query(query, queryParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const parsedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      subjects: parseJSONField(user.subject, "subject"),
      locations: parseJSONField(user.location, "location"),
    }));

    res.status(200).json({
      success: true,
      users: parsedUsers,
      total: parsedUsers.length,
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch potential creators",
      error: error.message,
    });
  }
};

// 8. Get Survey Statistics - UPDATED
const getSurveyStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    const surveyQuery = `SELECT *, status FROM surveys WHERE id = ?`;
    const [surveyResults] = await new Promise((resolve, reject) => {
      mysqlcon.query(surveyQuery, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!surveyResults || surveyResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Survey not found",
      });
    }

    const countQuery = `SELECT COUNT(*) as response_count FROM survey_responses WHERE survey_id = ?`;
    const [countResult] = await new Promise((resolve, reject) => {
      mysqlcon.query(countQuery, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const survey = surveyResults[0];
    const targetRoles = parseJSONField(survey.target_roles, "target_roles");

    let targetUserQuery = `SELECT COUNT(*) as target_count FROM users WHERE 1=1`;
    let targetParams = [];

    if (targetRoles.length > 0) {
      targetUserQuery += ` AND role IN (?)`;
      targetParams.push(targetRoles);
    }

    const [targetResult] = await new Promise((resolve, reject) => {
      mysqlcon.query(targetUserQuery, targetParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const responseCount = countResult[0]?.response_count || 0;
    const targetCount = targetResult[0]?.target_count || 0;
    const completionRate =
      targetCount > 0 ? ((responseCount / targetCount) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      statistics: {
        survey_id: parseInt(id),
        survey_status: survey.status,
        response_count: responseCount,
        target_user_count: targetCount,
        completion_rate: parseFloat(completionRate),
        current_status: determineSurveyStatus(survey, responseCount).status,
      },
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch survey statistics",
      error: error.message,
    });
  }
};

// const getSurveyProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const userRole = req.user.role;

//     const query = `
//       SELECT
//         s.id,
//         s.title,
//         s.description,
//         s.is_active,
//         s.status,
//         s.start_date,
//         s.end_date,
//         s.rating,
//         s.created_at,
//         s.questions,
//         COUNT(sr.id) as response_count
//       FROM surveys s
//       LEFT JOIN survey_responses sr ON s.id = sr.survey_id
//       WHERE s.created_by = ?
//       GROUP BY s.id
//       ORDER BY s.created_at DESC
//     `;

//     mysqlcon.query(query, [userId], (err, results) => {
//       if (err) {
//         console.error('Database error:', err);
//         return res.status(500).json({
//           success: false,
//           message: 'Failed to fetch surveys',
//           error: err.message
//         });
//       }

//       const processedSurveys = results.map(survey => {
//         const statusInfo = determineSurveyStatus(survey, survey.response_count);

//         return {
//           id: survey.id,
//           title: survey.title,
//           description: survey.description,
//           status: statusInfo.status,
//           database_status: survey.status,
//           questions: survey.questions,
//           start_date: survey.start_date,
//           end_date: survey.end_date,
//           rating: survey.rating,
//           response_count: survey.response_count || 0,
//           created_at: survey.created_at,
//           is_active: survey.is_active === 1 || survey.is_active === true,
//           is_currently_active: statusInfo.is_currently_active,
//           days_remaining: statusInfo.days_remaining
//         };
//       });

//       res.status(200).json({
//         success: true,
//         data: {
//           user_id: userId,
//           user_role: userRole,
//           surveys: processedSurveys
//         }
//       });
//     });

//   } catch (error) {
//     console.error('Controller error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch surveys',
//       error: error.message
//     });
//   }
// };

const getSurveyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // First, get the user's profile details including classLevel, selectedSubjects, and location
    const getUserProfileQuery = `
      SELECT location, classLevel, selectedSubjects 
      FROM user_profiles 
      WHERE user_id = ?
    `;

    mysqlcon.query(getUserProfileQuery, [userId], (userErr, userResults) => {
      if (userErr) {
        console.error("Error fetching user profile:", userErr);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user profile details",
          error: userErr.message,
        });
      }

      if (userResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      const userProfile = userResults[0];

      // Parse user's subjects (handle both string JSON and array)
      let userSubjects = [];
      try {
        userSubjects =
          typeof userProfile.selectedSubjects === "string"
            ? JSON.parse(userProfile.selectedSubjects)
            : userProfile.selectedSubjects || [];
      } catch (e) {
        console.error("Error parsing user subjects:", e);
        userSubjects = [];
      }

      const userLocation = userProfile.location || "";

      // Parse user's class level (handle comma-separated or array)
      let userClasses = [];
      if (userProfile.classLevel) {
        if (typeof userProfile.classLevel === "string") {
          // Check if it's a JSON array or comma-separated string
          if (userProfile.classLevel.startsWith("[")) {
            try {
              userClasses = JSON.parse(userProfile.classLevel);
            } catch (e) {
              userClasses = userProfile.classLevel
                .split(",")
                .map((c) => c.trim());
            }
          } else {
            userClasses = userProfile.classLevel
              .split(",")
              .map((c) => c.trim());
          }
        } else if (Array.isArray(userProfile.classLevel)) {
          userClasses = userProfile.classLevel;
        }
      }

      // Fetch all surveys
      const query = `
        SELECT 
          s.id,
          s.title,
          s.description,
          s.is_active,
          s.status,
          s.start_date,
          s.end_date,
          s.rating,
          s.created_at,
          s.questions,
          s.target_subjects,
          s.target_classes,
          s.target_locations,
          COUNT(sr.id) as response_count
        FROM surveys s
        LEFT JOIN survey_responses sr ON s.id = sr.survey_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `;

      mysqlcon.query(query, (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch surveys",
            error: err.message,
          });
        }

        // Filter surveys where user matches based on subject, class, OR location
        const matchedSurveys = results.filter((survey) => {
          // Parse survey target fields
          let targetSubjects = [];
          let targetClasses = [];
          let targetLocations = [];

          try {
            targetSubjects =
              typeof survey.target_subjects === "string"
                ? JSON.parse(survey.target_subjects)
                : survey.target_subjects || [];

            targetClasses =
              typeof survey.target_classes === "string"
                ? JSON.parse(survey.target_classes)
                : survey.target_classes || [];

            targetLocations =
              typeof survey.target_locations === "string"
                ? JSON.parse(survey.target_locations)
                : survey.target_locations || [];
          } catch (e) {
            console.error("Error parsing JSON for survey:", survey.id, e);
            return false;
          }

          // Check if ANY of the conditions match

          // Subject match: if survey targets any of user's subjects OR survey has no subject targets
          const subjectMatch =
            targetSubjects.length === 0 ||
            (userSubjects.length > 0 &&
              userSubjects.some((userSubject) =>
                targetSubjects.some(
                  (targetSubject) =>
                    targetSubject.toLowerCase() === userSubject.toLowerCase(),
                ),
              ));

          // Class match: if survey targets any of user's classes OR survey has no class targets
          const classMatch =
            targetClasses.length === 0 ||
            (userClasses.length > 0 &&
              userClasses.some((userClass) =>
                targetClasses.some(
                  (targetClass) =>
                    targetClass.toString() === userClass.toString(),
                ),
              ));

          // Location match: if survey targets user's location OR survey has no location targets
          const locationMatch =
            targetLocations.length === 0 ||
            (userLocation &&
              targetLocations.some(
                (loc) =>
                  userLocation.toLowerCase().includes(loc.toLowerCase()) ||
                  loc.toLowerCase().includes(userLocation.toLowerCase()),
              ));

          // Return true if ANY condition matches
          return subjectMatch || classMatch || locationMatch;
        });

        const processedSurveys = matchedSurveys.map((survey) => {
          const statusInfo = determineSurveyStatus(
            survey,
            survey.response_count,
          );

          // Parse target fields for response
          let targetSubjects = [],
            targetClasses = [],
            targetLocations = [];
          try {
            targetSubjects =
              typeof survey.target_subjects === "string"
                ? JSON.parse(survey.target_subjects)
                : survey.target_subjects || [];
            targetClasses =
              typeof survey.target_classes === "string"
                ? JSON.parse(survey.target_classes)
                : survey.target_classes || [];
            targetLocations =
              typeof survey.target_locations === "string"
                ? JSON.parse(survey.target_locations)
                : survey.target_locations || [];
          } catch (e) {
            // Ignore parsing errors here
          }

          // Determine which criteria matched (for information)
          const matchCriteria = [];

          if (
            targetSubjects.length === 0 ||
            (userSubjects.length > 0 &&
              userSubjects.some((us) =>
                targetSubjects.some(
                  (ts) => ts.toLowerCase() === us.toLowerCase(),
                ),
              ))
          ) {
            matchCriteria.push("subject");
          }
          if (
            targetClasses.length === 0 ||
            (userClasses.length > 0 &&
              userClasses.some((uc) =>
                targetClasses.some((tc) => tc.toString() === uc.toString()),
              ))
          ) {
            matchCriteria.push("class");
          }
          if (
            targetLocations.length === 0 ||
            (userLocation &&
              targetLocations.some(
                (loc) =>
                  userLocation.toLowerCase().includes(loc.toLowerCase()) ||
                  loc.toLowerCase().includes(userLocation.toLowerCase()),
              ))
          ) {
            matchCriteria.push("location");
          }

          return {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            status: statusInfo.status,
            database_status: survey.status,
            questions: survey.questions,
            start_date: survey.start_date,
            end_date: survey.end_date,
            rating: survey.rating,
            response_count: survey.response_count || 0,
            created_at: survey.created_at,
            is_active: survey.is_active === 1 || survey.is_active === true,
            is_currently_active: statusInfo.is_currently_active,
            days_remaining: statusInfo.days_remaining,
            match_criteria: matchCriteria, // Shows why this survey was matched
            target_info: {
              subjects: targetSubjects,
              classes: targetClasses,
              locations: targetLocations,
            },
          };
        });

        res.status(200).json({
          success: true,
          data: {
            user_id: userId,
            user_role: userRole,
            user_profile: {
              location: userLocation,
              classLevel: userClasses,
              selectedSubjects: userSubjects,
            },
            surveys: processedSurveys,
            total_matched: processedSurveys.length,
            total_surveys: results.length,
          },
        });
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch surveys",
      error: error.message,
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params; // Get survey id from URL params
    const userId = req.user.id; // Get user id from authenticated user

    // Validate status input
    const validStatuses = [
      "draft",
      "published",
      "expired",
      "closed",
      "archived",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status value. Must be one of: draft, published, expired, closed, archived",
      });
    }

    // Validate survey id
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Survey ID is required",
      });
    }

    // First check if the survey exists and belongs to the user
    const checkQuery =
      "SELECT id, created_by,actual_created_by FROM surveys WHERE id = ?";

    mysqlcon.query(checkQuery, [id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error("Error checking survey:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Failed to verify survey",
          error: checkErr.message,
        });
      }

      if (checkResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      const survey = checkResults[0];

      // Check if the user owns this survey
      if (survey.actual_created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to update this survey",
        });
      }

      // Update the survey status
      const updateQuery = "UPDATE surveys SET status = ? WHERE id = ?";

      mysqlcon.query(updateQuery, [status, id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error("Error updating survey status:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Failed to update survey status",
            error: updateErr.message,
          });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Survey not found or no changes made",
          });
        }

        // Log the status change (optional)
        console.log(
          `Survey ID ${id} status updated to ${status} by user ${userId}`,
        );

        res.status(200).json({
          success: true,
          message: "Survey status updated successfully",
          data: {
            survey_id: id,
            new_status: status,
            updated_at: new Date().toISOString(),
          },
        });
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update survey status",
      error: error.message,
    });
  }
};
module.exports = {
  getSurveyProfile,
  getAllSurveys,
  getSurveyById,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  getUserSurveys,
  getPotentialCreators,
  getSurveyStatistics,
  updateSurveyStatus, // New endpoint
  updateSurveyStatusesCron, // Cron job function
  parseJSONField,
  determineSurveyStatus, // Export for testing
  updateStatus,
};
