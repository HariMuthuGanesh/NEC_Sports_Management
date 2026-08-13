import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            process.env.MONGOOSE_URI
        );

        console.log("Connected");
    }
    catch (error) {
        console.log("Database Connection Failed");
        process.exit(1);
    }
}

export default connectDB;