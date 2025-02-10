// app.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const errorMiddleware = require("./middleware/errorMiddleware");
const morgan = require("morgan");
const logger = require("./utils/logger");

const authRoutes = require("./routes/authRoutes.js");
const fileRoutes = require("./routes/fileRoutes");
const folderRoutes = require("./routes/folderRoutes");
const shareRoutes = require("./routes/sharedRoutes");
const userRoutes = require("./routes/userRoute.js");

dotenv.config();

const app = express();

// Use 'combined' format for detailed logs
app.use(logger); // Logs requests to the terminal

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: true, // Allow cookies if needed
    allowedHeaders: ["Content-Type", "Authorization"], // Include headers your app uses
  })
);

//app.use(uploadFields); // Handle multipart/form-data
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

app.use("/api/auth", authRoutes); // authentication->signUp, SignIn
app.use("/api/user", userRoutes); // user profile n updates
app.use("/api/files", fileRoutes); // files routes
app.use("/api/folders", folderRoutes); // folders routes
app.use("/api/share", shareRoutes); // share routes

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "DigiDrive backend is running!" });
});

app.use(errorMiddleware);

module.exports = app;

/* 
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });
 */
