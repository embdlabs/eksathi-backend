const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create profiles folder if it doesn't exist
const profilesDir = 'uploads/profiles';
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles');
  },
  
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp.ext or just timestamp.ext
    const userId = req.user?.id || Date.now();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    
    // Option 1: Using user ID + timestamp
    cb(null, `${userId}-${timestamp}${ext}`);
    
    // Option 2: Using only timestamp + random number
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer for profile image
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;