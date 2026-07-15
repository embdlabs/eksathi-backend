// Define the schema for the users table
const usersSchema = (db) => {
  return `
    CREATE TABLE ${db}.users (
      id INT NOT NULL AUTO_INCREMENT,
      username VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      profile_pic VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      institute_name VARCHAR(255) NOT NULL,
      delegate_country VARCHAR(255),
      delegate_designation VARCHAR(255),
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE (email),
      UNIQUE (username)
    )
  `
};

// Define the schema for the questions table
const questionsSchema = (db) => {
  return `
    CREATE TABLE ${db}.questions (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    slug TEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`
};

// Define the schema for the answers table
const answersSchema = (db) => {
  return `
      CREATE TABLE ${db}.answers (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(255),
      body TEXT NOT NULL,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `
};

const commentsSchema = (db) => {
  return `
    CREATE TABLE ${db}.comments (
    id INT NOT NULL AUTO_INCREMENT,
    question_id INT,
    answer_id INT,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (answer_id) REFERENCES answers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  `
}

const votesSchema = (db) => {
  return `
    CREATE TABLE ${db}.votes (
    id INT NOT NULL AUTO_INCREMENT,
    question_id INT,
    answer_id INT,
    user_id INT NOT NULL,
    vote_type ENUM('upvote', 'downvote', 'novote') NOT NULL DEFAULT 'novote',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (answer_id) REFERENCES answers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  `
}

const replySchema = (db) => {
  return `
  CREATE TABLE ${db}.replies (
    id INT NOT NULL AUTO_INCREMENT,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    reply TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (comment_id) REFERENCES comments(id)
  );
  `
}

const categorySchema = (db) => {
  return `
  CREATE TABLE ${db}.categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  `
}

const reportSchema = (db) => {
  return `
    CREATE TABLE IF NOT EXISTS ${db}.reports (
      id INT(11) NOT NULL AUTO_INCREMENT,
      user_id INT(11) NOT NULL,
      item_type ENUM('question', 'answer', 'comment', 'reply') NOT NULL,
      item_id INT(11) NOT NULL,
      reason ENUM('spam', 'offensive', 'inappropriate', 'duplicate', 'other') NOT NULL,
      comment TEXT,
      action ENUM('delete', 'none') NOT NULL DEFAULT 'none',
      status ENUM('pending', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      INDEX (item_type, item_id)
    );
  `
}

module.exports = {
  usersSchema,
  answersSchema,
  questionsSchema,
  commentsSchema,
  votesSchema,
  replySchema,
  categorySchema,
  reportSchema
}