const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('user_profiles', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    middle_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('Male','Female','Other'),
      allowNull: true
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    profession: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    designation: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    institute: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    workinformation: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    profile_pic: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    cover_photo_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    location: {
      type: DataTypes.JSON,
    },
    rating: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    website_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linkedin_link: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    twitter_link: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    github_link: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    facebook_link: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    instagram_link: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    youtube_link: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    vimeo_link: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    work_experience: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    education: {
      type: DataTypes.ENUM('Below 8th Standard','8th Standard','9th Standard','High School','Intermediate','Diploma','Polytechnic','Graduation','Post Graduation','Doctorate'),
      allowNull: true
    },
    certifications: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    classLevel: {
      type: DataTypes.STRING,  // To store a single value like "1-5", "6-8"
      allowNull: true
    },
    school: {
      type: DataTypes.STRING(100),  // To store the name of the school
      allowNull: true
    },
    board: {
      type: DataTypes.STRING(100),  // To store the name of the board
      allowNull: true
    },
    selectedSubjects: {
      type: DataTypes.JSON,  // To store an array of strings as JSON
      allowNull: true,
      defaultValue: [],
    },
    selectedExpertise: {
      type: DataTypes.JSON,  // To store an array of strings as JSON
      allowNull: true,
      defaultValue: [],
    },
    teachingClasses: {
      type: DataTypes.JSON,  // To store an array of strings as JSON
      allowNull: true,
      defaultValue: [],
    },
    teachAllSubjects: {
      type: DataTypes.BOOLEAN,  // Boolean flag for teaching all subjects
      allowNull: false,
      defaultValue: false,
    },
   
  }, {
    sequelize,
    tableName: 'user_profiles',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "user_id",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
