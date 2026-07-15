const { mysqlcon } = require("../model/db");
const { getUserIDByEmail } = require("../service/utilities.service");

const postEmojiReaction = async (req, res) => {
    const { email, questionId, emoji, emojiUnified } = req.body;

    if (!email || !emoji || !questionId) {
        return res.status(400).json({ message: "Emoji reaction details are incomplete" });
    }

    try {
        let userId = await getUserIDByEmail(email);
        if (userId) {
            // Get user info for notification
            const [userInfo] = await mysqlcon.promise().query(
                `SELECT first_name, last_name, role FROM users WHERE id = ?`, 
                [userId]
            );
            
            const user_name = userInfo[0] ? 
                `${userInfo[0].first_name} ${userInfo[0].last_name}` : 
                'Anonymous User';
            const user_role = userInfo[0]?.role || 'user';
            
            // Check if user already reacted with an emoji to this question
            const [existingReaction] = await mysqlcon.promise().query(
                `SELECT id, emoji FROM emoji_reactions WHERE user_id = ? AND question_id = ? AND deletedAt IS NULL`, 
                [userId, questionId]
            );
            
            let result;
            
            if (existingReaction.length > 0) {
                // Update existing reaction
                const updateSql = `
                    UPDATE emoji_reactions 
                    SET emoji = ?, emoji_unified = ?, updatedAt = NOW() 
                    WHERE id = ?
                `;
                
                const [updateResult] = await mysqlcon.promise().query(
                    updateSql, 
                    [emoji, emojiUnified || null, existingReaction[0].id]
                );
                
                result = {
                    affectedRows: updateResult.affectedRows,
                    insertId: existingReaction[0].id,
                    action: 'updated'
                };
            } else {
                // Insert new reaction
                const insertSql = `
                    INSERT INTO emoji_reactions(user_id, question_id, emoji, emoji_unified) 
                    VALUES(?, ?, ?, ?)
                `;
                
                const [insertResult] = await mysqlcon.promise().query(
                    insertSql, 
                    [userId, questionId, emoji, emojiUnified || null]
                );
                
                result = {
                    affectedRows: insertResult.affectedRows,
                    insertId: insertResult.insertId,
                    action: 'created'
                };
            }
            
            const emojiId = result.insertId;
            
            // Get question info for notification
            const [questionInfo] = await mysqlcon.promise().query(
                `SELECT title, user_id FROM questions WHERE id = ?`, 
                [questionId]
            );
            
            const question_title = questionInfo[0]?.title || 'Question';
            const question_author_id = questionInfo[0]?.user_id;
            
            // Send notification only if not reacting to own question
            if (question_author_id && question_author_id !== userId) {
                try {
                    const notification_type = 9; // Emoji reaction type
                    const message = `${user_name} reacted with ${emoji} to your question: "${question_title}"`;
                    
                    // Check if notification already exists (avoid duplicates)
                    const [existingNotification] = await mysqlcon.promise().query(
                        `SELECT id FROM notifications 
                         WHERE sender_user_id = ? 
                         AND receiver_user_id = ? 
                         AND content_id = ? 
                         AND notification_type = ? 
                         AND is_read = 0`,
                        [userId, question_author_id, questionId, notification_type]
                    );
                    
                    if (existingNotification.length === 0) {
                        const notificationQuery = `
                            INSERT INTO notifications 
                            (sender_user_id, receiver_user_id, notification_type, content_id, message)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        await mysqlcon.promise().query(notificationQuery, [
                            userId, 
                            question_author_id, 
                            notification_type, 
                            questionId, 
                            message
                        ]);
                        
                        console.log(`✅ Emoji reaction notification sent to question author ${question_author_id}`);
                        
                        // Send real-time socket notification
                        if (req.app.get('io')) {
                            const io = req.app.get('io');
                            const broadcastData = {
                                id: `emoji-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                sender_id: userId,
                                sender_name: user_name,
                                type: notification_type,
                                content_id: questionId,
                                message: message,
                                emoji: emoji,
                                content_type: 'emoji_reaction',
                                is_broadcast: false,
                                is_read: 0,
                                receiver_id: question_author_id,
                                createdAt: new Date().toISOString(),
                                notification_type: notification_type,
                                question_title: question_title
                            };
                            
                            // Emit to specific user
                            io.to(`user_${question_author_id}`).emit("notification", broadcastData);
                            
                            console.log(`📢 Real-time emoji reaction notification sent to user ${question_author_id}`);
                        }
                    }
                } catch (notificationError) {
                    console.error("Error sending emoji notification:", notificationError);
                    // Don't fail the emoji reaction if notification fails
                }
            }
            
            return res.status(200).json({
                success: 1,
                message: `Emoji reaction ${result.action} successfully`,
                emojiReactionId: emojiId,
                emoji: emoji,
                action: result.action
            });
        } else {
            return res.status(409).json({ 
                message: "User doesn't exist. If already a registered user, please contact your admin immediately." 
            });
        }
    } catch (error) {
        console.error("Emoji reaction error:", error);
        return res.status(400).json({ 
            message: "Something went wrong",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getQuestionEmojis = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: "Question ID is required" });
    }

    try {
        // Get all emoji reactions for the question
        const query = `
            SELECT 
                er.id,
                er.user_id,
                er.emoji,
                er.emoji_unified,
                er.createdAt,
                u.first_name,
                u.last_name,
                u.profile_pic,
                u.username
            FROM emoji_reactions er
            JOIN users u ON er.user_id = u.id
            WHERE er.question_id = ? 
            AND er.deletedAt IS NULL
            ORDER BY er.createdAt DESC
        `;
        
        const [emojis] = await mysqlcon.promise().query(query, [id]);
        
        // Group emojis by emoji type for counts
        const emojiCounts = {};
        emojis.forEach(emoji => {
            if (!emojiCounts[emoji.emoji]) {
                emojiCounts[emoji.emoji] = 0;
            }
            emojiCounts[emoji.emoji]++;
        });
        
        console.log(`📊 Found ${emojis.length} emojis for question ${id}:`, emojiCounts);
        
        return res.status(200).json({
            success: 1,
            count: emojis.length,
            emojis: emojis,
            emojiCounts: emojiCounts
        });
    } catch (error) {
        console.error("Get question emojis error:", error);
        
        // Return empty data instead of error for frontend compatibility
        return res.status(200).json({
            success: 1,
            count: 0,
            emojis: [],
            emojiCounts: {}
        });
    }
};

const deleteEmojiReaction = async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;

    if (!id || !email) {
        return res.status(400).json({ 
            message: "Emoji reaction ID and email are required" 
        });
    }

    try {
        let userId = await getUserIDByEmail(email);
        if (!userId) {
            return res.status(409).json({ 
                message: "User doesn't exist" 
            });
        }
        
        // First check if the emoji reaction belongs to the user
        const [emojiReaction] = await mysqlcon.promise().query(
            `SELECT question_id, user_id FROM emoji_reactions WHERE id = ? AND deletedAt IS NULL`,
            [id]
        );
        
        if (emojiReaction.length === 0) {
            return res.status(404).json({ 
                message: "Emoji reaction not found or already deleted" 
            });
        }
        
        const reaction = emojiReaction[0];
        
        // Check if user owns this reaction
        if (reaction.user_id !== userId) {
            return res.status(403).json({ 
                message: "You can only delete your own emoji reactions" 
            });
        }
        
        // Soft delete the emoji reaction
        const deleteQuery = `
            UPDATE emoji_reactions 
            SET deletedAt = NOW() 
            WHERE id = ?
        `;
        
        const [result] = await mysqlcon.promise().query(deleteQuery, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: "Emoji reaction not found" 
            });
        }
        
        // Get question info for potential notification cleanup
        const [questionInfo] = await mysqlcon.promise().query(
            `SELECT title, user_id FROM questions WHERE id = ?`,
            [reaction.question_id]
        );
        
        const question_author_id = questionInfo[0]?.user_id;
        
        // Optionally: Delete the notification for this emoji reaction
        if (question_author_id) {
            try {
                const notification_type = 9; // Emoji reaction type
                await mysqlcon.promise().query(
                    `DELETE FROM notifications 
                     WHERE sender_user_id = ? 
                     AND receiver_user_id = ? 
                     AND content_id = ? 
                     AND notification_type = ?`,
                    [userId, question_author_id, reaction.question_id, notification_type]
                );
            } catch (notificationError) {
                console.error("Error cleaning up notification:", notificationError);
                // Continue even if notification cleanup fails
            }
        }
        
        return res.status(200).json({
            success: 1,
            message: "Emoji reaction removed successfully"
        });
    } catch (error) {
        console.error("Delete emoji reaction error:", error);
        return res.status(400).json({ 
            message: "Something went wrong",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function to check user's emoji reaction
const checkUserEmojiReaction = async (req, res) => {
    const { questionId, email } = req.query;

    if (!questionId || !email) {
        return res.status(400).json({ 
            message: "Question ID and email are required" 
        });
    }

    try {
        let userId = await getUserIDByEmail(email);
        if (!userId) {
            return res.status(409).json({ 
                message: "User doesn't exist" 
            });
        }
        
        const [userReaction] = await mysqlcon.promise().query(
            `SELECT id, emoji, emoji_unified, createdAt 
             FROM emoji_reactions 
             WHERE user_id = ? 
             AND question_id = ? 
             AND deletedAt IS NULL 
             LIMIT 1`,
            [userId, questionId]
        );
        
        return res.status(200).json({
            success: 1,
            hasReaction: userReaction.length > 0,
            reaction: userReaction[0] || null
        });
    } catch (error) {
        console.error("Check user emoji reaction error:", error);
        return res.status(200).json({ 
            success: 1,
            hasReaction: false,
            reaction: null
        });
    }
};

module.exports = {
    postEmojiReaction,
    getQuestionEmojis,
    deleteEmojiReaction,
    checkUserEmojiReaction
};