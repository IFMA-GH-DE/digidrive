const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config(); //

//ocnstructing URL for
const mongodb_connection_string = () => {
  const { DB_CLUSTER, DB_NAME, DB_USER, DB_PSWD } = process.env; // ✅ Correct way
  return `mongodb+srv://${DB_USER}:${DB_PSWD}@${DB_CLUSTER}.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;
};

//Function to connect to Mongodb
const mongodb_connection = async () => {
  //Establish database connection
  try {
    const connection_string = mongodb_connection_string();
    await mongoose.connect(connection_string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB", connection_string);
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // Exit process if DB connection fails
  }
};

module.exports = {
  mongodb_connection,
  mongodb_connection_string,
};
