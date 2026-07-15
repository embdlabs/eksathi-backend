const { mysqlcon } = require("../model/db");

// Main search function - DECLARE IT FIRST
async function getSearchResults(searchQuery, instituteOnly = false) {
  return new Promise((resolve, reject) => {
    const cleanQuery = searchQuery.trim();
    const lowerQuery = cleanQuery.toLowerCase();

    console.log(
      `🔍 Searching for: "${cleanQuery}"${instituteOnly ? " (Institutes Only)" : ""}`,
    );

    // Parse search query for location and name filters
    const parsedQuery = parseSearchQuery(cleanQuery);
    const { nameTerm, locationTerm, registrationNumber } = parsedQuery;

    console.log(`📊 Parsed Query:`, parsedQuery);

    // Search for users (unless instituteOnly is true)
    if (!instituteOnly) {
      searchUsers(nameTerm, locationTerm)
        .then((userResults) => {
          // Always search for institutes too
          searchInstitutes(nameTerm, locationTerm, registrationNumber)
            .then((instituteResults) => {
              const response = formatCombinedResults(
                userResults,
                instituteResults,
                parsedQuery,
              );
              resolve(response);
            })
            .catch((err) => {
              console.error("Institute search error:", err);
              const response = formatCombinedResults(
                userResults,
                [],
                parsedQuery,
              );
              resolve(response);
            });
        })
        .catch((err) => {
          console.error("User search error:", err);
          // Try institute search anyway
          searchInstitutes(nameTerm, locationTerm, registrationNumber)
            .then((instituteResults) => {
              const response = formatCombinedResults(
                [],
                instituteResults,
                parsedQuery,
              );
              resolve(response);
            })
            .catch((err2) => {
              console.error("Both searches failed:", err2);
              resolve(getNoResultsResponse(parsedQuery));
            });
        });
    } else {
      // Only search institutes
      searchInstitutes(nameTerm, locationTerm, registrationNumber)
        .then((instituteResults) => {
          const response = formatCombinedResults(
            [],
            instituteResults,
            parsedQuery,
          );
          resolve(response);
        })
        .catch((err) => {
          console.error("Institute search error:", err);
          resolve(getNoResultsResponse(parsedQuery, true));
        });
    }
  });
}

// Parse search query into components
function parseSearchQuery(query) {
  const result = {
    original: query,
    nameTerm: query,
    locationTerm: null,
    registrationNumber: null,
  };

  const lowerQuery = query.toLowerCase();

  // Extract registration number (6+ digits)
  const regNumberMatch = query.match(/\b(\d{6,})\b/);
  if (regNumberMatch) {
    result.registrationNumber = regNumberMatch[1];
    // Remove registration number from name term
    result.nameTerm = query.replace(regNumberMatch[0], "").trim();
  }

  // Common location patterns - more comprehensive
  const locationPatterns = [
    /(?:in|from|at|near|located\s+in|based\s+in)\s+([a-zA-Z\s]+(?:city|town|village|district)?)/i,
    /([a-zA-Z\s]+)(?:\s+(?:city|town|village|district))/i,
    /(delhi|mumbai|kolkata|chennai|bangalore|hyderabad|pune|ahmedabad)/i,
    /(central\s+delhi|new\s+delhi|south\s+delhi|north\s+delhi|east\s+delhi|west\s+delhi)/i,
  ];

  // Try to extract location
  let extractedLocation = null;
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      extractedLocation = match[1].trim();
      break;
    } else if (match && match[0]) {
      // For patterns without capture groups
      extractedLocation = match[0].trim();
      break;
    }
  }

  // If we found a location
  if (extractedLocation) {
    result.locationTerm = extractedLocation;

    // Remove location from name term if it's different
    if (
      result.nameTerm.toLowerCase().includes(extractedLocation.toLowerCase())
    ) {
      result.nameTerm = result.nameTerm
        .replace(new RegExp(extractedLocation, "i"), "")
        .trim();
    }

    // Also try to remove common location prefixes
    result.nameTerm = result.nameTerm
      .replace(
        /(?:in|from|at|near|located\s+in|based\s+in)\s+[a-zA-Z\s]+$/i,
        "",
      )
      .trim();
  }

  // Clean up name term
  if (result.nameTerm === "" && result.locationTerm) {
    result.nameTerm = result.locationTerm;
    result.locationTerm = null;
  }

  // If name term is just location indicators, swap them
  if (
    result.nameTerm.match(/^(in|from|at|near|located|based)$/i) &&
    result.locationTerm
  ) {
    const temp = result.nameTerm;
    result.nameTerm = result.locationTerm;
    result.locationTerm = temp;
  }

  // Remove extra spaces
  result.nameTerm = result.nameTerm.replace(/\s+/g, " ").trim();

  return result;
}

// Search users in database
async function searchUsers(nameTerm, locationTerm) {
  return new Promise((resolve, reject) => {
    const conditions = [];
    const params = [];

    // Name search conditions
    if (nameTerm && nameTerm.length >= 2) {
      const namePattern = `%${nameTerm.toLowerCase()}%`;
      conditions.push(`
                (LOWER(username) LIKE ? 
                OR LOWER(display_name) LIKE ? 
                OR LOWER(first_name) LIKE ? 
                OR LOWER(last_name) LIKE ? 
                OR LOWER(middle_name) LIKE ? 
                OR CONCAT(LOWER(first_name), ' ', LOWER(last_name)) LIKE ?
                OR CONCAT(LOWER(first_name), ' ', LOWER(middle_name), ' ', LOWER(last_name)) LIKE ?)
            `);
      for (let i = 0; i < 7; i++) params.push(namePattern);
    }

    // Location search conditions
    if (locationTerm) {
      const locationPattern = `%${locationTerm.toLowerCase()}%`;
      conditions.push(`(
                LOWER(location) LIKE ? 
                OR location LIKE ?
            )`);
      params.push(locationPattern, `%${locationTerm}%`);
    }

    if (conditions.length === 0) {
      resolve([]);
      return;
    }

    const query = `
            SELECT 
                username,
                email,
                display_name,
                first_name,
                last_name,
                middle_name,
                role,
                status,
                is_verified,
                createdAt,
                location,
                phone,
                bio,
                avatar_url,
                is_online,
                qualification,
                experience,
                rating,
                login_count
            FROM users 
            WHERE ${conditions.join(" AND ")}
            ORDER BY 
                CASE 
                    WHEN LOWER(username) = ? THEN 1
                    WHEN LOWER(first_name) = ? OR LOWER(last_name) = ? THEN 2
                    ELSE 3 
                END,
                login_count DESC,
                createdAt DESC
            LIMIT 10
        `;

    // Add exact match parameters for ordering
    const lowerNameTerm = nameTerm.toLowerCase();
    params.push(lowerNameTerm, lowerNameTerm, lowerNameTerm);

    mysqlcon.query(query, params, (err, results) => {
      if (err) {
        console.error("User search error:", err);
        reject(err);
      } else {
        console.log(`✅ Found ${results.length} user(s)`);
        resolve(results);
      }
    });
  });
}

// Search institutes in database - UPDATED VERSION
async function searchInstitutes(nameTerm, locationTerm, registrationNumber) {
  return new Promise((resolve, reject) => {
    const conditions = [];
    const params = [];

    // Name search conditions
    if (nameTerm && nameTerm.length >= 2) {
      const namePattern = `%${nameTerm.toLowerCase()}%`;
      conditions.push(`(LOWER(i.username) LIKE ? OR LOWER(i.name) LIKE ?)`);
      params.push(namePattern, namePattern);
    }

    // Registration number search
    if (registrationNumber) {
      conditions.push(`(ip.instituteRegistrationNumber LIKE ?)`);
      params.push(`%${registrationNumber}%`);
    }

    // Location search conditions (from institute_profiles)
    if (locationTerm) {
      const locationPattern = `%${locationTerm.toLowerCase()}%`;

      // Search in multiple location fields
      conditions.push(`(
                LOWER(ip.city) LIKE ? 
                OR LOWER(ip.state) LIKE ?
                OR LOWER(ip.country) LIKE ?
                OR LOWER(ip.address) LIKE ?
                OR LOWER(ip.landmark) LIKE ?
                OR CONCAT(LOWER(ip.city), ' ', LOWER(ip.state)) LIKE ?
                OR CONCAT(LOWER(ip.state), ' ', LOWER(ip.city)) LIKE ?
            )`);

      // Add the pattern multiple times for all conditions
      for (let i = 0; i < 7; i++) {
        params.push(locationPattern);
      }
    }

    // Special case: if only location is provided (no name term)
    if (!nameTerm && !registrationNumber && locationTerm) {
      const locationPattern = `%${locationTerm.toLowerCase()}%`;
      conditions.push(`(
                LOWER(ip.city) LIKE ? 
                OR LOWER(ip.state) LIKE ?
                OR LOWER(ip.country) LIKE ?
                OR LOWER(ip.address) LIKE ?
                OR LOWER(ip.landmark) LIKE ?
            )`);

      for (let i = 0; i < 5; i++) {
        params.push(locationPattern);
      }
    }

    // If no conditions at all, return empty
    if (conditions.length === 0 && !registrationNumber && !locationTerm) {
      resolve([]);
      return;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
            SELECT 
                i.username,
                i.name as display_name,
                i.email,
                i.status,
                i.createdAt,
                i.logo,
                i.mobile as phone,
                ip.city,
                ip.state,
                ip.country,
                ip.instituteRegistrationNumber,
                ip.address,
                ip.landmark,
                ip.ownername,
                ip.aboutYou
            FROM institutes i
            LEFT JOIN institute_profiles ip ON i.id = ip.institute_id
            ${whereClause}
            ORDER BY 
                CASE 
                    WHEN ? != '' AND LOWER(i.username) = ? THEN 1
                    WHEN ? != '' AND LOWER(i.name) LIKE ? THEN 2
                    WHEN ? != '' AND LOWER(ip.city) LIKE ? THEN 3
                    WHEN ? != '' AND LOWER(ip.state) LIKE ? THEN 4
                    ELSE 5 
                END,
                i.createdAt DESC
            LIMIT 15
        `;

    // Add ordering parameters
    const lowerNameTerm = nameTerm ? nameTerm.toLowerCase() : "";
    const namePattern = nameTerm ? `%${lowerNameTerm}%` : "";
    const locationPattern = locationTerm
      ? `%${locationTerm.toLowerCase()}%`
      : "";

    // Order by parameters
    params.push(
      lowerNameTerm,
      lowerNameTerm, // for username exact match
      lowerNameTerm,
      namePattern, // for name match
      locationTerm,
      locationPattern, // for city match
      locationTerm,
      locationPattern, // for state match
    );

    console.log(`🏛️ Institute Query:`, query.substring(0, 200) + "...");
    console.log(`🏛️ Query Params:`, params.slice(0, 10));

    mysqlcon.query(query, params, (err, results) => {
      if (err) {
        console.error("Institute search error:", err);
        reject(err);
      } else {
        console.log(`🏛️ Found ${results.length} institute(s)`);
        if (results.length > 0) {
          console.log(`🏛️ Sample result:`, {
            name: results[0].display_name,
            city: results[0].city,
            state: results[0].state,
            address: results[0].address,
          });
        }
        resolve(results);
      }
    });
  });
}

// Format combined results
function formatCombinedResults(userResults, instituteResults, parsedQuery) {
  const { original, nameTerm, locationTerm, registrationNumber } = parsedQuery;

  // No results at all
  if (userResults.length === 0 && instituteResults.length === 0) {
    return getNoResultsResponse(parsedQuery);
  }

  let response = "";
  let resultCount = 0;

  // Add search context
  response += `**🔍 SEARCH RESULTS**\n\n`;

  if (nameTerm && nameTerm !== original) {
    response += `**Search Term:** "${nameTerm}"\n`;
  }

  if (locationTerm) {
    response += `**Location:** ${locationTerm}\n`;
  }

  if (registrationNumber) {
    response += `**Registration No:** ${registrationNumber}\n`;
  }

  if (nameTerm || locationTerm || registrationNumber) {
    response += `\n`;
  }

  // Format users section
  if (userResults.length > 0) {
    response += `**👥 USERS (${userResults.length})**\n`;
    response += `\`\`\`\n`;

    userResults.forEach((user, index) => {
      resultCount++;

      const joinDate = new Date(user.createdAt);
      const formattedDate = joinDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      // Display name
      let displayName = "";
      if (user.display_name) {
        displayName = user.display_name;
      } else if (user.first_name || user.last_name || user.middle_name) {
        const names = [
          user.first_name,
          user.middle_name,
          user.last_name,
        ].filter((n) => n);
        displayName = names.join(" ");
      }

      // Location text
      let locationText = "";
      if (user.location) {
        try {
          const locationObj = JSON.parse(user.location);
          if (locationObj.city) locationText = locationObj.city;
        } catch (e) {
          locationText = user.location;
        }
      }

      response += `${resultCount}. @${user.username}\n`;
      if (displayName) response += `   Name: ${displayName}\n`;
      response += `   Role: ${getRoleEmoji(user.role)} ${user.role}\n`;
      response += `   Status: ${user.status === "active" ? "🟢 Active" : "⚫ Inactive"}\n`;
      if (locationText) response += `   Location: ${locationText}\n`;
      if (user.is_online === "true") response += `   Online: 🟢 Now\n`;

      // For teachers
      if (user.role === "teacher") {
        if (user.qualification)
          response += `   Qualification: ${user.qualification}\n`;
        if (user.experience)
          response += `   Experience: ${user.experience} years\n`;
        if (user.rating) response += `   Rating: ${user.rating} ⭐\n`;
      }

      response += `   Joined: ${formattedDate}\n`;
      if (index < userResults.length - 1) response += `\n`;
    });

    response += `\`\`\`\n\n`;
  }

  // Format institutes section
  if (instituteResults.length > 0) {
    if (userResults.length > 0) {
      response += `---\n\n`;
    }

    response += `**🏛️ INSTITUTES (${instituteResults.length})**\n`;
    response += `\`\`\`\n`;

    instituteResults.forEach((inst, index) => {
      resultCount++;

      const joinDate = new Date(inst.createdAt);
      const formattedDate = joinDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      response += `${resultCount}. ${inst.display_name}\n`;
      response += `   ID: ${inst.username}\n`;
      response += `   Status: ${formatInstituteStatus(inst.status)}\n`;

      if (inst.city) response += `   City: ${inst.city}\n`;
      if (inst.state) response += `   State: ${inst.state}\n`;
      if (inst.country && inst.country !== "India")
        response += `   Country: ${inst.country}\n`;

      if (inst.instituteRegistrationNumber) {
        response += `   Reg No: ${inst.instituteRegistrationNumber}\n`;
      }

      if (inst.address) {
        const shortAddress =
          inst.address.length > 50
            ? inst.address.substring(0, 50) + "..."
            : inst.address;
        response += `   Address: ${shortAddress}\n`;
      }

      response += `   Registered: ${formattedDate}\n`;
      if (index < instituteResults.length - 1) response += `\n`;
    });

    response += `\`\`\`\n\n`;
  }

  // Add summary
  response += `📊 **Total Results:** ${resultCount}`;

  // Add search tips if few results
  if (resultCount < 3) {
    response += `\n\n💡 **Search Tips:**\n`;
    response += `• Try different spellings\n`;
    if (!locationTerm) response += `• Add location (e.g., "in Delhi")\n`;
    if (!registrationNumber && original.match(/\d+/))
      response += `• Use registration number for institute search\n`;
    response += `• Search by username for exact matches`;
  }

  return response;
}

// No results response
function getNoResultsResponse(parsedQuery, instituteOnly = false) {
  const { original, nameTerm, locationTerm, registrationNumber } = parsedQuery;

  let response = `**❌ NO RESULTS FOUND**\n\n`;

  if (nameTerm)
    response += `No ${instituteOnly ? "institutes" : "users or institutes"} found for "${nameTerm}"`;
  if (locationTerm) response += ` in ${locationTerm}`;
  if (registrationNumber)
    response += ` with registration ${registrationNumber}`;

  response += `.\n\n`;
  response += `**🔍 Try these searches:**\n`;
  response += `• Exact username: "john_doe"\n`;
  response += `• Name with location: "john in delhi"\n`;
  response += `• Institute registration: "12345678"\n`;
  response += `• Institute name: "engineering college"\n`;
  response += `• Institute in location: "college in mumbai"\n\n`;
  response += `**📝 Not registered yet?**\n`;
  response += `Join at: eksathi.com/register`;

  return response;
}

// Helper function for institute status
function formatInstituteStatus(status) {
  const statusMap = {
    Verification: "📋 Verification",
    Onboarding: "🚀 Onboarding",
    Active: "🟢 Active",
    Inactive: "⚫ Inactive",
    "On-Hold": "⏸️ On Hold",
    Suspended: "🔴 Suspended",
    "Re-Verification": "🔄 Re-Verification",
  };
  return statusMap[status] || status;
}

// Helper function for role emoji
function getRoleEmoji(role) {
  switch (role) {
    case "admin":
      return "👑";
    case "moderator":
      return "🛡️";
    case "teacher":
      return "👨‍🏫";
    case "student":
      return "👨‍🎓";
    case "professional":
      return "💼";
    case "institute":
      return "🏛️";
    default:
      return "👤";
  }
}

// Main function

// const getEnhancedEksathiResponse = async (userMessage) => {
//   const lowerMessage = userMessage.toLowerCase();

//   // Pattern 1: Location-only searches (ADD THIS AT THE TOP)
//   const locationOnlyPattern =
//     /^(search|find|show|list)\s+(?:institutes|colleges|schools|universities)?\s*(?:in|at|from|near)\s+([a-zA-Z\s]+)$/i;
//   const locationMatch = userMessage.match(locationOnlyPattern);

//   if (locationMatch) {
//     const locationQuery = locationMatch[2] || locationMatch[1];
//     if (locationQuery) {
//       try {
//         return await getSearchResults(locationQuery, true);
//       } catch (error) {
//         console.error("Error in location search:", error);
//         return `**🔍 Location Search Error**\n\nSorry, I couldn't search in that location at the moment.`;
//       }
//     }
//   }

//   // Pattern 2: Direct location queries
//   const directLocationPattern =
//     /^(central delhi|new delhi|south delhi|north delhi|east delhi|west delhi|delhi|mumbai|kolkata|chennai|bangalore|hyderabad|pune|ahmedabad)$/i;
//   if (directLocationPattern.test(userMessage.trim().toLowerCase())) {
//     const location = userMessage.trim();
//     try {
//       return await getSearchResults(`institutes in ${location}`, true);
//     } catch (error) {
//       console.error("Error in direct location search:", error);
//     }
//   }

//   // IMPROVED USERNAME DETECTION PATTERNS

//   // Pattern 3: "is [username] registered?"
//   const isRegisteredPattern = /is\s+([a-zA-Z0-9_\.\-\s]+)\s+registered/i;
//   const registeredMatch = userMessage.match(isRegisteredPattern);

//   if (registeredMatch) {
//     const searchQuery = registeredMatch[1].trim();
//     if (searchQuery) {
//       try {
//         return await getSearchResults(searchQuery);
//       } catch (error) {
//         console.error("Error in user check:", error);
//         return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
//       }
//     }
//   }

//   // Pattern 4: "check [search term]" or "find [search term]"
//   const checkUserPattern =
//     /(check|find|search|lookup|details|status)\s+([a-zA-Z0-9_\.\-\s]+)/i;
//   const userMatch = userMessage.match(checkUserPattern);

//   if (userMatch) {
//     const searchQuery = userMatch[2].trim();
//     if (searchQuery && searchQuery.length >= 2) {
//       try {
//         return await getSearchResults(searchQuery);
//       } catch (error) {
//         console.error("Error in search:", error);
//         return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
//       }
//     }
//   }

//   // Pattern 5: "user [search term]"
//   const userPattern = /^user\s+([a-zA-Z0-9_\.\-\s]+)$/i;
//   const userOnlyMatch = userMessage.match(userPattern);

//   if (userOnlyMatch) {
//     const searchQuery = userOnlyMatch[1].trim();
//     if (searchQuery) {
//       try {
//         return await getSearchResults(searchQuery);
//       } catch (error) {
//         console.error("Error in search:", error);
//         return `**🔍 Search Error**\n\nSorry, I couldn't check the user at the moment.`;
//       }
//     }
//   }

//   // Pattern 6: Direct search term (when user just types the search term)
//   const directSearchPattern = /^[a-zA-Z0-9_\.\-\s]{2,100}$/;
//   if (directSearchPattern.test(userMessage.trim())) {
//     const searchQuery = userMessage.trim();
//     const commonWords = [
//       "help",
//       "eksathi",
//       "register",
//       "login",
//       "about",
//       "features",
//       "support",
//       "hi",
//       "hello",
//       "what",
//       "how",
//       "ok",
//       "yes",
//       "no",
//       "thanks",
//       "thank",
//     ];
//     if (!commonWords.includes(searchQuery.toLowerCase())) {
//       try {
//         return await getSearchResults(searchQuery);
//       } catch (error) {
//         console.error("Error in search:", error);
//         // Continue to other checks
//       }
//     }
//   }

//   // Pattern 7: "find user [search term]" or "search user [search term]"
//   const findUserPattern = /(find|search)\s+user\s+([a-zA-Z0-9_\.\-\s]+)/i;
//   const findMatch = userMessage.match(findUserPattern);

//   if (findMatch) {
//     const searchQuery = findMatch[2].trim();
//     if (searchQuery) {
//       try {
//         return await getSearchResults(searchQuery);
//       } catch (error) {
//         console.error("Error in search:", error);
//         return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
//       }
//     }
//   }

//   // Pattern 8: "check if [search term] is registered"
//   const checkIfPattern =
//     /check\s+if\s+([a-zA-Z0-9_\.\-\s]+)\s+is\s+registered/i;
//   const checkIfMatch = userMessage.match(checkIfPattern);

//   if (checkIfMatch) {
//     const searchQuery = checkIfMatch[1].trim();
//     if (searchQuery) {
//       try {
//         return await getSearchResults(searchQuery);
//       } catch (error) {
//         console.error("Error in search:", error);
//         return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
//       }
//     }
//   }

//   // Pattern 9: "institute [search term]" or "college [search term]"
//   const institutePattern =
//     /(institute|college|school|university|academy)\s+([a-zA-Z0-9_\.\-\s]+)/i;
//   const instituteMatch = userMessage.match(institutePattern);

//   if (instituteMatch) {
//     const searchQuery = instituteMatch[2].trim();
//     if (searchQuery) {
//       try {
//         return await getSearchResults(searchQuery, true);
//       } catch (error) {
//         console.error("Error in institute search:", error);
//         return `**🔍 Institute Search Error**\n\nSorry, I couldn't search for institutes at the moment.`;
//       }
//     }
//   }

//   // 1. WHAT IS EKSATHI.COM?
//   if (
//     lowerMessage.includes("what is eksathi") ||
//     lowerMessage.includes("what is eksathi.com") ||
//     lowerMessage.includes("explain eksathi") ||
//     lowerMessage.includes("about eksathi")
//   ) {
//     return `**Eksathi.com - Your Complete Community Platform** 🌟

// **📱 Platform Overview:**
// Eksathi.com is a comprehensive digital ecosystem designed to connect people, build communities, and foster meaningful relationships through technology. 

// **✨ Core Concept:**
// It's more than just a social network - it's a platform where individuals can:
// • Find like-minded people based on interests
// • Join specialized communities and discussion groups
// • Share knowledge and resources
// • Collaborate on projects and events
// • Build professional and personal networks

// **🎯 Our Mission:**
// "To create meaningful connections and foster community engagement through innovative digital platforms that bring people together."

// **🚀 Key Differentiators:**
// • **Intelligent Matching**: AI-powered connection suggestions
// • **Safe Environment**: Verified profiles and secure interactions
// • **Diverse Communities**: From professional networks to hobby groups
// • **Seamless Experience**: Web and mobile app integration

// **💼 Who Uses Eksathi:**
// • Professionals seeking networking opportunities
// • Students looking for mentors
// • Hobbyists finding community
// • Organizations building engagement
// • Individuals seeking meaningful connections

// Start your journey at: https://eksathi.com`;
//   }

//   // 2. HOW TO USE EKSATHI
//   if (
//     lowerMessage.includes("how to use") ||
//     lowerMessage.includes("how does it work") ||
//     lowerMessage.includes("getting started") ||
//     lowerMessage.includes("how to start")
//   ) {
//     return `**🚀 How to Use Eksathi.com - Complete Guide**

// **📋 Getting Started Process:**

// **Step 1: Account Creation**
// 1. Visit **Eksathi.com**
// 2. Click "Get Started" or "Join Free"
// 3. Choose your account type (Personal/Business)
// 4. Enter basic details (name, email, password)
// 5. Verify your email address

// **Step 2: Profile Setup**
// 1. Add profile picture (recommended for 80% more connections)
// 2. Complete your bio (who you are, what you're looking for)
// 3. Add interests and skills (helps with better matching)
// 4. Set privacy preferences
// 5. Connect social media (optional)

// **Step 3: Platform Navigation**
// • **Home Feed**: See updates from your connections
// • **Discover**: Find new people and communities
// • **Messages**: Direct and group conversations
// • **Events**: Browse and join community events
// • **Resources**: Access shared knowledge and files

// **Step 4: Making Connections**
// 1. Use **Smart Search** to find people by interests
// 2. Send personalized connection requests
// 3. Join relevant **community groups**
// 4. Participate in **discussion forums**
// 5. Attend **virtual events**

// **Step 5: Advanced Features**
// • **Create Events**: Host your own community gatherings
// • **Start Discussions**: Lead conversations in groups
// • **Share Resources**: Upload helpful content
// • **Build Network**: Expand your professional circle

// **💡 Pro Tips for New Users:**
// 1. Complete your profile 100% for better visibility
// 2. Be active daily for optimal algorithm benefits
// 3. Join 3-5 communities that match your interests
// 4. Engage meaningfully rather than just connecting
// 5. Use the mobile app for on-the-go access

// Having trouble with any specific feature? Just ask!`;
//   }

//   // 3. HOW TO LOGIN
//   if (
//     lowerMessage.includes("how to login") ||
//     lowerMessage.includes("how to log in") ||
//     lowerMessage.includes("sign in") ||
//     lowerMessage.includes("access my account") ||
//     lowerMessage.includes("login problem")
//   ) {
//     return `**🔐 Eksathi.com Login Guide - Multiple Methods**

// **Method 1: Standard Web Login**
// 1. Go to **https://eksathi.com**
// 2. Click **"Sign In"** (top right corner)
// 3. Enter your registered email address
// 4. Enter your password
// 5. Click **"Login"**
// 6. You'll be redirected to your dashboard

// **Method 2: Mobile App Login**
// 1. Download **Eksathi App** from App Store/Play Store
// 2. Open the application
// 3. Tap **"Already have an account?"**
// 4. Enter email and password
// 5. Enable **"Stay logged in"** if using personal device
// 6. Tap **"Sign In"**

// **Method 3: Social Media Login** (If enabled)
// 1. On login page, click preferred platform (Google/Facebook)
// 2. Authorize Eksathi to access basic profile
// 3. Confirm login permissions
// 4. You'll be automatically logged in

// **🔧 Troubleshooting Login Issues:**

// **Problem 1: Forgot Password**
// 1. Click **"Forgot Password?"** on login page
// 2. Enter your registered email
// 3. Check inbox for reset link (check spam folder too)
// 4. Click link and create new password
// 5. Login with new credentials

// **Problem 2: Account Locked**
// 1. Wait 15 minutes (automatic security lock)
// 2. Reset password if necessary
// 3. Contact support@eksathi.com if persists

// **Problem 3: Email Not Recognized**
// 1. Double-check email spelling
// 2. Try different email if multiple accounts
// 3. Contact support for account recovery

// **🛡️ Security Recommendations:**
// • Use strong, unique password
// • Enable Two-Factor Authentication
// • Don't use public computers for login
// • Log out after using shared devices
// • Regularly update password

// **🚨 Emergency Access:**
// If completely locked out, contact:
// 📧 support@eksathi.com with subject: "URGENT: Login Issue"`;
//   }

//   // 4. HOW TO REGISTER/SIGN UP
//   if (
//     lowerMessage.includes("how to register") ||
//     lowerMessage.includes("how to sign up") ||
//     lowerMessage.includes("create account") ||
//     lowerMessage.includes("new account") ||
//     lowerMessage.includes("join eksathi")
//   ) {
//     return `**📝 Complete Registration Guide for Eksathi.com**

// **🎯 Before You Start - Requirements:**
// ✓ Must be 15+ years old
// ✓ Valid email address
// ✓ Internet connection
// ✓ 5 minutes of time

// **Step-by-Step Registration Process:**

// **Step 1: Access Registration Page**
// • Visit: **https://eksathi.com/auth/register**
// • OR Click **"Join Free"** on homepage

// **Step 2: Basic Information**
// 1. **Full Name** (as you want to be identified)
// 2. **Email Address** (use active email for verification)
// 3. **Password** (minimum 8 characters, mix of letters, numbers, symbols)
// 4. **Confirm Password**

// **Step 3: Profile Type Selection**
// Choose your primary purpose:
// • **Personal Use** (making friends, networking)
// • **Professional Use** (career networking, business)
// • **Community Builder** (creating/managing groups)
// • **Student/Educator** (educational purposes)

// **Step 4: Interest Selection**
// Select 3-5 interest categories:
// • Technology • Business • Arts • Sports • Education
// • Health • Entertainment • Travel • Food • Gaming
// *(These help match you with relevant communities)*

// **Step 5: Email Verification**
// 1. Check your email inbox
// 2. Open email from **noreply@eksathi.com**
// 3. Click **"Verify Email"** button
// 4. You'll be redirected to complete profile

// **Step 6: Complete Your Profile** (Highly Recommended)
// 1. **Profile Picture**: Upload clear photo (increases connections by 70%)
// 2. **Bio/Introduction**: Write 50+ words about yourself
// 3. **Location**: Add city/country (optional but helpful)
// 4. **Interests**: Add specific hobbies/passions
// 5. **Skills**: List professional/personal skills
// 6. **Goals**: What you hope to achieve on Eksathi

// **✅ Post-Registration Checklist:**
// 1. ✓ Email verified
// 2. ✓ Profile picture added
// 3. ✓ Bio completed
// 4. ✓ Joined first community
// 5. ✓ Made first connection

// **💡 Registration Tips:**
// • Use **real information** for better connections
// • **Complete profile 100%** for maximum visibility
// • **Verify email immediately** to avoid access issues
// • **Download mobile app** for better experience

// **🎁 Registration Benefits:**
// • **Immediate access** to basic features
// • **Free forever** basic account
// • **Connect** with 1000+ active users
// • **Join** 500+ communities
// • **Access** to free resources

// Welcome to the Eksathi community! 🌟`;
//   }

//   // 5. MULTIPLE QUESTIONS IN ONE (Combined)
//   if (
//     lowerMessage.includes("what is") &&
//     lowerMessage.includes("eksathi") &&
//     (lowerMessage.includes("how to") ||
//       lowerMessage.includes("login") ||
//       lowerMessage.includes("register"))
//   ) {
//     return `**🤔 You asked multiple questions about Eksathi.com! Here's a complete overview:**

// **1. 📱 WHAT IS EKSATHI.COM?**
// Eksathi.com is a community platform connecting people based on shared interests, goals, and values. It's your digital space for meaningful connections, knowledge sharing, and community building.

// **2. 🚀 HOW TO USE EKSATHI.COM:**
// **Quick Start Guide:**
// • **Step 1**: Register with email
// • **Step 2**: Complete your profile
// • **Step 3**: Explore communities
// • **Step 4**: Connect with people
// • **Step 5**: Engage in discussions
// • **Step 6**: Join/attend events

// **3. 🔐 HOW TO LOGIN:**
// • Web: eksathi.com → "Sign In" → Email/Password
// • Mobile: App → "Login" → Credentials
// • Social: Login with Google/Facebook (optional)

// **4. 📝 HOW TO REGISTER:**
// • Visit eksathi.com/register
// • Fill basic info (2 minutes)
// • Verify email
// • Start connecting!

// **🎯 Recommended First Steps:**
// 1. Register now (it's free!)
// 2. Complete 100% profile
// 3. Join 3 interest-based communities
// 4. Send 5 connection requests
// 5. Post your first introduction

// **💡 Best Practice:**
// Start with the mobile app for better user experience and notifications.

// **Need help with any specific step? Just ask!**`;
//   }

//   // Return null if no specific enhanced response
//   return null;
// };

const getEnhancedEksathiResponse = async (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();

  // ========== INFORMATION/RESPONSE PATTERNS FIRST ==========

  // 1. WHAT IS EKSATHI.COM?
  if (
    lowerMessage.includes("what is eksathi") ||
    lowerMessage.includes("what is eksathi.com") ||
    lowerMessage.includes("explain eksathi") ||
    lowerMessage.includes("about eksathi") ||
    lowerMessage.match(/eksathi\.?(com)?\s+(info|details)/i)
  ) {
    return `**Eksathi.com - Your Complete Community Platform** 🌟

**📱 Platform Overview:**
Eksathi.com is a comprehensive digital ecosystem designed to connect people, build communities, and foster meaningful relationships through technology. 

**✨ Core Concept:**
It's more than just a social network - it's a platform where individuals can:
• Find like-minded people based on interests
• Join specialized communities and discussion groups
• Share knowledge and resources
• Collaborate on projects and events
• Build professional and personal networks

**🎯 Our Mission:**
"To create meaningful connections and foster community engagement through innovative digital platforms that bring people together."

**🚀 Key Differentiators:**
• **Intelligent Matching**: AI-powered connection suggestions
• **Safe Environment**: Verified profiles and secure interactions
• **Diverse Communities**: From professional networks to hobby groups
• **Seamless Experience**: Web and mobile app integration

**💼 Who Uses Eksathi:**
• Professionals seeking networking opportunities
• Students looking for mentors
• Hobbyists finding community
• Organizations building engagement
• Individuals seeking meaningful connections

Start your journey at: https://eksathi.com`;
  }

  // 2. HOW TO USE EKSATHI
  if (
    lowerMessage.includes("how to use") ||
    lowerMessage.includes("how does it work") ||
    lowerMessage.includes("getting started") ||
    lowerMessage.includes("how to start") ||
    lowerMessage.includes("user guide") ||
    lowerMessage.includes("tutorial")
  ) {
    return `**🚀 How to Use Eksathi.com - Complete Guide**

**📋 Getting Started Process:**

**Step 1: Account Creation**
1. Visit **Eksathi.com**
2. Click "Get Started" or "Join Free"
3. Choose your account type (Personal/Business)
4. Enter basic details (name, email, password)
5. Verify your email address

**Step 2: Profile Setup**
1. Add profile picture (recommended for 80% more connections)
2. Complete your bio (who you are, what you're looking for)
3. Add interests and skills (helps with better matching)
4. Set privacy preferences
5. Connect social media (optional)

**Step 3: Platform Navigation**
• **Home Feed**: See updates from your connections
• **Discover**: Find new people and communities
• **Messages**: Direct and group conversations
• **Events**: Browse and join community events
• **Resources**: Access shared knowledge and files

**Step 4: Making Connections**
1. Use **Smart Search** to find people by interests
2. Send personalized connection requests
3. Join relevant **community groups**
4. Participate in **discussion forums**
5. Attend **virtual events**

**Step 5: Advanced Features**
• **Create Events**: Host your own community gatherings
• **Start Discussions**: Lead conversations in groups
• **Share Resources**: Upload helpful content
• **Build Network**: Expand your professional circle

**💡 Pro Tips for New Users:**
1. Complete your profile 100% for better visibility
2. Be active daily for optimal algorithm benefits
3. Join 3-5 communities that match your interests
4. Engage meaningfully rather than just connecting
5. Use the mobile app for on-the-go access

Having trouble with any specific feature? Just ask!`;
  }

  // 3. HOW TO LOGIN
  if (
    lowerMessage.includes("how to login") ||
    lowerMessage.includes("how to log in") ||
    lowerMessage.includes("sign in") ||
    lowerMessage.includes("access my account") ||
    lowerMessage.includes("login problem") ||
    lowerMessage.includes("forgot password") ||
    lowerMessage.includes("password reset")
  ) {
    return `**🔐 Eksathi.com Login Guide - Multiple Methods**

**Method 1: Standard Web Login**
1. Go to **https://eksathi.com**
2. Click **"Sign In"** (top right corner)
3. Enter your registered email address
4. Enter your password
5. Click **"Login"**
6. You'll be redirected to your dashboard

**Method 2: Mobile App Login**
1. Download **Eksathi App** from App Store/Play Store
2. Open the application
3. Tap **"Already have an account?"**
4. Enter email and password
5. Enable **"Stay logged in"** if using personal device
6. Tap **"Sign In"**

**Method 3: Social Media Login** (If enabled)
1. On login page, click preferred platform (Google/Facebook)
2. Authorize Eksathi to access basic profile
3. Confirm login permissions
4. You'll be automatically logged in

**🔧 Troubleshooting Login Issues:**

**Problem 1: Forgot Password**
1. Click **"Forgot Password?"** on login page
2. Enter your registered email
3. Check inbox for reset link (check spam folder too)
4. Click link and create new password
5. Login with new credentials

**Problem 2: Account Locked**
1. Wait 15 minutes (automatic security lock)
2. Reset password if necessary
3. Contact support@eksathi.com if persists

**Problem 3: Email Not Recognized**
1. Double-check email spelling
2. Try different email if multiple accounts
3. Contact support for account recovery

**🛡️ Security Recommendations:**
• Use strong, unique password
• Enable Two-Factor Authentication
• Don't use public computers for login
• Log out after using shared devices
• Regularly update password

**🚨 Emergency Access:**
If completely locked out, contact:
📧 support@eksathi.com with subject: "URGENT: Login Issue"`;
  }

  // 4. HOW TO REGISTER/SIGN UP
  if (
    lowerMessage.includes("how to register") ||
    lowerMessage.includes("how to sign up") ||
    lowerMessage.includes("create account") ||
    lowerMessage.includes("new account") ||
    lowerMessage.includes("join eksathi") ||
    lowerMessage.includes("become a member")
  ) {
    return `**📝 Complete Registration Guide for Eksathi.com**

**🎯 Before You Start - Requirements:**
✓ Must be 15+ years old
✓ Valid email address
✓ Internet connection
✓ 5 minutes of time

**Step-by-Step Registration Process:**

**Step 1: Access Registration Page**
• Visit: **https://eksathi.com/auth/register**
• OR Click **"Join Free"** on homepage

**Step 2: Basic Information**
1. **Full Name** (as you want to be identified)
2. **Email Address** (use active email for verification)
3. **Password** (minimum 8 characters, mix of letters, numbers, symbols)
4. **Confirm Password**

**Step 3: Profile Type Selection**
Choose your primary purpose:
• **Personal Use** (making friends, networking)
• **Professional Use** (career networking, business)
• **Community Builder** (creating/managing groups)
• **Student/Educator** (educational purposes)

**Step 4: Interest Selection**
Select 3-5 interest categories:
• Technology • Business • Arts • Sports • Education
• Health • Entertainment • Travel • Food • Gaming
*(These help match you with relevant communities)*

**Step 5: Email Verification**
1. Check your email inbox
2. Open email from **noreply@eksathi.com**
3. Click **"Verify Email"** button
4. You'll be redirected to complete profile

**Step 6: Complete Your Profile** (Highly Recommended)
1. **Profile Picture**: Upload clear photo (increases connections by 70%)
2. **Bio/Introduction**: Write 50+ words about yourself
3. **Location**: Add city/country (optional but helpful)
4. **Interests**: Add specific hobbies/passions
5. **Skills**: List professional/personal skills
6. **Goals**: What you hope to achieve on Eksathi

**✅ Post-Registration Checklist:**
1. ✓ Email verified
2. ✓ Profile picture added
3. ✓ Bio completed
4. ✓ Joined first community
5. ✓ Made first connection

**💡 Registration Tips:**
• Use **real information** for better connections
• **Complete profile 100%** for maximum visibility
• **Verify email immediately** to avoid access issues
• **Download mobile app** for better experience

**🎁 Registration Benefits:**
• **Immediate access** to basic features
• **Free forever** basic account
• **Connect** with 1000+ active users
• **Join** 500+ communities
• **Access** to free resources

Welcome to the Eksathi community! 🌟`;
  }

  // 5. MULTIPLE QUESTIONS IN ONE (Combined)
  if (
    (lowerMessage.includes("what is") && lowerMessage.includes("eksathi") &&
      (lowerMessage.includes("how to") ||
        lowerMessage.includes("login") ||
        lowerMessage.includes("register"))) ||
    lowerMessage.includes("tell me everything") ||
    lowerMessage.includes("complete guide")
  ) {
    return `**🤔 You asked multiple questions about Eksathi.com! Here's a complete overview:**

**1. 📱 WHAT IS EKSATHI.COM?**
Eksathi.com is a community platform connecting people based on shared interests, goals, and values. It's your digital space for meaningful connections, knowledge sharing, and community building.

**2. 🚀 HOW TO USE EKSATHI.COM:**
**Quick Start Guide:**
• **Step 1**: Register with email
• **Step 2**: Complete your profile
• **Step 3**: Explore communities
• **Step 4**: Connect with people
• **Step 5**: Engage in discussions
• **Step 6**: Join/attend events

**3. 🔐 HOW TO LOGIN:**
• Web: eksathi.com → "Sign In" → Email/Password
• Mobile: App → "Login" → Credentials
• Social: Login with Google/Facebook (optional)

**4. 📝 HOW TO REGISTER:**
• Visit eksathi.com/register
• Fill basic info (2 minutes)
• Verify email
• Start connecting!

**🎯 Recommended First Steps:**
1. Register now (it's free!)
2. Complete 100% profile
3. Join 3 interest-based communities
4. Send 5 connection requests
5. Post your first introduction

**💡 Best Practice:**
Start with the mobile app for better user experience and notifications.

**Need help with any specific step? Just ask!**`;
  }

  // ========== SEARCH PATTERNS AFTER INFORMATION ==========

  // Pattern 1: Location-only searches
  const locationOnlyPattern =
    /^(search|find|show|list)\s+(?:institutes|colleges|schools|universities)?\s*(?:in|at|from|near)\s+([a-zA-Z\s]+)$/i;
  const locationMatch = userMessage.match(locationOnlyPattern);

  if (locationMatch) {
    const locationQuery = locationMatch[2] || locationMatch[1];
    if (locationQuery) {
      try {
        return await getSearchResults(locationQuery, true);
      } catch (error) {
        console.error("Error in location search:", error);
        return `**🔍 Location Search Error**\n\nSorry, I couldn't search in that location at the moment.`;
      }
    }
  }

  // Pattern 2: Direct location queries
  const directLocationPattern =
    /^(central delhi|new delhi|south delhi|north delhi|east delhi|west delhi|delhi|mumbai|kolkata|chennai|bangalore|hyderabad|pune|ahmedabad)$/i;
  if (directLocationPattern.test(userMessage.trim().toLowerCase())) {
    const location = userMessage.trim();
    try {
      return await getSearchResults(`institutes in ${location}`, true);
    } catch (error) {
      console.error("Error in direct location search:", error);
    }
  }

  // Pattern 3: "is [username] registered?"
  const isRegisteredPattern = /is\s+([a-zA-Z0-9_\.\-\s]+)\s+registered/i;
  const registeredMatch = userMessage.match(isRegisteredPattern);

  if (registeredMatch) {
    const searchQuery = registeredMatch[1].trim();
    if (searchQuery) {
      try {
        return await getSearchResults(searchQuery);
      } catch (error) {
        console.error("Error in user check:", error);
        return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
      }
    }
  }

  // Pattern 4: "check [search term]" or "find [search term]"
  const checkUserPattern =
    /(check|find|search|lookup|details|status)\s+([a-zA-Z0-9_\.\-\s]+)/i;
  const userMatch = userMessage.match(checkUserPattern);

  if (userMatch) {
    const searchQuery = userMatch[2].trim();
    if (searchQuery && searchQuery.length >= 2) {
      try {
        return await getSearchResults(searchQuery);
      } catch (error) {
        console.error("Error in search:", error);
        return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
      }
    }
  }

  // Pattern 5: "user [search term]"
  const userPattern = /^user\s+([a-zA-Z0-9_\.\-\s]+)$/i;
  const userOnlyMatch = userMessage.match(userPattern);

  if (userOnlyMatch) {
    const searchQuery = userOnlyMatch[1].trim();
    if (searchQuery) {
      try {
        return await getSearchResults(searchQuery);
      } catch (error) {
        console.error("Error in search:", error);
        return `**🔍 Search Error**\n\nSorry, I couldn't check the user at the moment.`;
      }
    }
  }

  // Pattern 6: Direct search term (when user just types the search term)
  const directSearchPattern = /^[a-zA-Z0-9_\.\-\s]{2,100}$/;
  if (directSearchPattern.test(userMessage.trim())) {
    const searchQuery = userMessage.trim();
    const commonWords = [
      "help",
      "eksathi",
      "register",
      "login",
      "about",
      "features",
      "support",
      "hi",
      "hello",
      "what",
      "how",
      "ok",
      "yes",
      "no",
      "thanks",
      "thank",
    ];
    if (!commonWords.includes(searchQuery.toLowerCase())) {
      try {
        return await getSearchResults(searchQuery);
      } catch (error) {
        console.error("Error in search:", error);
        // Continue to other checks
      }
    }
  }

  // Pattern 7: "find user [search term]" or "search user [search term]"
  const findUserPattern = /(find|search)\s+user\s+([a-zA-Z0-9_\.\-\s]+)/i;
  const findMatch = userMessage.match(findUserPattern);

  if (findMatch) {
    const searchQuery = findMatch[2].trim();
    if (searchQuery) {
      try {
        return await getSearchResults(searchQuery);
      } catch (error) {
        console.error("Error in search:", error);
        return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
      }
    }
  }

  // Pattern 8: "check if [search term] is registered"
  const checkIfPattern =
    /check\s+if\s+([a-zA-Z0-9_\.\-\s]+)\s+is\s+registered/i;
  const checkIfMatch = userMessage.match(checkIfPattern);

  if (checkIfMatch) {
    const searchQuery = checkIfMatch[1].trim();
    if (searchQuery) {
      try {
        return await getSearchResults(searchQuery);
      } catch (error) {
        console.error("Error in search:", error);
        return `**🔍 Search Error**\n\nSorry, I couldn't perform the search at the moment.`;
      }
    }
  }

  // Pattern 9: "institute [search term]" or "college [search term]"
  const institutePattern =
    /(institute|college|school|university|academy)\s+([a-zA-Z0-9_\.\-\s]+)/i;
  const instituteMatch = userMessage.match(institutePattern);

  if (instituteMatch) {
    const searchQuery = instituteMatch[2].trim();
    if (searchQuery) {
      try {
        return await getSearchResults(searchQuery, true);
      } catch (error) {
        console.error("Error in institute search:", error);
        return `**🔍 Institute Search Error**\n\nSorry, I couldn't search for institutes at the moment.`;
      }
    }
  }

  // Return null if no specific enhanced response
  return null;
};



module.exports = getEnhancedEksathiResponse;
