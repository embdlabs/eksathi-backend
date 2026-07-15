const { DataTypes } = require("sequelize");
const { mysqlcon, sequelize } = require("../model/db");
const { DBMODELS } = require("../models/init-models");
const users = require("../models/users")(sequelize, DataTypes);
const messages = require("../models/messages")
const fs = require('fs');
const path = require('path');

const saveMsg = async (msg) => {
    console.log("Received message: ", msg);

    // Prepare message content
    const messageContent = msg.message?.title ? `${msg.message.title}\n${msg.message.description}` : msg.message;

    // Define variables for message data
    let senderField = null;
    let receiverField = null;

    // Check sender role and adjust the sender field accordingly
    if (msg.sender_role === 'student' || msg.sender_role === 'teacher' || msg.sender_role === 'professional') {
        senderField = 'sender_user_id';
    } else {
        senderField = 'sender_institute_id';
    }

    // Check receiver role and adjust the receiver field accordingly
    if (msg.receiver_role === 'institute') {
        receiverField = 'receiver_institute_id';
    } else {
        receiverField = 'receiver_user_id';
    }

    // Get sender ID - use sender_user_id or sender_institute_id if available, otherwise use sender
    let senderId = msg.sender;
    if (msg.sender_user_id !== undefined && msg.sender_user_id !== null) {
        senderId = msg.sender_user_id;
    } else if (msg.sender_institute_id !== undefined && msg.sender_institute_id !== null) {
        senderId = msg.sender_institute_id;
    }
    
    // Ensure senderId is a number, not an object
    if (typeof senderId === 'object' && senderId !== null) {
        console.error("❌ Invalid sender ID - received object instead of number:", senderId);
        throw new Error("Invalid sender ID format");
    }
    
    // Get receiver ID - use receiver_user_id or receiver_institute_id if available
    let receiverId = msg.receiver;
    if (msg.receiver_user_id !== undefined && msg.receiver_user_id !== null) {
        receiverId = msg.receiver_user_id;
    } else if (msg.receiver_institute_id !== undefined && msg.receiver_institute_id !== null) {
        receiverId = msg.receiver_institute_id;
    }
    
    // Ensure receiverId is a number, not an object
    if (typeof receiverId === 'object' && receiverId !== null) {
        console.error("❌ Invalid receiver ID - received object instead of number:", receiverId);
        throw new Error("Invalid receiver ID format");
    }

    // Create message data with dynamic sender and receiver fields
    const messageData = {
        [senderField]: senderId,
        [receiverField]: receiverId,
        message: messageContent,
        room_id: msg.room,
        time_to_send: new Date(),
    };
    console.log("Message : ",messageData)
    try {
        // Create a new message using Sequelize
        const savedMessage = await DBMODELS.messages.create(messageData);
        console.log("Saved message : ", savedMessage);
        
        // Format message to include all fields client expects
        const formattedMessage = {
            id: savedMessage.id,
            message: savedMessage.message || '',
            msg: savedMessage.message || '', // Also include msg field for compatibility
            room: msg.room || savedMessage.room_id, // Ensure room field is present
            room_id: savedMessage.room_id || msg.room, // Also include room_id
            sender: senderId, // Use the extracted senderId, not msg.sender (which might be an object)
            receiver: receiverId, // Use the extracted receiverId
            sender_user_id: msg.sender_role !== 'institute' ? senderId : null,
            sender_institute_id: msg.sender_role === 'institute' ? senderId : null,
            receiver_user_id: msg.receiver_role !== 'institute' ? receiverId : null,
            receiver_institute_id: msg.receiver_role === 'institute' ? receiverId : null,
            sender_role: msg.sender_role,
            receiver_role: msg.receiver_role,
            time_to_send: savedMessage.time_to_send,
            createdAt: savedMessage.createdAt,
            updatedAt: savedMessage.updatedAt
        };
        
        return formattedMessage;
    } catch (error) {
        console.error('Error saving message:', error);
        throw new Error("Server Error");
    }
};



const getMsg = async (roomId) => {
    console.log(`Fetching messages for roomId: ${roomId}`);
    try {
        if (!roomId) {
            throw new Error('Invalid roomId');
        }

        const roomIdStr = String(roomId);
        
        // Fetch messages with the given roomId
        const messages = await DBMODELS.messages.findAll({
            where: {
                room_id: roomIdStr
            },
            include: [
                {
                    model: DBMODELS.users,
                    as: 'sender',
                    attributes: [
                        'id', 'username', 'email', 'role', 'display_name', 
                        'first_name', 'last_name', 'location', 'phone', 'avatar_url'
                    ],
                    required: false
                }
            ],
            order: [['createdAt', 'ASC']] // Order by creation time
        });

        // Format messages to ensure consistent structure
        const formattedMessages = messages.map(msg => {
            const msgData = msg.toJSON ? msg.toJSON() : msg;
            return {
                id: msgData.id,
                message: msgData.message || '',
                msg: msgData.message || '', // Also include msg field for compatibility
                room: msgData.room_id,
                room_id: msgData.room_id,
                sender_user_id: msgData.sender_user_id,
                sender_institute_id: msgData.sender_institute_id,
                receiver_user_id: msgData.receiver_user_id,
                receiver_institute_id: msgData.receiver_institute_id,
                time_to_send: msgData.time_to_send,
                createdAt: msgData.createdAt,
                updatedAt: msgData.updatedAt,
                sender: msgData.sender || null
            };
        });

        console.log(`✅ Found ${formattedMessages.length} messages for roomId ${roomIdStr}`);
        return formattedMessages;
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }
};

const getMessagesByUserId = async (req, res) => {
    const userId = req.params.userId;

    try {
        const results = await sequelize.query(`
            SELECT *
            FROM messages
            WHERE sender_user_id = :userId OR receiver_user_id = :userId;
        `, {
            replacements: { userId: userId },
            type: sequelize.QueryTypes.SELECT
        });

        // Check if results are returned
        if (results.length === 0) {
            return res.status(404).json({ message: "No messages found." });
        }

        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


module.exports = { saveMsg, getMsg, getMessagesByUserId }