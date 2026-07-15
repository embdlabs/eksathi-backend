var DataTypes = require("sequelize").DataTypes;
const sequelize = require("../model/connection");
var _address = require("./address");
var _admins = require("./admins");
var _answers = require("./answers");
var _answers_trash = require("./answers_trash");
var _api_credentials = require("./api_credentials");
var _award = require("./award");
var _institute_profiles = require("./institute_profiles");
var _institute_departments = require("./institute_departments");
var _institute_teachers = require("./institute_teachers");
var _institute_students = require("./institute_students");
var _categories = require("./categories");
var _certifications = require("./certifications");
var _comments = require("./comments");
var _comments_trash = require("./comments_trash");
var _connections = require("./connections");
var _contacts = require("./contacts");
var _educations = require("./educations");
var _institutes = require("./institutes");
var _job_categories = require("./job_categories");
var _job_descriptions = require("./job_descriptions");
var _job_applications = require("./job_applications");
var _messages = require('./messages');
var _notifications = require("./notifications");
var _institute_otp = require("./institute_otp");
var _otp = require("./otp");
var _privacy_settings = require("./privacy_settings");
var _questions = require("./questions");
var _questions_trash = require("./questions_trash");
var _ratings = require("./ratings");
var _replies = require("./replies");
var _replies_trash = require("./replies_trash");
var _reports = require("./reports");
var _research = require("./research");
var _skills = require("./skills");
var _tags = require("./tags");
var _topics = require("./topics");
var _user_activity = require("./user_activity");
var _user_profiles = require("./user_profiles");
var _users = require("./users");
var _votes = require("./votes");
var _work_experience = require("./work_experience");
// var _university = require("./university");
var _board = require("./board");
var _locations = require("./locations");
var _events = require("./events");
var _event_programs = require("./event_programs")
var _event_registerUser = require("./event_registerUser")
var _subject = require("./subject")
var _teacher = require("./teachers")
var _tutors = require("./tutors")
var _feedback = require("./feedback")
var _enrollments = require("./enrollments")
var _emogi = require("./emoji")
var _chatSession = require("./chat_session")
var _chatMessage = require("./chat_message")
var _survey = require("./survey")
var _survey_response = require("./survey_response")


function initModels(sequelize) {
  var survey = _survey(sequelize,DataTypes)
  var surveyResponse = _survey_response(sequelize,DataTypes)
  var chatMessage = _chatMessage(sequelize, DataTypes)
  var chatSessions = _chatSession(sequelize, DataTypes)
  var emoji_reactions = _emogi(sequelize, DataTypes);
  var enrollments = _enrollments(sequelize,DataTypes)
  var feedback = _feedback(sequelize,DataTypes)
  var tutors = _tutors(sequelize,DataTypes)
  var teacher = _teacher(sequelize,DataTypes)
  var subject = _subject(sequelize, DataTypes);
  var address = _address(sequelize, DataTypes);
  var admins = _admins(sequelize, DataTypes);
  var answers = _answers(sequelize, DataTypes);
  var answers_trash = _answers_trash(sequelize, DataTypes);
  var api_credentials = _api_credentials(sequelize, DataTypes);
  var award = _award(sequelize, DataTypes);
  var institute_profiles = _institute_profiles(sequelize, DataTypes);
  var institute_departments = _institute_departments(sequelize, DataTypes);
  var institute_teachers = _institute_teachers(sequelize, DataTypes);
  var institute_students = _institute_students(sequelize, DataTypes);
  var categories = _categories(sequelize, DataTypes);
  var certifications = _certifications(sequelize, DataTypes);
  var comments = _comments(sequelize, DataTypes);
  var comments_trash = _comments_trash(sequelize, DataTypes);
  var connections = _connections(sequelize, DataTypes);
  var contacts = _contacts(sequelize, DataTypes);
  var educations = _educations(sequelize, DataTypes);
  var institutes = _institutes(sequelize, DataTypes);
  var job_categories = _job_categories(sequelize, DataTypes);
  var job_descriptions = _job_descriptions(sequelize, DataTypes);
  var job_applications = _job_applications(sequelize, DataTypes);
  var messages = _messages(sequelize, DataTypes);
  var notifications = _notifications(sequelize, DataTypes);
  var institute_otp = _institute_otp(sequelize, DataTypes);
  var otp = _otp(sequelize, DataTypes);
  var privacy_settings = _privacy_settings(sequelize, DataTypes);
  var questions = _questions(sequelize, DataTypes);
  var questions_trash = _questions_trash(sequelize, DataTypes);
  var ratings = _ratings(sequelize, DataTypes);
  var replies = _replies(sequelize, DataTypes);
  var replies_trash = _replies_trash(sequelize, DataTypes);
  var reports = _reports(sequelize, DataTypes);
  var research = _research(sequelize, DataTypes);
  var skills = _skills(sequelize, DataTypes);
  var tags = _tags(sequelize, DataTypes);
  var topics = _topics(sequelize, DataTypes);
  var user_activity = _user_activity(sequelize, DataTypes);
  var user_profiles = _user_profiles(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var votes = _votes(sequelize, DataTypes);
  var work_experience = _work_experience(sequelize, DataTypes);
  // var university = _university(sequelize, DataTypes);
  var board = _board(sequelize, DataTypes);
  var locations = _locations(sequelize, DataTypes);
  var events = _events(sequelize, DataTypes);
  var event_programs = _event_programs(sequelize, DataTypes);
  var event_registerUser = _event_registerUser(sequelize, DataTypes);

  comments.belongsTo(answers, {
    as: "answer",
    foreignKey: "answer_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  answers.hasMany(comments, { as: "comments", foreignKey: "answer_id" });
  comments_trash.belongsTo(answers, { as: "answer", foreignKey: "answer_id" });
  answers.hasMany(comments_trash, {
    as: "comments_trashes",
    foreignKey: "answer_id",
  });
  votes.belongsTo(answers, {
    as: "answer",
    foreignKey: "answer_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  answers.hasMany(votes, { as: "votes", foreignKey: "answer_id" });
  questions.belongsTo(categories, {
    as: "category",
    foreignKey: "category_id",
  });
  categories.hasMany(questions, { as: "questions", foreignKey: "category_id" });
  questions_trash.belongsTo(categories, {
    as: "category",
    foreignKey: "category_id",
  });
  categories.hasMany(questions_trash, {
    as: "questions_trashes",
    foreignKey: "category_id",
  });
  tags.belongsTo(categories, { as: "category", foreignKey: "categoryId" });
  categories.hasMany(tags, { as: "tags", foreignKey: "categoryId" });
  replies.belongsTo(comments, {
    as: "comment",
    foreignKey: "comment_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  comments.hasMany(replies, { as: "replies", foreignKey: "comment_id" });
  replies_trash.belongsTo(comments, {
    as: "comment",
    foreignKey: "comment_id",
  });
  comments.hasMany(replies_trash, {
    as: "replies_trashes",
    foreignKey: "comment_id",
  });
  api_credentials.belongsTo(institutes, {
    as: "institute",
    foreignKey: "institute_id",
  });
  institutes.hasMany(api_credentials, {
    as: "api_credentials",
    foreignKey: "institute_id",
  });
  institute_profiles.belongsTo(institutes, {
    as: "institutes",
    foreignKey: "institute_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  institutes.hasMany(institute_profiles, {
    as: "institute_profiles",
    foreignKey: "institute_id",
  });
  institute_departments.belongsTo(institutes, {
    as: "institute",
    foreignKey: "institute_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  institutes.hasMany(institute_departments, {
    as: "institute_departments",
    foreignKey: "institute_id",
  });
  institute_teachers.belongsTo(institutes, {
    as: "institute",
    foreignKey: "institute_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  institutes.hasMany(institute_teachers, {
    as: "institute_teachers",
    foreignKey: "institute_id",
  });
  institute_teachers.belongsTo(institute_departments, {
    as: "institute_departments",
    foreignKey: "department_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  institute_departments.hasMany(institute_teachers, {
    as: "institute_teachers",
    foreignKey: "department_id",
  });
  institute_students.belongsTo(institutes, {
    as: "institute",
    foreignKey: "institute_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  institutes.hasMany(institute_students, {
    as: "institute_students",
    foreignKey: "institute_id",
  });
  institute_students.belongsTo(institute_departments, {
    as: "institute_departments",
    foreignKey: "department_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  institute_departments.hasMany(institute_students, {
    as: "institute_students",
    foreignKey: "department_id",
  });
  job_descriptions.belongsTo(job_categories, {
    as: "job_category",
    foreignKey: "job_category_id",
  });
  job_categories.hasMany(job_descriptions, {
    as: "job_descriptions",
    foreignKey: "job_category_id",
  });
  answers.belongsTo(questions, { as: "question", foreignKey: "question_id" });
  questions.hasMany(answers, { as: "answers", foreignKey: "question_id" });
  answers_trash.belongsTo(questions, {
    as: "question",
    foreignKey: "question_id",
  });
  questions.hasMany(answers_trash, {
    as: "answers_trashes",
    foreignKey: "question_id",
  });
  comments.belongsTo(questions, { as: "question", foreignKey: "question_id" });
  questions.hasMany(comments, { as: "comments", foreignKey: "question_id" });
  comments_trash.belongsTo(questions, {
    as: "question",
    foreignKey: "question_id",
  });
  questions.hasMany(comments_trash, {
    as: "comments_trashes",
    foreignKey: "question_id",
  });
  votes.belongsTo(questions, { as: "question", foreignKey: "question_id" });
  questions.hasMany(votes, { as: "votes", foreignKey: "question_id" });
  address.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(address, { as: "addresses", foreignKey: "user_id" });
  answers.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(answers, { as: "answers", foreignKey: "user_id" });
  answers_trash.belongsTo(users, { as: "user", foreignKey: "user_id" });
  users.hasMany(answers_trash, {
    as: "answers_trashes",
    foreignKey: "user_id",
  });
  certifications.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(certifications, {
    as: "certifications",
    foreignKey: "user_id",
  });
  award.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(award, { as: "award", foreignKey: "user_id" });
  research.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(research, { as: "research", foreignKey: "user_id" });
  comments.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(comments, { as: "comments", foreignKey: "user_id" });
  comments_trash.belongsTo(users, { as: "user", foreignKey: "user_id" });
  users.hasMany(comments_trash, {
    as: "comments_trashes",
    foreignKey: "user_id",
  });
  connections.belongsTo(users, { as: "sender", foreignKey: "sender_id" });
  users.hasMany(connections, {
    as: "connections",
    foreignKey: "sender_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  connections.belongsTo(users, {
    as: "receiver",
    foreignKey: "receiver_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(connections, {
    as: "receiver_connections",
    foreignKey: "receiver_id",
  });
  educations.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(educations, { as: "educations", foreignKey: "user_id" });
  job_descriptions.belongsTo(institutes, {
    as: "institutes",
    foreignKey: "institute_id",
    onUpdate: "CASCADE",
  });
  institutes.hasMany(job_descriptions, {
    as: "job_descriptions",
    foreignKey: "institute_id",
  });
  notifications.belongsTo(users, {
    as: "receiver",
    foreignKey: "receiver_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(notifications, {
    as: "notifications",
    foreignKey: "receiver_id",
  });
  institute_otp.belongsTo(institutes, {
    as: "institute",
    foreignKey: "institute_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  institutes.hasMany(institute_otp, { as: "_institute_otps", foreignKey: "institute_id" });
  privacy_settings.belongsTo(institutes, {
    as: "institute",
    foreignKey: "institute_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  otp.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(otp, { as: "otps", foreignKey: "user_id" });
  privacy_settings.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(privacy_settings, {
    as: "privacy_settings",
    foreignKey: "user_id",
  });
  questions.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(questions, { as: "questions", foreignKey: "user_id" });
  questions_trash.belongsTo(users, { as: "user", foreignKey: "user_id" });
  users.hasMany(questions_trash, {
    as: "questions_trashes",
    foreignKey: "user_id",
  });
  ratings.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(ratings, { as: "ratings", foreignKey: "user_id" });
  ratings.belongsTo(users, { as: "rated_user", foreignKey: "rated_user_id" });
  users.hasMany(ratings, {
    as: "rated_user_ratings",
    foreignKey: "rated_user_id",
  });
  reports.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(reports, { as: "reports", foreignKey: "user_id" });
  skills.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(skills, { as: "skills", foreignKey: "user_id" });
  user_activity.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(user_activity, {
    as: "user_activities",
    foreignKey: "user_id",
  });
  user_profiles.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(user_profiles, { as: "user_profiles", foreignKey: "user_id" });
  votes.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(votes, { as: "votes", foreignKey: "user_id" });
  work_experience.belongsTo(users, {
    as: "user",
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  users.hasMany(work_experience, {
    as: "work_experiences",
    foreignKey: "user_id",
  });
  // institute_profiles.belongsTo(university, {
  //   as: "university",
  //   foreignKey: "affiliate_id",
  // });
  // university.hasMany(institute_profiles, {
  //   as: "instituteProfiles", // Change alias to avoid name conflict
  //   foreignKey: "affiliate_id",
  // });

  job_applications.belongsTo(job_descriptions, {
    as: "job_descriptions",
    foreignKey: "job_id",
  });
  job_descriptions.hasMany(job_applications, {
    as: "job_descriptions",
    foreignKey: "job_id",
  });
  job_applications.belongsTo(users, { as: "users", foreignKey: "user_id" });
  users.hasMany(job_applications, { as: "users", foreignKey: "user_id" });

  // institute_profiles.belongsTo(users, { as: 'user',  foreignKey: 'eksathi_id', onDelete: "CASCADE",
  // onUpdate: "CASCADE" });
  // users.hasOne(institute_profiles, { foreignKey: 'eksathi_id', as: 'institute_profile' });

  // institutes.belongsTo(university, {
  //   as: "university", foreignKey: {
  //     name: 'affiliate_id', // This should match the column name in the institutes table
  //     allowNull: false,
  //   }, onDelete: "CASCADE",
  //   onUpdate: "CASCADE",
  // });
  // university.hasMany(institutes, { as: "institutes", foreignKey: "affiliate_id" });

  messages.belongsTo(users, { as: 'sender', foreignKey: 'sender_user_id' });
  users.hasMany(messages, { as: 'sent_messages', foreignKey: 'sender_user_id' });

  messages.belongsTo(users, { as: 'receiver', foreignKey: 'receiver_user_id' });
  users.hasMany(messages, { as: 'received_messages', foreignKey: 'receiver_user_id' });

  messages.belongsTo(institutes, { as: 'senderInstitute', foreignKey: 'sender_institute_id' });
  institutes.hasMany(messages, { as: 'sent_messages_institutes', foreignKey: 'sender_institute_id' });

  messages.belongsTo(institutes, { as: 'receiverInstitute', foreignKey: 'receiver_institute_id' });
  institutes.hasMany(messages, { as: 'received_messages_institutes', foreignKey: 'receiver_institute_id' });

  // Sender and Receiver are users
  notifications.belongsTo(users, {
    as: 'sender_user',
    foreignKey: 'sender_user_id'
  });
  users.hasMany(notifications, {
    as: 'sent_notifications_user',
    foreignKey: 'sender_user_id'
  });

  notifications.belongsTo(users, {
    as: 'receiver_user',
    foreignKey: 'receiver_user_id'
  });
  users.hasMany(notifications, {
    as: 'received_notifications_user',
    foreignKey: 'receiver_user_id'
  });

  // Sender and Receiver are institutes
  notifications.belongsTo(institutes, {
    as: 'sender_institute',
    foreignKey: 'sender_institute_id'
  });
  institutes.hasMany(notifications, {
    as: 'sent_notifications_institute',
    foreignKey: 'sender_institute_id'
  });

  notifications.belongsTo(institutes, {
    as: 'receiver_institute',
    foreignKey: 'receiver_institute_id'
  });
  institutes.hasMany(notifications, {
    as: 'received_notifications_institute',
    foreignKey: 'receiver_institute_id'
  });

  // Define association: an institute has many events
  institutes.hasMany(events, {
    foreignKey: "institute_id",
    as: "events",
    onDelete: "CASCADE", // Optional: specify what happens on delete
  });

  // Define the inverse association: each event belongs to an institute
  events.belongsTo(institutes, {
    foreignKey: "institute_id",
    as: "institute",
  });

  // One-to-many: Each event can have many programs
  events.hasMany(event_programs, {
    foreignKey: "eventId", // Foreign key in event_programs table
    as: "programs", // Alias to access programs from an event
    onDelete: "CASCADE", // Delete associated programs when an event is deleted
  });

  // Inverse association: Each program belongs to one event
  event_programs.belongsTo(events, {
    foreignKey: "eventId", // Foreign key in event_programs table
    as: "event", // Alias to access the event from a program
  });

  // Associations for event_registerUser
  event_registerUser.belongsTo(users, {
    foreignKey: 'user_id',
    as: 'user', // Alias to access the user from event_registerUser
    onDelete: 'CASCADE',
  });

  users.hasMany(event_registerUser, {
    foreignKey: 'user_id',
    as: 'registrations', // Alias to access all registrations for a user
  });

  event_registerUser.belongsTo(events, {
    foreignKey: 'eventId',
    as: 'event', // Alias to access the event from event_registerUser
    onDelete: 'CASCADE',
  });

  events.hasMany(event_registerUser, {
    foreignKey: 'eventId',
    as: 'registrations', // Alias to access all registrations for an event
  });

  return {
    teacher,
    subject,
    address,
    admins,
    answers,
    answers_trash,
    api_credentials,
    award,
    institute_departments,
    institute_profiles,
    institute_teachers,
    institute_students,
    categories,
    certifications,
    comments,
    comments_trash,
    connections,
    contacts,
    educations,
    institutes,
    job_categories,
    job_descriptions,
    job_applications,
    messages,
    notifications,
    institute_otp,
    otp,
    privacy_settings,
    questions,
    questions_trash,
    ratings,
    replies,
    replies_trash,
    reports,
    research,
    skills,
    tags,
    topics,
    user_activity,
    user_profiles,
    users,
    votes,
    work_experience,
    board,
    notifications,
    // university,
    locations,
    events,
    event_programs,
    event_registerUser,
  };
}
const DBMODELS = initModels(sequelize);
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
module.exports.DBMODELS = DBMODELS;
