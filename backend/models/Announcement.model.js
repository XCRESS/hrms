import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Announcement content is required"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User model and want to link it
      // required: true, // Decide if author is strictly required
    },
    // For simplicity, authorName can be stored if not linking deeply
    authorName: {
        type: String, 
    },
    targetAudience: {
      type: String,
      enum: ["all", "employee", "hr", "admin"], // Example audiences
      default: "all",
    },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "published",
    },
    // Optional: Add an expiry date for announcements
    // expiresAt: {
    //   type: Date,
    // }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement; 