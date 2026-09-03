import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Venue name is required'],
        unique: true,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    capacity: Number,
    surfaceType: {
        type: String,
        enum: ['Grass', 'Synthetic', 'Wooden', 'Clay', 'Concrete']
    },
    hasFloodlights: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Available', 'Maintenance', 'Booked'],
        default: 'Available'
    },
    inchargeUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Venue = mongoose.models.Venue || mongoose.model('Venue', venueSchema);
export default Venue;
