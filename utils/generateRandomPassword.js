const  generatePasswordFromEmail = async (email)=> {
  // Validation
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email string is required');
  }
  
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  
  // Extract email prefix (part before @)
  const emailPrefix = email.split('@')[0];
  
  // Get first 4 characters (or less if prefix is shorter)
  const prefixPart = emailPrefix.substring(0, Math.min(4, emailPrefix.length));
  
  // Special characters to choose from
  const specialChars = '!@#$%^&*';
  const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Generate 4 random digits
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // Ensures 4 digits
  
  // Generate random uppercase letter
  const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomUppercase = uppercaseLetters[Math.floor(Math.random() * uppercaseLetters.length)];
  
  // Combine all parts
  const password = `${prefixPart}${randomSpecial}${randomDigits}${randomUppercase}`;
  
  return password;
}

module.exports =  {

    generatePasswordFromEmail
} 