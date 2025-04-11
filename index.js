import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./utils/db.js";
import cookieParser from "cookie-parser";
//import all routes
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();

const allowedOrigins = ["http://127.0.0.1:5500", process.env.BASE_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
    res.send("Server started!");
  });

// connect to db
db();

// user routes
app.use("/api/v1/users", userRoutes);

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
})