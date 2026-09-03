import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'User/Student ID is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    password: {
        type: String,
        minlength: 6
    },
    authProvider: {
        type: String,
        enum: ['LOCAL', 'GOOGLE'],
        default: 'LOCAL'
    },
    role: {
        type: String,
        enum: [
            'Director of Physical Education',
            'Department Sports Coordinator',
            'Student Athlete',
            'Public Guest Portal'
        ],
        default: 'Student Athlete'
    },
    department: {
        type: String,
        default: 'CSE'
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    }
}, { timestamps: true });

// Pre-save hook to hash password securely with bcrypt salt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare candidate password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
