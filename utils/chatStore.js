const fs = require('fs');
const path = require('path');

// Function to ensure the directory exists
function ensureDirectoryExistence(filePath) {
    const dirName = path.dirname(filePath);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }
}
function appendMessageToRoomFile(roomId, message) {
    const filePath = path.join('chat_history', `${roomId}.json`); // storage directory with .json extension

    // Read the existing data from the file
    fs.readFile(filePath, 'utf8', (err, data) => {
        let messages = [];
        
        if (err) {
            if (err.code === 'ENOENT') {
                // If the file does not exist, start with an empty array
                messages = [];
            } else {
                console.error('Error reading room file:', err);
                return;
            }
        } else {
            try {
                // Parse existing data as JSON
                messages = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing room file JSON:', parseError);
                return;
            }
        }

        // Add the new message to the array
        messages.push(message);

        // Write the updated array back to the file
        fs.writeFile(filePath, JSON.stringify(messages, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error writing to room file:', writeErr);
            } else {
                console.log('Message appended to room file successfully.');
            }
        });
    });
}
function updateMessageReadStatus(messageId, roomId) {
    const filePath = path.join('chat_history', `${roomId}.json`); // storage directory

    console.log("Message Id:", messageId);
    console.log("Room Id:", roomId);

    return new Promise((resolve, reject) => {
        // Use readFileSync and writeFileSync for synchronous operations
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            let messages;

            try {
                // Ensure the content is valid JSON
                messages = JSON.parse(data); // Parse the entire file content as a JSON array
            } catch (parseError) {
                console.error('Error parsing chat data:', parseError);
                return reject(parseError);
            }

            const messageIndex = messages.findIndex(msg => msg.id === parseInt(messageId));
            if (messageIndex !== -1) {
                messages[messageIndex].isRead = true; // Update the isRead status to true

                // Write the updated messages back to the file
                try {
                    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
                    resolve();
                } catch (writeError) {
                    console.error('Error writing room file:', writeError);
                    return reject(writeError);
                }
            } else {
                console.error('Message not found');
                reject(new Error('Message not found'));
            }
        } catch (err) {
            console.error('Error reading room file:', err);
            reject(err);
        }
    });
}
// Function to read the room file and parse its contents to JSON
function getRoomChatData(roomId) {
    const filePath = path.join('chat_history', `${roomId}.json`); // file directory

    return new Promise((resolve, reject) => {
        // Read the contents of the room file
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading room file:', err);
                reject(err);
            } else {
                try {
                    // Parse the entire file content as a JSON array
                    const chatData = JSON.parse(data);
                    console.log("chatData is ",chatData)
                    resolve(chatData);
                } catch (parseError) {
                    console.error('Error parsing room chat data:', parseError);
                    reject(parseError);
                }
            }
        });
    });
}

module.exports = {
    appendMessageToRoomFile,
    updateMessageReadStatus,
    getRoomChatData
}

