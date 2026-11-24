const { mysqlcon } = require("../model/db");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    mysqlcon.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

(async () => {
  try {
    const tutors = await q("SELECT COUNT(*) AS c FROM tutors");
    const jobs = await q(
      "SELECT COUNT(*) AS c FROM job_descriptions WHERE status = 'active'"
    );
    const tutorSample = await q(
      "SELECT id, name, email, subject, city FROM tutors ORDER BY id DESC LIMIT 5"
    );
    const jobSample = await q(
      "SELECT id, job_title, institute_id, employment_type, status FROM job_descriptions ORDER BY id DESC LIMIT 5"
    );
    console.log(
      JSON.stringify(
        {
          tutorCount: tutors[0].c,
          activeJobs: jobs[0].c,
          tutorSample,
          jobSample,
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
