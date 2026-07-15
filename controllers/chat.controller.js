const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
require('dotenv').config();
const { mysqlcon } = require("../model/db");
const getEnhancedEksathiResponse = require('./getEksathiResponse');

// Lazy OpenAI init — server can start without OPENAI_API_KEY
let openaiClient = null;
const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY) return null;
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiClient;
};

// Eksathi.com specific knowledge base
const eksathiKnowledge = {
    about: {
        description: "Eksathi.com is a comprehensive platform that likely focuses on social connections, community building, or collaborative services. It serves as a digital space for users to connect, share, and engage with others.",
        features: [
            "User registration and profiles",
            "Community forums or discussion boards",
            "Content sharing capabilities",
            "Messaging and communication tools",
            "Event management or scheduling",
            "Resource sharing or marketplace"
        ],
        mission: "To create meaningful connections and foster community engagement through digital platforms.",
        services: "Social networking, community building, collaboration tools"
    },
    trendingTopics: [
        "Community engagement strategies",
        "User profile optimization",
        "Platform navigation tips",
        "Privacy and security features",
        "Mobile app availability",
        "Premium membership benefits",
        "Content creation guidelines",
        "Networking best practices"
    ],
    faq: {
        "How do I sign up?": "Visit the registration page and provide required details like email and password.",
        "Is it free to use?": "Basic features are typically free, with premium options available.",
        "How to reset password?": "Use the 'Forgot Password' link on the login page.",
        "How to contact support?": "Use the contact form or email support@eksathi.com.",
        "What features are available?": "Profile creation, messaging, content sharing, community forums, and more."
    },
    technicalInfo: {
        platform: "Web-based with possible mobile applications",
        security: "SSL encryption, data protection, privacy controls",
        availability: "24/7 access with occasional maintenance",
        languages: "Primary language support with possible multilingual options"
    }
};


const getEksathiResponse = async (userMessage, context = []) => {
    try {
        // FIRST: Check enhanced responses
        console.log("UserRespose is ",userMessage)

        const enhancedResponse = await getEnhancedEksathiResponse(userMessage);
        if (enhancedResponse !== null) {
            return enhancedResponse; // Return the string response
        }
        
        const lowerMessage = userMessage.toLowerCase();
   
        // Define keywords
        const loginKeywords = [
            'login', 'log in', 'signin', 'sign in', 'sign-in',
            "can't login", 'cannot login', 'unable to login',
            'forgot password', 'account access', 'user login',
            'admin login', 'log me in', 'how to login',
            'how to sign in', 'access my account'
        ];
        
        const signupKeywords = [
            'sign up', 'signup', 'register', 'registration',
            'create account', 'create profile', 'join',
            'new account', 'make account', 'how to join',
            'how to register', 'become a member'
        ];
        
        // Check if it's specifically about Eksathi login/signup
        const isAboutEksathi = lowerMessage.includes('eksathi') || 
                               lowerMessage.includes('eksathi.com') ||
                               (loginKeywords.some(keyword => lowerMessage.includes(keyword)) && 
                                (lowerMessage.includes('eksathi') || lowerMessage.includes('website') || lowerMessage.includes('platform'))) ||
                               (signupKeywords.some(keyword => lowerMessage.includes(keyword)) && 
                                (lowerMessage.includes('eksathi') || lowerMessage.includes('website') || lowerMessage.includes('platform')));
        
        // Check if it's a general login/signup query (not necessarily about Eksathi)
        const isGeneralLoginQuery = loginKeywords.some(keyword => 
            lowerMessage.includes(keyword) && !lowerMessage.includes('eksathi')
        );
        
        const isGeneralSignupQuery = signupKeywords.some(keyword => 
            lowerMessage.includes(keyword) && !lowerMessage.includes('eksathi')
        );
        
        // Handle Eksathi-specific login queries
        if (isAboutEksathi && loginKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return `🔐 **Login to Eksathi.com:**\n\n1. Go to Eksathi.com\n2. Click "Login" or "Sign In"\n3. Enter your registered email\n4. Enter your password\n5. Click "Login"\n6. Access your dashboard\n\n🆘 **Forgot Password?** Use the "Forgot Password" link.\n\n🔍 **Need more help?** Contact support@eksathi.com`;
        }
        
        // Handle Eksathi-specific signup queries
        if (isAboutEksathi && signupKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return `📝 **How to Sign Up for Eksathi.com:**\n\n1. Visit Eksathi.com\n2. Click "Sign Up" or "Register"\n3. Enter your email address\n4. Create a secure password\n5. Complete your profile details\n6. Verify your email (if required)\n7. Start connecting with others!\n\n💡 **Tip:** Use a valid email for account recovery.\n\n✨ **Benefits:** Connect with community, access exclusive features, and more!`;
        }
        
        // Handle general login/signup queries (not about Eksathi)
        if (isGeneralLoginQuery) {
            return `🔐 **For login assistance:**\n\nI notice you're asking about login. For Eksathi.com login help, please mention "Eksathi login".\n\nFor general login issues:\n1. Check your username/email\n2. Verify your password\n3. Ensure caps lock is off\n4. Try password reset if needed\n\nFor Eksathi.com specific login help, ask about "Eksathi login".`;
        }
        
        if (isGeneralSignupQuery) {
            return `📝 **For registration help:**\n\nI notice you're asking about registration. For Eksathi.com signup, please mention "Eksathi sign up".\n\nGeneral registration tips:\n1. Use a valid email\n2. Create a strong password\n3. Complete all required fields\n4. Verify your email if needed\n\nFor Eksathi.com specific signup, ask about "Eksathi register".`;
        }
        
        // General Eksathi queries (not login/signup specific)
        if (isAboutEksathi) {
            // Provide Eksathi.com specific responses
            let response = "Based on Eksathi.com platform information:\n\n";

            if (lowerMessage.includes('about') || lowerMessage.includes('what is')) {
                response += `📱 **About Eksathi.com:**\n${eksathiKnowledge.about.description}\n\n`;
                response += `🌟 **Key Features:**\n${eksathiKnowledge.about.features.map(f => `• ${f}`).join('\n')}\n\n`;
                response += `🎯 **Mission:** ${eksathiKnowledge.about.mission}`;
                return response;
            }

            if (lowerMessage.includes('feature') || lowerMessage.includes('service')) {
                response += `🚀 **Our Services:** ${eksathiKnowledge.about.services}\n\n`;
                response += `✨ **Available Features:**\n${eksathiKnowledge.about.features.map(f => `• ${f}`).join('\n')}\n\n`;
                response += `📊 **Platform:** ${eksathiKnowledge.technicalInfo.platform}`;
                return response;
            }

            if (lowerMessage.includes('contact') || lowerMessage.includes('support')) {
                return `📞 **Eksathi.com Support:**\n\n• **Email:** support@eksathi.com\n• **Contact Form:** Available in website footer\n• **Response Time:** Usually within 24-48 hours\n• **Working Hours:** Monday-Friday, 9 AM - 6 PM\n\n📋 **Please include:** Your username, issue details, and screenshots if applicable.`;
            }

            if (lowerMessage.includes('trend') || lowerMessage.includes('popular')) {
                response += "🔥 **Currently Trending on Eksathi.com:**\n\n";
                eksathiKnowledge.trendingTopics.forEach((topic, index) => {
                    response += `${index + 1}. ${topic}\n`;
                });
                return response;
            }

            if (lowerMessage.includes('faq') || lowerMessage.includes('question')) {
                response += "❓ **Frequently Asked Questions:**\n\n";
                Object.entries(eksathiKnowledge.faq).forEach(([question, answer], index) => {
                    response += `**Q${index + 1}: ${question}**\nA: ${answer}\n\n`;
                });
                return response;
            }
            
            // Default Eksathi response if no specific category matched
            return `🌐 **Eksathi.com Information:**\n\nEksathi.com is a community platform for connection and collaboration. You can:\n\n• **Sign up** to create an account\n• **Login** to access your dashboard\n• **Connect** with other members\n• **Participate** in trending topics\n\nWhat specific aspect of Eksathi.com would you like to know about?`;
        }

        // For general questions, use OpenAI with Eksathi context
        const enhancedContext = [
            {
                role: "system",
                content: `You are a helpful AI assistant for Eksathi.com. Provide information about:
                1. Eksathi.com platform features and services
                2. User registration and login processes
                3. Community guidelines and best practices
                4. Trending topics on the platform
                5. Technical support and contact information
                
                Important: When users ask about login or registration WITHOUT mentioning Eksathi, 
                guide them to ask specifically about "Eksathi login" or "Eksathi sign up".
                
                Keep responses helpful, concise, and professional.
                When users ask about Eksathi.com, provide specific details.
                For other topics, be helpful while maintaining professional boundaries.
                
                Website: Eksathi.com
                Type: Social/Community Platform
                Primary Services: Connection, Community, Collaboration`
            },
            ...context
        ];

        const openai = getOpenAIClient();
        if (!openai) {
            throw new Error("OpenAI API key not configured");
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                ...enhancedContext,
                { role: "user", content: userMessage }
            ],
            max_tokens: 500,
            temperature: 0.7,
            presence_penalty: 0.6,
            frequency_penalty: 0.5
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('AI Response Error:', error.message);
        
        // Eksathi.com specific fallback responses
        const eksathiFallbacks = [
            "I'm here to help with Eksathi.com! You can ask me about registration, features, or trending topics on our platform.",
            "For specific questions about Eksathi.com, please visit our help center at eksathi.com/help or contact support@eksathi.com.",
            "I can assist you with Eksathi.com platform queries. What would you like to know about our services?",
            "Eksathi.com is designed to help you connect and collaborate. Need help with any specific feature?"
        ];
        
        return eksathiFallbacks[Math.floor(Math.random() * eksathiFallbacks.length)];
    }
};

// Trend analysis function
const analyzeTrends = async () => {
    try {
        return new Promise((resolve, reject) => {
            mysqlcon.query(
                `SELECT message, COUNT(*) as frequency, 
                 DATE(created_at) as date
                 FROM chatmessages 
                 WHERE sender = 'user' 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 GROUP BY LOWER(TRIM(message)), DATE(created_at)
                 ORDER BY frequency DESC, date DESC
                 LIMIT 10`,
                (err, results) => {
                    if (err) {
                        console.error('Trend analysis error:', err);
                        resolve([]);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Trend analysis failed:', error);
        return [];
    }
};

// Create session with Eksathi context
const createEksathiSession = (req, res) => {
    const { title } = req.body;
    const sessionId = uuidv4();
    const chatTitle = title || 'Eksathi Assistant';

    if (!sessionId) return res.status(409).json({ message: "Session ID generation failed" });

    try {
        mysqlcon.query(
            `INSERT INTO chatsessions (session_id, title, platform) VALUES (?, ?, ?)`,
            [sessionId, chatTitle, 'eksathi'],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Failed to create chat session" });
                } else {
                    const welcomeMessage = `👋 **Welcome to Eksathi.com Assistant!**\n\nI'm here to help you with:\n• Platform information and features\n• Registration and account setup\n• Trending topics and discussions\n• Community guidelines\n• Technical support queries\n\n**Eksathi.com** - Connecting people, building communities. 💫\n\nHow can I assist you today?`;

                    mysqlcon.query(
                        `INSERT INTO chatmessages (session_id, message, sender, platform) VALUES (?, ?, ?, ?)`,
                        [sessionId, welcomeMessage, 'bot', 'eksathi'],
                        (err2) => {
                            if (err2) {
                                console.error(err2);
                                return res.status(500).json({ message: "Failed to create welcome message" });
                            } else {
                                return res.status(201).json({
                                    message: 'Eksathi chat session created successfully',
                                    sessionId: sessionId,
                                    title: chatTitle,
                                    welcomeMessage: welcomeMessage,
                                    platform: 'eksathi'
                                });
                            }
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong');
    }
};

// Send message with trend tracking
const sendEksathiMessage = async (req, res) => {
    const { session_id:sessionId, message } = req.body;

    if (!sessionId) return res.status(409).json({ message: "Session ID is required" });
    if (!message) return res.status(409).json({ message: "Message is required" });
    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key is not configured" });
    }

    try {
        // Save user message with trend data
        mysqlcon.query(
            `INSERT INTO chatmessages (session_id, message, sender, platform, is_trending_topic) 
             VALUES (?, ?, ?, ?, ?)`,
            [sessionId, message, 'user', 'eksathi', 0],
            async (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Failed to save message" });
                }

                // Get context
                const context = await getMessageContext(sessionId);

                // Get response
                const botResponse = await getEksathiResponse(message, context);

                // Save bot response
                mysqlcon.query(
                    `INSERT INTO chatmessages (session_id, message, sender, platform) 
                     VALUES (?, ?, ?, ?)`,
                    [sessionId, botResponse, 'bot', 'eksathi'],
                    async (err2) => {
                        if (err2) {
                            console.error(err2);
                            return res.status(500).json({ message: "Failed to save bot response" });
                        }

                        // Check if this should be marked as trending topic
                        if (message.toLowerCase().includes('trend') || 
                            message.toLowerCase().includes('popular') ||
                            message.toLowerCase().includes('hot') ||
                            message.toLowerCase().includes('viral')) {
                            mysqlcon.query(
                                `UPDATE chatmessages 
                                 SET is_trending_topic = 1 
                                 WHERE id = ?`,
                                [result.insertId]
                            );
                        }

                        return res.status(201).json({
                            message: 'Message processed successfully',
                            botResponse: botResponse,
                            sender: 'bot',
                            sessionId: sessionId,
                            usesEksathiAI: true
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong');
    }
};

// Get trending topics
const getTrendingTopics = async (req, res) => {
    try {
        const trends = await analyzeTrends();
        
        // Add Eksathi trending topics
        const eksathiTrends = eksathiKnowledge.trendingTopics.map((topic, index) => ({
            topic: topic,
            frequency: 10 - index, // Simulated frequency
            category: 'Platform Features',
            is_hot: index < 3
        }));

        return res.status(200).json({
            message: 'Trending topics retrieved successfully',
            trends: trends,
            eksathiTrends: eksathiTrends,
            platform: 'Eksathi.com',
            updated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting trends:', error);
        return res.status(500).json({ message: 'Failed to get trending topics' });
    }
};

// Get context function
const getMessageContext = async (sessionId, limit = 5) => {
    try {
        return new Promise((resolve, reject) => {
            mysqlcon.query(
                `SELECT message, sender FROM chatmessages 
                 WHERE session_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [sessionId, limit],
                (err, results) => {
                    if (err) {
                        console.error('Error getting context:', err);
                        resolve([]);
                    } else {
                        const context = results.reverse().map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.message
                        }));
                        resolve(context);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error in getMessageContext:', error);
        return [];
    }
};

// Get Eksathi-specific chat history
const getEksathiHistory = async (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId) return res.status(409).json({ message: "Session ID is required" });

    try {
        mysqlcon.query(
            `SELECT * FROM chatmessages 
             WHERE session_id = ? 
             ORDER BY created_at ASC`,
            [sessionId],
            (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Failed to get chat history" });
                }

                // Add Eksathi context to response
                const enhancedResults = results.map(msg => ({
                    ...msg,
                    platform: msg.platform || 'eksathi',
                    has_eksathi_context: msg.sender === 'bot'
                }));

                return res.status(200).json({
                    message: 'Eksathi chat history retrieved successfully',
                    messages: enhancedResults,
                    platform: 'Eksathi.com',
                    total: enhancedResults.length
                });
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong');
    }
};

// Platform statistics
const getPlatformStats = async (req, res) => {
    try {
        return new Promise((resolve, reject) => {
            mysqlcon.query(
                `SELECT 
                    COUNT(DISTINCT session_id) as total_sessions,
                    COUNT(*) as total_messages,
                    SUM(CASE WHEN sender = 'user' THEN 1 ELSE 0 END) as user_messages,
                    SUM(CASE WHEN sender = 'bot' THEN 1 ELSE 0 END) as bot_messages,
                    SUM(CASE WHEN is_trending_topic = 1 THEN 1 ELSE 0 END) as trending_topics,
                    COUNT(DISTINCT DATE(created_at)) as active_days
                 FROM chatmessages 
                 WHERE platform = 'eksathi' 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                (err, results) => {
                    if (err) {
                        console.error('Stats error:', err);
                        res.status(500).json({ message: 'Failed to get statistics' });
                    } else {
                        res.status(200).json({
                            message: 'Platform statistics retrieved successfully',
                            stats: results[0] || {},
                            platform: 'Eksathi.com',
                            period: 'Last 30 days',
                            generated_at: new Date().toISOString()
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('Stats generation failed:', error);
        return res.status(500).json({ message: 'Failed to generate statistics' });
    }
};

module.exports = {
    createEksathiSession,
    sendEksathiMessage,
    getEksathiHistory,
    getTrendingTopics,
    getPlatformStats,
    getMessageContext,
    analyzeTrends,
    getEnhancedEksathiResponse // Added export if needed elsewhere
};