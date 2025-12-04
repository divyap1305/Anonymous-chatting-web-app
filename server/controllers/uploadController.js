const multer = require("multer");
const path = require("path");
const Message = require("../models/Message");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
  const allowedFileTypes = [
    "application/pdf", 
    "application/msword", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain"
  ];
  
  const allAllowedTypes = [...allowedImageTypes, ...allowedFileTypes];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload and send message endpoint
const uploadAndSendMessage = async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      files: req.files ? req.files.length : 0,
      user: req.user?.id
    });

    const { text, roomId = "superpaac-group" } = req.body;
    const files = req.files;
    const user = req.user;

    // Validate that we have either text or files
    if ((!text || text.trim() === "") && (!files || files.length === 0)) {
      return res.status(400).json({ message: "Message must contain text or attachments" });
    }

    // Process attachments
    const attachments = files ? files.map(file => {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const isImage = file.mimetype.startsWith('image/');
      
      console.log('Processing file:', file.filename, file.mimetype, file.size);
      
      return {
        url: `${baseUrl}/uploads/${file.filename}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: isImage ? 'image' : 'file'
      };
    }) : [];

    console.log('Creating message with attachments:', attachments.length);

    // Set default text for file-only messages
    let messageText = "";
    if (text && text.trim() !== "") {
      messageText = text.trim();
    } else if (attachments.length > 0) {
      messageText = `📎 ${attachments.length} file${attachments.length > 1 ? 's' : ''} shared`;
    } else {
      messageText = ""; // This shouldn't happen due to earlier validation
    }

    console.log('Text processing:', { originalText: text, trimmed: text?.trim(), messageText, hasAttachments: attachments.length > 0 });

    // Create message
    const message = await Message.create({
      text: messageText,
      sender: user._id,
      senderRole: user.role,
      attachments
    });

    // Populate sender info
    await message.populate("sender", "name email role");

    // Emit via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("newMessage", message);
    }

    return res.status(201).json({
      message: "Message with attachments created",
      data: message
    });

  } catch (err) {
    console.error("Upload message error:", err.message);
    return res.status(500).json({ message: "Server error creating message with attachments" });
  }
};

module.exports = {
  upload,
  uploadAndSendMessage
};