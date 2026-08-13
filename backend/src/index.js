import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const port = process.env.PORT || 8000;

connectDB().then(() => {

})


