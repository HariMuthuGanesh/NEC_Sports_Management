import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    registerNumber: {
        type: String,
        required: [true, 'Register number is required'],
        unique: true,
        trim: true,
        index: true
    },
    sixteenDigitRegNo: {
        type: String,
        trim: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
        index: true
    },
    course: {
        type: String,
        default: 'B.E'
    },
    batch: Number,
    semester: String,
    section: String,
    dateOfJoining: Date,
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Transgender']
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    },
    religion: {
        type: String,
        enum: ['Hindu', 'Muslim', 'Christian', 'Others']
    },
    caste: String,
    community: String,
    motherTongue: String,
    nationality: String,
    identificationMark: String,
    aadharCardNo: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    studentType: {
        type: String,
        enum: ['Day-Scholar', 'Hosteller']
    },
    seatType: {
        type: String,
        enum: ['Counselling', 'Management']
    },
    admissionQuota: String,
    lateralEntry: {
        type: String,
        enum: ['Yes', 'No']
    },
    firstGraduate: {
        type: String,
        enum: ['Yes', 'No']
    },
    personalEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    personalPhone: String,
    parentsPhone: String,
    doorNo: String,
    street: String,
    city: String,
    pincode: String,
    districtID: Number,
    stateID: Number,
    countryID: Number,
    studentDistrict: String,
    studentState: String,
    presentAddress: String,
    permanentAddress: String,
    address: String,
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tutorEmail: String,
    companyId: Number,
    extracurricularID: Number,
    umisNumber: String,
    skillrackProfile: String,
    pending: {
        type: Boolean,
        default: true
    },
    tutorApprovalStatus: {
        type: Boolean,
        default: false
    },
    approvedAt: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
export default Student;
