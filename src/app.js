import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
const capacity = "16kb";
app.use(express.json({limit: capacity}));
app.use(express.urlencoded({extended: true, limit: capacity}));
app.use(express.static("public"));
app.use(cookieParser());


// Router Import
import userRouter from "./Routes/user.routes.js"

// Routes Decleration
app.use("/api/v1/users", userRouter);
// http://localhose:8000/api/vi/users/reginster

export default app;