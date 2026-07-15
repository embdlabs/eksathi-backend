const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "emoji_reactions",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'questions',
          key: 'id'
        }
      },
      emoji: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          len: [1, 10]
        }
      },
      emoji_unified: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        allowNull: false,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "emoji_reactions",
      timestamps: true, // Will use createdAt, updatedAt automatically
      paranoid: true, // Enables soft deletes (uses deletedAt)
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        // {
        //   name: "unique_user_question_active",
        //   unique: true,
        //   using: "BTREE",
        //   fields: [{ name: "user_id" }, { name: "question_id" }],
        //   where: {
        //     deletedAt: null
        //   }
        // },
        // {
        //   name: "idx_emoji_reactions_question",
        //   using: "BTREE",
        //   fields: [{ name: "question_id" }, { name: "deletedAt" }],
        // },
        // {
        //   name: "idx_emoji_reactions_user",
        //   using: "BTREE",
        //   fields: [{ name: "user_id" }, { name: "deletedAt" }],
        // },
        // {
        //   name: "idx_emoji_reactions_emoji",
        //   using: "BTREE",
        //   fields: [{ name: "emoji" }],
        // },
        // {
        //   name: "idx_emoji_reactions_created",
        //   using: "BTREE",
        //   fields: [{ name: "createdAt" }],
        // },
      ],
    //   hooks: {
    //     beforeCreate: (emojiReaction) => {
    //       // Ensure emoji is trimmed
    //       if (emojiReaction.emoji) {
    //         emojiReaction.emoji = emojiReaction.emoji.trim();
    //       }
    //     },
    //     beforeUpdate: (emojiReaction) => {
    //       // Update timestamp
    //       emojiReaction.updatedAt = new Date();
          
    //       // Ensure emoji is trimmed on update
    //       if (emojiReaction.emoji && emojiReaction.changed('emoji')) {
    //         emojiReaction.emoji = emojiReaction.emoji.trim();
    //       }
    //     }
    //   }
    }
  );
};