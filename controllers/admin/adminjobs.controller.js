const { mysqlcon } = require("../../model/db");

const getAllJobs = async (req, res) => {
  try {
    const { status, employment_type, search, page = 1, limit = 10 } = req.query;
    let query = `
      SELECT 
        j.*,
        i.name as institute_name,
        i.email as institute_email,
        i.mobile as institute_phone,
        jc.name as category_name,
        COUNT(DISTINCT ja.id) as applications_count
      FROM job_descriptions j
      LEFT JOIN institutes i ON j.institute_id = i.id
      LEFT JOIN job_categories jc ON j.job_category_id = jc.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Status filter
    if (status && status !== 'all') {
      query += ` AND j.status = ?`;
      params.push(status);
    }
    
    // Employment type filter
    if (employment_type && employment_type !== 'all') {
      query += ` AND JSON_CONTAINS(j.employment_type, ?, '$')`;
      params.push(JSON.stringify(employment_type));
    }
    
    // Search filter
    if (search) {
      query += ` AND (j.job_title LIKE ? OR j.job_location LIKE ? OR i.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ` GROUP BY j.id ORDER BY j.createdAt DESC`;
    
    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [jobs] = await mysqlcon.promise().query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT j.id) as total 
      FROM job_descriptions j
      LEFT JOIN institutes i ON j.institute_id = i.id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (status && status !== 'all') {
      countQuery += ` AND j.status = ?`;
      countParams.push(status);
    }
    
    if (employment_type && employment_type !== 'all') {
      countQuery += ` AND JSON_CONTAINS(j.employment_type, ?, '$')`;
      countParams.push(JSON.stringify(employment_type));
    }
    
    if (search) {
      countQuery += ` AND (j.job_title LIKE ? OR j.job_location LIKE ? OR i.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const [[{ total }]] = await mysqlcon.promise().query(countQuery, countParams);
    
    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

module.exports = {
  getAllJobs,
};
