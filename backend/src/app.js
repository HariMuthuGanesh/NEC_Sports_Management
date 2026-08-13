import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.route("/", (req, res) => {
    res.send("SMS Running");
})

export default app;
