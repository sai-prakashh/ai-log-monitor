const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://saiprakash53287_db_user:g74qL9Vb15Qwzi83@cluster0.48b0thz.mongodb.net/fileconverter?retryWrites=true&w=majority");
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error(error);
  }
};

module.exports = connectDB;