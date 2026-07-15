const mysql = require('mysql');

// Create a connection to the institute database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'institute_db'
});

// Define the schema for the users table
const usersSchema = `
  CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
  )
`;

// Define the schema for the questions table
const questionsSchema = `
  CREATE TABLE questions (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    user_id INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

// Define the schema for the answers table
const answersSchema = `
  CREATE TABLE answers (
    id INT NOT NULL AUTO_INCREMENT,
    body TEXT NOT NULL,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  )
`;

// Connect to the database and create the tables
connection.connect((err) => {
  if (err) throw err;

  connection.query(usersSchema, (err, result) => {
    if (err) throw err;
    console.log('Users table created');
  });

  connection.query(questionsSchema, (err, result) => {
    if (err) throw err;
    console.log('Questions table created');
  });

  connection.query(answersSchema, (err, result) => {
    if (err) throw err;
    console.log('Answers table created');
  });

  connection.end();
});


// create a new connection to the MySQL server
const instanceConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password'
  });
  
  // create a new database for the institute
  const instituteName = 'ABC Institute'; // replace with actual institute name
  const dbName = instituteName.toLowerCase().replace(/\s/g, ''); // create database name with no spaces and all lowercase
  instanceConnection.query(`CREATE DATABASE ${dbName}`, (error, results) => {
    if (error) {
      console.error(`Error creating database for ${instituteName}: ${error}`);
      instanceConnection.destroy();
      return;
    }
    console.log(`Database for ${instituteName} created successfully`);
    instanceConnection.end();
  });
