/* Local Multer Middleware */

const multer = require("multer");
const slugify = require("slugify");
const { uid } = require("uid");
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const slugOptions = {
  replacement: "-",
  remove: undefined,
  lower: true,
  strict: false,
  locale: "vi",
  trim: true,
};

// Create upload directories
const createUploadFolders = () => {
  const folders = ['tmp', 'uploads/profile', 'uploads/products'];
  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  });
};
createUploadFolders();

// Multer configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "tmp");
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext);
      const slugifiedName = slugify(nameWithoutExt, slugOptions);
      // Format: email-uid-slugifiedname.ext
      const email = req.params.email?.split('@')[0] || 'user';
      cb(null, `${email}-${uid(4)}-${slugifiedName}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Local file save function
function localFileSave(filepath, destinationPath, cb) {
  if (fs.existsSync(filepath)) {
    try {
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFile(filepath, destinationPath, (err) => {
        if (err) {
          console.error("Error copying file:", err);
          cb(false);
        } else {
          console.log("File saved:", destinationPath);
          
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          
          cb({
            success: true,
            filename: path.basename(destinationPath),
            path: destinationPath,
            url: `/${destinationPath.replace(/\\/g, '/')}`,
            size: fs.statSync(destinationPath).size
          });
        }
      });
    } catch (error) {
      console.error("Error in localFileSave:", error);
      cb(false);
    }
  } else {
    console.error("File does not exist:", filepath);
    cb(false);
  }
}

/* Image Size Reducer Middleware */
const ImageReduce = (height, folderName) => {
  return (req, res, next) => {
    // Check if file exists
    if (req?.file?.path && fs.existsSync(req.file.path)) {
      try {
        const imgName = req.file.filename;
        // Create final path: uploads/folderName/filename
        const finalPath = path.join('uploads', folderName, imgName);
        
        Jimp.read(req.file.path, async (err, FileMain) => {
          if (err) {
            console.error("Jimp read error:", err);
            req.file = { location: "" };
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
            next();
          } else {
            try {
              // Resize image
              await FileMain
                .resize(height, Jimp.AUTO)
                .quality(80)
                .writeAsync(req.file.path);
              
              // Save to final destination
              localFileSave(req.file.path, finalPath, (data) => {
                if (data) {
                  req.file = data;
                  // Add to req.body for easier access
                  req.body.profile_pic_url = data.url;
                  req.body.profile_pic_path = data.path;
                } else {
                  req.file = { location: "" };
                }
                next();
              });
            } catch (error) {
              console.error("Error processing image:", error);
              req.file = { location: "" };
              if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
              }
              next();
            }
          }
        });
      } catch (error) {
        console.error("Error in ImageReduce:", error);
        req.file = false;
        next();
      }
    } else {
      req.file = false;
      next();
    }
  };
};

module.exports = {
  upload,
  ImageReduce
};