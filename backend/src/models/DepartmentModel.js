import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Department name is required'],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Department code is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    hodName: {
        type: String,
        trim: true
    },
    hodEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    hodPhone: {
        type: String,
        trim: true
    },
    coordinatorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    colorCode: {
        type: String,
        default: '#002b49'
    },
    establishedYear: Number
}, { timestamps: true });

const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
export default Department;
