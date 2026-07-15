const { mysqlcon } = require("../../model/db");

// Helper function to safely parse JSON
const safeParseJSON = (data) => {
  if (!data) return null;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("JSON parse error:", e);
    return null;
  }
};

// Helper function to validate answers based on question type
const validateAnswer = (questionType, answer) => {
  if (answer === null || answer === undefined) return false;

  switch (questionType.toLowerCase()) {
    case "rating":
      return (
        Array.isArray(answer) &&
        answer.length === 1 &&
        !isNaN(answer[0]) &&
        answer[0] >= 1 &&
        answer[0] <= 5
      );

    case "single":
      return (
        Array.isArray(answer) &&
        answer.length === 1 &&
        typeof answer[0] === "string" &&
        answer[0].trim().length > 0
      );

    case "multiple":
      return (
        Array.isArray(answer) &&
        answer.length > 0 &&
        answer.every(
          (item) => typeof item === "string" && item.trim().length > 0,
        )
      );

    case "scale":
      return (
        Array.isArray(answer) &&
        answer.length === 1 &&
        !isNaN(answer[0]) &&
        answer[0] >= 1 &&
        answer[0] <= 10
      );

    case "text":
      return (
        Array.isArray(answer) &&
        answer.length === 1 &&
        typeof answer[0] === "string" &&
        answer[0].trim().length > 0
      );

    default:
      return false;
  }
};

// Helper function to calculate rewards
const calculateRewards = (userId, surveyId, responseId, callback) => {
  const pointsQuery = `
    SELECT 
      CASE 
        WHEN JSON_LENGTH(questions) <= 5 THEN 50
        WHEN JSON_LENGTH(questions) <= 10 THEN 100
        WHEN JSON_LENGTH(questions) <= 15 THEN 150
        ELSE 200
      END as points
    FROM surveys
    WHERE id = ?
  `;

  mysqlcon.query(pointsQuery, [surveyId], (err, result) => {
    if (err || result.length === 0) {
      return callback(err, null);
    }

    const points = result[0].points || 50;

    // Award points to user (assuming user_points table exists)
    const awardQuery = `
      INSERT INTO user_points 
      (user_id, points, source, source_id, description)
      VALUES (?, ?, 'survey_completion', ?, ?)
      ON DUPLICATE KEY UPDATE 
      points = points + VALUES(points),
      updated_at = UTC_TIMESTAMP()
    `;

    const description = `Completed survey #${surveyId}`;

    mysqlcon.query(
      awardQuery,
      [userId, points, responseId, description],
      (awardErr) => {
        if (awardErr) {
          console.error("Error awarding points:", awardErr);
          return callback(awardErr, null);
        }

        callback(null, {
          points_awarded: points,
          description: description,
        });
      },
    );
  });
};

// ====================== SURVEY MANAGEMENT ======================

// Create a new survey
const createSurvey = (req, res) => {
  try {
    const {
      title,
      description,
      target_classes = [],
      target_subjects = [],
      target_locations = [],
      target_roles = [],
      questions = [],
      start_date,
      end_date,
      created_for = [],
      rating,
      experience,
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role || req.user.created_by_role;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Survey title is required",
      });
    }

    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date
      ? new Date(end_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const surveyData = {
      title: title.trim(),
      description: description ? description.trim() : null,
      target_classes: JSON.stringify(target_classes),
      target_subjects: JSON.stringify(target_subjects),
      target_locations: JSON.stringify(target_locations),
      target_roles: JSON.stringify(target_roles),
      questions: JSON.stringify(questions),
      start_date: startDate.toISOString().slice(0, 19).replace("T", " "),
      end_date: endDate.toISOString().slice(0, 19).replace("T", " "),
      created_for: JSON.stringify(created_for),
      rating: rating || null,
      experience: experience || null,
      status: "draft",
      created_by: userId,
      actual_created_by: userId,
      created_by_role: userRole,
      is_active: 1,
    };

    const query = `INSERT INTO surveys SET ?`;

    mysqlcon.query(query, surveyData, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to create survey",
          error: err.message,
        });
      }

      res.status(201).json({
        success: true,
        message: "Survey created successfully",
        data: {
          survey_id: result.insertId,
          title: surveyData.title,
          status: "draft",
          start_date: surveyData.start_date,
          end_date: surveyData.end_date,
        },
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all surveys with filters
const getAllSurveys = (req, res) => {
  try {
    const {
      status,
      created_by,
      page = 1,
      limit = 20,
      search,
      is_active,
      start_date_from,
      start_date_to,
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, title, description, status, is_active,
        start_date, end_date, created_by, created_at,
        rating, experience,
        JSON_LENGTH(questions) as question_count
      FROM surveys 
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(is_active === "true" ? 1 : 0);
    }

    if (created_by) {
      query += ` AND created_by = ?`;
      params.push(created_by);
    }

    if (search) {
      query += ` AND (title LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (start_date_from) {
      query += ` AND start_date >= ?`;
      params.push(start_date_from);
    }

    if (start_date_to) {
      query += ` AND start_date <= ?`;
      params.push(start_date_to);
    }

    // For non-admin users, show only published surveys they can access
    if (userRole !== "admin" && userRole !== "superadmin") {
      query += ` AND status = 'published' AND is_active = 1`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    mysqlcon.query(query, params, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message,
        });
      }

      // Process JSON fields
      const processedResults = results.map((survey) => ({
        ...survey,
        question_count: survey.question_count || 0,
      }));

      // Get total count
      const countQuery = query
        .replace(/SELECT.*FROM/s, "SELECT COUNT(*) as total FROM")
        .replace(/ORDER BY.*LIMIT.*OFFSET.*/s, "");

      mysqlcon.query(
        countQuery,
        params.slice(0, -2),
        (countErr, countResult) => {
          if (countErr) {
            console.error("Count error:", countErr);
            return res.status(500).json({
              success: false,
              message: "Count error",
              error: countErr.message,
            });
          }

          const total = countResult[0]?.total || 0;

          res.status(200).json({
            success: true,
            data: {
              surveys: processedResults,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit),
                has_more: page < Math.ceil(total / limit),
              },
            },
          });
        },
      );
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get survey by ID
const getSurveyById = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    let query = `
      SELECT 
        s.*,
        u.username as creator_username,
        u.email as creator_email,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        JSON_LENGTH(s.questions) as question_count,
        (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as response_count
      FROM surveys s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
    const params = [id];

    // For non-admin users, check if they can access this survey
    if (userRole !== "admin" && userRole !== "superadmin") {
      query += ` AND s.status = 'published' AND s.is_active = 1 
                AND s.start_date <= UTC_TIMESTAMP() 
                AND s.end_date >= UTC_TIMESTAMP()`;
    }

    mysqlcon.query(query, params, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found or not accessible",
        });
      }

      const survey = results[0];

      // Parse JSON fields
      const processedSurvey = {
        ...survey,
        target_classes: safeParseJSON(survey.target_classes),
        target_subjects: safeParseJSON(survey.target_subjects),
        target_locations: safeParseJSON(survey.target_locations),
        target_roles: safeParseJSON(survey.target_roles),
        questions: safeParseJSON(survey.questions),
        created_for: safeParseJSON(survey.created_for),
        creator: {
          username: survey.creator_username,
          email: survey.creator_email,
          name: `${survey.creator_first_name || ""} ${survey.creator_last_name || ""}`.trim(),
        },
      };

      // Remove creator fields from main object
      delete processedSurvey.creator_username;
      delete processedSurvey.creator_email;
      delete processedSurvey.creator_first_name;
      delete processedSurvey.creator_last_name;

      // Check if user has already responded
      const checkResponseQuery = `
        SELECT id FROM survey_responses 
        WHERE survey_id = ? AND user_id = ?
      `;

      mysqlcon.query(
        checkResponseQuery,
        [id, userId],
        (responseErr, responseResult) => {
          if (responseErr) {
            console.error("Database error:", responseErr);
          }

          const hasResponded = responseResult && responseResult.length > 0;

          res.status(200).json({
            success: true,
            data: {
              ...processedSurvey,
              user_has_responded: hasResponded,
              can_respond:
                !hasResponded &&
                survey.status === "published" &&
                survey.is_active === 1 &&
                new Date(survey.start_date) <= new Date() &&
                new Date(survey.end_date) >= new Date(),
            },
          });
        },
      );
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update survey
const updateSurvey = (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      target_classes,
      target_subjects,
      target_locations,
      target_roles,
      questions,
      start_date,
      end_date,
      created_for,
      rating,
      experience,
      status,
      is_active,
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    // Check if survey exists and user has permission
    const checkQuery = `SELECT * FROM surveys WHERE id = ?`;

    mysqlcon.query(checkQuery, [id], (checkErr, results) => {
      if (checkErr) {
        console.error("Database error:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: checkErr.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      const existingSurvey = results[0];

      // Check permission (only creator or admin can update)
      if (
        existingSurvey.created_by !== userId &&
        userRole !== "admin" &&
        userRole !== "superadmin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to update this survey",
        });
      }

      // Build update object
      const updateData = {};

      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined)
        updateData.description = description ? description.trim() : null;
      if (target_classes !== undefined)
        updateData.target_classes = JSON.stringify(target_classes);
      if (target_subjects !== undefined)
        updateData.target_subjects = JSON.stringify(target_subjects);
      if (target_locations !== undefined)
        updateData.target_locations = JSON.stringify(target_locations);
      if (target_roles !== undefined)
        updateData.target_roles = JSON.stringify(target_roles);
      if (questions !== undefined)
        updateData.questions = JSON.stringify(questions);
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;
      if (created_for !== undefined)
        updateData.created_for = JSON.stringify(created_for);
      if (rating !== undefined) updateData.rating = rating;
      if (experience !== undefined) updateData.experience = experience;
      if (status !== undefined) {
        // Validate status transition
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
        updateData.status = status;
      }
      if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

      updateData.updated_at = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const updateQuery = `UPDATE surveys SET ? WHERE id = ?`;

      mysqlcon.query(updateQuery, [updateData, id], (updateErr, result) => {
        if (updateErr) {
          console.error("Database error:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Failed to update survey",
            error: updateErr.message,
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Survey not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Survey updated successfully",
          data: {
            survey_id: id,
            updated_fields: Object.keys(updateData),
          },
        });
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete survey (soft delete by changing status to archived)
const deleteSurvey = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    // Check if survey exists
    const checkQuery = `SELECT * FROM surveys WHERE id = ?`;

    mysqlcon.query(checkQuery, [id], (checkErr, results) => {
      if (checkErr) {
        console.error("Database error:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: checkErr.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      const survey = results[0];

      // Check permission
      if (
        survey.created_by !== userId &&
        userRole !== "admin" &&
        userRole !== "superadmin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to delete this survey",
        });
      }

      // Check if there are responses
      const checkResponsesQuery = `SELECT COUNT(*) as response_count FROM survey_responses WHERE survey_id = ?`;

      mysqlcon.query(
        checkResponsesQuery,
        [id],
        (responseErr, responseResults) => {
          if (responseErr) {
            console.error("Database error:", responseErr);
            return res.status(500).json({
              success: false,
              message: "Database error",
              error: responseErr.message,
            });
          }

          const responseCount = responseResults[0]?.response_count || 0;

          if (
            responseCount > 0 &&
            userRole !== "admin" &&
            userRole !== "superadmin"
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Cannot delete survey with existing responses. Archive it instead.",
            });
          }

          // Soft delete by archiving (or hard delete if no responses and admin)
          let deleteQuery;
          let message;

          if (responseCount > 0 || userRole === "user") {
            // Archive the survey
            deleteQuery = `UPDATE surveys SET status = 'archived', is_active = 0 WHERE id = ?`;
            message = "Survey archived successfully";
          } else {
            // Hard delete (only for admin/superadmin with no responses)
            deleteQuery = `DELETE FROM surveys WHERE id = ?`;
            message = "Survey deleted permanently";
          }

          mysqlcon.query(deleteQuery, [id], (deleteErr, result) => {
            if (deleteErr) {
              console.error("Database error:", deleteErr);
              return res.status(500).json({
                success: false,
                message: "Failed to delete survey",
                error: deleteErr.message,
              });
            }

            res.status(200).json({
              success: true,
              message: message,
              data: {
                survey_id: id,
                responses_deleted: responseCount,
              },
            });
          });
        },
      );
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Publish survey
const publishSurvey = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    // Check if survey exists and is in draft status
    const checkQuery = `SELECT * FROM surveys WHERE id = ?`;

    mysqlcon.query(checkQuery, [id], (checkErr, results) => {
      if (checkErr) {
        console.error("Database error:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: checkErr.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      const survey = results[0];

      // Check permission
      if (
        survey.created_by !== userId &&
        userRole !== "admin" &&
        userRole !== "superadmin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to publish this survey",
        });
      }

      // Check if survey is in draft status
      if (survey.status !== "draft") {
        return res.status(400).json({
          success: false,
          message: `Cannot publish survey with status: ${survey.status}`,
        });
      }

      // Check if survey has questions
      const questions = safeParseJSON(survey.questions);
      if (!questions || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot publish survey without questions",
        });
      }

      // Update survey to published
      const updateQuery = `
        UPDATE surveys 
        SET status = 'published', is_active = 1, updated_at = UTC_TIMESTAMP() 
        WHERE id = ?
      `;

      mysqlcon.query(updateQuery, [id], (updateErr, result) => {
        if (updateErr) {
          console.error("Database error:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Failed to publish survey",
            error: updateErr.message,
          });
        }

        res.status(200).json({
          success: true,
          message: "Survey published successfully",
          data: {
            survey_id: id,
            status: "published",
            published_at: new Date().toISOString(),
          },
        });
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Close survey
const closeSurvey = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    // Check if survey exists
    const checkQuery = `SELECT * FROM surveys WHERE id = ?`;

    mysqlcon.query(checkQuery, [id], (checkErr, results) => {
      if (checkErr) {
        console.error("Database error:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: checkErr.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      const survey = results[0];

      // Check permission
      if (
        survey.created_by !== userId &&
        userRole !== "admin" &&
        userRole !== "superadmin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to close this survey",
        });
      }

      // Update survey to closed
      const updateQuery = `
        UPDATE surveys 
        SET status = 'closed', is_active = 0, updated_at = UTC_TIMESTAMP() 
        WHERE id = ?
      `;

      mysqlcon.query(updateQuery, [id], (updateErr, result) => {
        if (updateErr) {
          console.error("Database error:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Failed to close survey",
            error: updateErr.message,
          });
        }

        res.status(200).json({
          success: true,
          message: "Survey closed successfully",
          data: {
            survey_id: id,
            status: "closed",
            closed_at: new Date().toISOString(),
          },
        });
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ====================== SURVEY RESPONSES ======================

// Submit survey response (UPDATED VERSION)
const submitSurveyResponse = (req, res) => {
  try {
    const userId = req.user.id;
    const { survey_id, responses } = req.body;

    // Basic validation - accept both array and object format
    if (!survey_id || !responses) {
      return res.status(400).json({
        success: false,
        message: "Survey ID and responses are required",
      });
    }

    // Convert responses object to array if needed
    let responsesArray;
    if (Array.isArray(responses)) {
      responsesArray = responses;
    } else if (typeof responses === "object" && responses !== null) {
      // Convert object to array
      responsesArray = Object.entries(responses).map(([key, value]) => ({
        question_id: key,
        answer: value.response || value.value || value.answer || "",
        question_text: value.question || value.question_text || "",
        question_type: value.type || value.question_type || "text",
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: "Responses must be an array or object",
      });
    }

    // Validate each response
    for (const response of responsesArray) {
      if (!response.question_id || response.answer === undefined) {
        return res.status(400).json({
          success: false,
          message: "Each response must have question_id and answer",
        });
      }
    }

    // Convert responses array to JSON string
    const responsesJson = JSON.stringify(responsesArray);

    // Check if survey exists and is active
    const checkSurveyQuery = `
      SELECT * FROM surveys 
      WHERE id = ? 
        AND status = 'published'
        AND is_active = 1 
        AND start_date <= UTC_TIMESTAMP()
        AND end_date >= UTC_TIMESTAMP()
    `;

    mysqlcon.query(checkSurveyQuery, [survey_id], (checkErr, surveyResult) => {
      if (checkErr) {
        console.error("Database error:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: checkErr.message,
        });
      }

      if (surveyResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found, not published, or expired",
        });
      }

      const survey = surveyResult[0];

      // Check if user has already responded
      const checkResponseQuery = `
        SELECT id FROM survey_responses 
        WHERE survey_id = ? AND user_id = ?
      `;

      mysqlcon.query(
        checkResponseQuery,
        [survey_id, userId],
        (responseErr, existingResponse) => {
          if (responseErr) {
            console.error("Database error:", responseErr);
            return res.status(500).json({
              success: false,
              message: "Database error",
              error: responseErr.message,
            });
          }

          if (existingResponse.length > 0) {
            return res.status(400).json({
              success: false,
              message: "You have already submitted a response for this survey",
            });
          }

          // Submit response - Use parameterized query correctly
          const insertQuery = `
          INSERT INTO survey_responses (survey_id, user_id, responses)
          VALUES (?, ?, ?)
        `;

          console.log("Inserting response with:", {
            survey_id,
            userId,
            responsesJson,
          });

          mysqlcon.query(
            insertQuery,
            [survey_id, userId, responsesJson],
            (insertErr, result) => {
              if (insertErr) {
                console.error("Database error:", insertErr);
                return res.status(500).json({
                  success: false,
                  message: "Failed to submit response",
                  error: insertErr.message,
                });
              }

              // After successful submission, update survey status if needed
              // Check if survey should be auto-closed based on some criteria
              const checkRemainingSlotsQuery = `
            SELECT 
              (SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?) as response_count,
              s.created_for
            FROM surveys s
            WHERE s.id = ?
          `;

              mysqlcon.query(
                checkRemainingSlotsQuery,
                [survey_id, survey_id],
                (checkSlotsErr, slotsResult) => {
                  if (checkSlotsErr) {
                    console.error(
                      "Error checking survey slots:",
                      checkSlotsErr,
                    );
                    // Continue without auto-closing
                    return sendSuccessResponse(
                      res,
                      userId,
                      survey_id,
                      result.insertId,
                    );
                  }

                  const responseCount = slotsResult[0]?.response_count || 0;
                  let createdFor = [];

                  try {
                    if (slotsResult[0]?.created_for) {
                      if (typeof slotsResult[0].created_for === "string") {
                        createdFor = JSON.parse(slotsResult[0].created_for);
                      } else {
                        createdFor = slotsResult[0].created_for;
                      }
                    }
                  } catch (parseErr) {
                    console.error("Error parsing created_for:", parseErr);
                  }

                  const targetRespondents = createdFor.length;

                  // Auto-close survey if all target respondents have responded
                  if (
                    targetRespondents > 0 &&
                    responseCount >= targetRespondents
                  ) {
                    const closeQuery = `
                UPDATE surveys 
                SET status = 'closed', is_active = 0, updated_at = UTC_TIMESTAMP() 
                WHERE id = ?
              `;

                    mysqlcon.query(closeQuery, [survey_id], (closeErr) => {
                      if (closeErr) {
                        console.error("Error auto-closing survey:", closeErr);
                      }
                      sendSuccessResponse(
                        res,
                        userId,
                        survey_id,
                        result.insertId,
                        true,
                      );
                    });
                  } else {
                    sendSuccessResponse(
                      res,
                      userId,
                      survey_id,
                      result.insertId,
                      false,
                    );
                  }
                },
              );
            },
          );
        },
      );
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Helper function to send success response
const sendSuccessResponse = (
  res,
  userId,
  surveyId,
  responseId,
  autoClosed = false,
) => {
  // Calculate rewards
  calculateRewards(userId, surveyId, responseId, (rewardErr, rewardData) => {
    if (rewardErr) {
      console.error("Error calculating rewards:", rewardErr);
    }

    const responseData = {
      success: true,
      message: "Survey response submitted successfully",
      data: {
        response_id: responseId,
        submitted_at: new Date().toISOString(),
        rewards_awarded: rewardData ? true : false,
        survey_auto_closed: autoClosed,
      },
    };

    if (rewardData) {
      responseData.data.rewards = rewardData;
    }

    res.status(201).json(responseData);
  });
};

// Get survey responses (admin only) - Your existing function
const getSurveyResponses = (req, res) => {
  try {
    const { survey_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!survey_id || isNaN(survey_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid survey ID required" });
    }

    const surveyId = parseInt(survey_id);

    // Query with error handling for JSON parsing
    const query = `
      SELECT 
        sr.id as response_id,
        sr.survey_id,
        sr.responses,
        sr.submitted_at,
        u.username,
        u.email,
        u.first_name,
        u.last_name
      FROM survey_responses sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.survey_id = ?
      ORDER BY sr.submitted_at DESC
      LIMIT ? OFFSET ?
    `;

    mysqlcon.query(
      query,
      [surveyId, parseInt(limit), offset],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Database error",
            error: err.message,
          });
        }

        // Safely process responses - mysql2 might have already parsed JSON
        const processedResults = results.map((result) => {
          let parsedResponses = {};

          // Check if responses is already an object (parsed by mysql2)
          if (result.responses && typeof result.responses === "object") {
            parsedResponses = result.responses;
          }
          // If it's a string, try to parse it
          else if (typeof result.responses === "string") {
            try {
              parsedResponses = JSON.parse(result.responses);
            } catch (parseErr) {
              console.error(
                "JSON parse error for response ID:",
                result.response_id,
                parseErr,
              );
              parsedResponses = {};
            }
          }

          return {
            response_id: result.response_id,
            survey_id: result.survey_id,
            submitted_at: result.submitted_at,
            user: {
              username: result.username,
              email: result.email,
              name:
                `${result.first_name || ""} ${result.last_name || ""}`.trim() ||
                "User",
            },
            responses: parsedResponses,
          };
        });

        // Get total count
        mysqlcon.query(
          "SELECT COUNT(*) as total FROM survey_responses WHERE survey_id = ?",
          [surveyId],
          (countErr, countResult) => {
            if (countErr) {
              console.error("Count error:", countErr);
              return res.status(500).json({
                success: false,
                message: "Count error",
                error: countErr.message,
              });
            }

            const total = countResult[0]?.total || 0;

            res.status(200).json({
              success: true,
              data: {
                responses: processedResults,
                pagination: {
                  page: parseInt(page),
                  limit: parseInt(limit),
                  total,
                  total_pages: Math.ceil(total / limit),
                  has_more: page < Math.ceil(total / limit),
                },
              },
            });
          },
        );
      },
    );
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get user's response for a specific survey - Your existing function
const getUserSurveyResponse = (req, res) => {
  try {
    const { survey_id } = req.params;
    const userId = req.user.id;

    if (!survey_id || isNaN(survey_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    const query = `
      SELECT 
        sr.id as response_id,
        sr.survey_id,
        sr.responses,
        sr.submitted_at,
        s.title as survey_title,
        s.description as survey_description,
        s.questions as survey_questions
      FROM survey_responses sr
      LEFT JOIN surveys s ON sr.survey_id = s.id
      WHERE sr.survey_id = ? AND sr.user_id = ?
    `;

    mysqlcon.query(query, [parseInt(survey_id), userId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch response",
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey response not found",
        });
      }

      const result = results[0];

      const formattedResponse = {
        success: true,
        data: {
          response_id: result.response_id,
          survey_id: result.survey_id,
          survey_title: result.survey_title,
          submitted_at: result.submitted_at,
          responses: safeParseJSON(result.responses),
          survey: {
            title: result.survey_title,
            description: result.survey_description,
            questions: safeParseJSON(result.survey_questions),
          },
        },
      };

      res.status(200).json(formattedResponse);
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch survey response",
      error: error.message,
    });
  }
};

// Get user's all survey responses
const getUserAllResponses = (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        sr.id as response_id,
        sr.survey_id,
        sr.responses,
        sr.submitted_at,
        s.title as survey_title,
        s.description as survey_description,
        s.status as survey_status
      FROM survey_responses sr
      LEFT JOIN surveys s ON sr.survey_id = s.id
      WHERE sr.user_id = ?
      ORDER BY sr.submitted_at DESC
      LIMIT ? OFFSET ?
    `;

    mysqlcon.query(query, [userId, parseInt(limit), offset], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch responses",
          error: err.message,
        });
      }

      // Process responses
      const processedResults = results.map((result) => ({
        response_id: result.response_id,
        survey_id: result.survey_id,
        survey_title: result.survey_title,
        survey_status: result.survey_status,
        submitted_at: result.submitted_at,
        responses_count: safeParseJSON(result.responses)?.length || 0,
      }));

      // Get total count
      mysqlcon.query(
        "SELECT COUNT(*) as total FROM survey_responses WHERE user_id = ?",
        [userId],
        (countErr, countResult) => {
          if (countErr) {
            console.error("Count error:", countErr);
            return res.status(500).json({
              success: false,
              message: "Count error",
              error: countErr.message,
            });
          }

          const total = countResult[0]?.total || 0;

          res.status(200).json({
            success: true,
            data: {
              responses: processedResults,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit),
                has_more: page < Math.ceil(total / limit),
              },
            },
          });
        },
      );
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get survey statistics
const getSurveyStatistics = (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid survey ID is required",
      });
    }

    const statisticsQuery = `
      SELECT 
        s.id,
        s.title,
        s.status,
        s.start_date,
        s.end_date,
        s.created_at,
        (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as total_responses,
        (SELECT COUNT(DISTINCT user_id) FROM survey_responses WHERE survey_id = s.id) as unique_respondents,
        (SELECT COUNT(*) FROM users) as total_users,
        JSON_LENGTH(s.questions) as total_questions,
        s.rating,
        s.experience
      FROM surveys s
      WHERE s.id = ?
    `;

    mysqlcon.query(statisticsQuery, [id], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch statistics",
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      const stats = results[0];

      // Calculate response rate
      const responseRate =
        stats.total_users > 0
          ? ((stats.unique_respondents / stats.total_users) * 100).toFixed(2)
          : 0;

      // Calculate days remaining
      const endDate = new Date(stats.end_date);
      const now = new Date();
      const daysRemaining = Math.max(
        0,
        Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
      );

      const statistics = {
        survey_id: stats.id,
        survey_title: stats.title,
        status: stats.status,
        created_at: stats.created_at,
        start_date: stats.start_date,
        end_date: stats.end_date,
        days_remaining: daysRemaining,
        total_responses: stats.total_responses || 0,
        unique_respondents: stats.unique_respondents || 0,
        total_users: stats.total_users || 0,
        response_rate: `${responseRate}%`,
        total_questions: stats.total_questions || 0,
        average_rating: stats.rating || "N/A",
        required_experience: stats.experience || "N/A",
        is_active:
          stats.status === "published" && new Date(stats.end_date) >= now,
      };

      res.status(200).json({
        success: true,
        data: statistics,
      });
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get available surveys for user
const getAvailableSurveys = (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get user details to check against target filters
    const userQuery = `
      SELECT 
        u.class_id, 
        u.subject_id, 
        u.location_id, 
        u.role,
        GROUP_CONCAT(DISTINCT us.subject_id) as user_subjects
      FROM users u
      LEFT JOIN user_subjects us ON u.id = us.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `;

    mysqlcon.query(userQuery, [userId], (userErr, userResults) => {
      if (userErr || userResults.length === 0) {
        console.error("Error fetching user details:", userErr);
        return res.status(500).json({
          success: false,
          message: "Error fetching user information",
        });
      }

      const user = userResults[0];
      const userSubjects = user.user_subjects
        ? user.user_subjects.split(",").map((id) => parseInt(id))
        : [];

      // Get all published surveys
      const surveysQuery = `
        SELECT 
          s.id,
          s.title,
          s.description,
          s.target_classes,
          s.target_subjects,
          s.target_locations,
          s.target_roles,
          s.start_date,
          s.end_date,
          s.created_at,
          s.rating,
          s.experience,
          JSON_LENGTH(s.questions) as question_count,
          (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id AND user_id = ?) as user_responded
        FROM surveys s
        WHERE s.status = 'published' 
          AND s.is_active = 1
          AND s.start_date <= UTC_TIMESTAMP()
          AND s.end_date >= UTC_TIMESTAMP()
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;

      mysqlcon.query(
        surveysQuery,
        [userId, parseInt(limit), offset],
        (surveysErr, surveysResults) => {
          if (surveysErr) {
            console.error("Database error:", surveysErr);
            return res.status(500).json({
              success: false,
              message: "Failed to fetch surveys",
              error: surveysErr.message,
            });
          }

          // Filter surveys based on user eligibility
          const availableSurveys = surveysResults.filter((survey) => {
            // Check if user has already responded
            if (survey.user_responded > 0) return false;

            // Parse target filters
            const targetClasses = safeParseJSON(survey.target_classes) || [];
            const targetSubjects = safeParseJSON(survey.target_subjects) || [];
            const targetLocations =
              safeParseJSON(survey.target_locations) || [];
            const targetRoles = safeParseJSON(survey.target_roles) || [];

            // Check class eligibility
            if (targetClasses.length > 0 && user.class_id) {
              if (!targetClasses.includes(user.class_id)) return false;
            }

            // Check subject eligibility
            if (targetSubjects.length > 0) {
              const hasSubject = targetSubjects.some(
                (subjectId) =>
                  userSubjects.includes(subjectId) ||
                  (user.subject_id && user.subject_id === subjectId),
              );
              if (!hasSubject) return false;
            }

            // Check location eligibility
            if (targetLocations.length > 0 && user.location_id) {
              if (!targetLocations.includes(user.location_id)) return false;
            }

            // Check role eligibility
            if (targetRoles.length > 0 && user.role) {
              if (!targetRoles.includes(user.role)) return false;
            }

            // Check experience requirement
            if (survey.experience && req.user.experience) {
              if (req.user.experience < survey.experience) return false;
            }

            return true;
          });

          // Format response
          const formattedSurveys = availableSurveys.map((survey) => ({
            survey_id: survey.id,
            title: survey.title,
            description: survey.description,
            question_count: survey.question_count,
            start_date: survey.start_date,
            end_date: survey.end_date,
            days_remaining: Math.max(
              0,
              Math.ceil(
                (new Date(survey.end_date) - new Date()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
            rating_required: survey.rating || null,
            experience_required: survey.experience || null,
            created_at: survey.created_at,
          }));

          // Get total count
          const countQuery = surveysQuery.replace(
            "ORDER BY s.created_at DESC LIMIT ? OFFSET ?",
            "",
          );

          mysqlcon.query(countQuery, [userId], (countErr, countResult) => {
            if (countErr) {
              console.error("Count error:", countErr);
              return res.status(500).json({
                success: false,
                message: "Count error",
                error: countErr.message,
              });
            }

            const total = countResult.length;

            res.status(200).json({
              success: true,
              data: {
                surveys: formattedSurveys,
                total_available: formattedSurveys.length,
                pagination: {
                  page: parseInt(page),
                  limit: parseInt(limit),
                  total,
                  total_pages: Math.ceil(total / limit),
                  has_more: page < Math.ceil(total / limit),
                },
              },
            });
          });
        },
      );
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Export all functions
module.exports = {
  // Survey Management
  createSurvey,
  getAllSurveys,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  publishSurvey,
  closeSurvey,

  // Survey Responses
  submitSurveyResponse,
  getSurveyResponses,
  getUserSurveyResponse,
  getUserAllResponses,

  // Statistics & Analytics
  getSurveyStatistics,
  getAvailableSurveys,

  // Helper functions (optional export)
  validateAnswer,
  calculateRewards,
};
