import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectToDB } from "./model/db.js";
import authRoute from "./routes/authroute.js";

connectToDB();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (req, res) => {
    res.send("Hello World")
})

app.use("/api/auth", authRoute);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});