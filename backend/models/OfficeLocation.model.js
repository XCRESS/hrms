import mongoose from "mongoose";

const officeLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    radius: {
      type: Number,
      default: 100,
      min: 50,
      max: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

officeLocationSchema.index({
  "coordinates.latitude": 1,
  "coordinates.longitude": 1,
});
officeLocationSchema.index({ isActive: 1 });

const OfficeLocation = mongoose.model(
  "OfficeLocation",
  officeLocationSchema
);

export default OfficeLocation;




