import mongoose from 'mongoose';

const MedicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name for this medicine.'],
      trim: true,
    },
    formula: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Please specify the category.'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Please specify the current stock quantity.'],
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      required: [true, 'Please specify the low stock alert threshold.'],
      default: 5,
      min: [0, 'Threshold cannot be negative'],
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// In development, always delete the cached model before re-registering.
// This ensures schema changes (like new fields) are picked up on hot-reload
// without requiring a full server restart.
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models['Medicine'];
}

export default mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);
