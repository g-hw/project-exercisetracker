const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
});

let User = mongoose.model("User", userSchema);
let Exercise = mongoose.model("Exercise", exerciseSchema);

/*
 * POST
 * Create user
 */
app.post("/api/users", (req, res) => {
  const username = req.body.username;
  let newUser = new User({ username });
  newUser.save((err, user) => {
    if (err) {
      console.error(err);
      res.json({ message: "User creation failed!" });
    }
    res.json({ username: user.username, _id: user._id });
  });
});

/*
 * GET
 * Get all users
 */
app.get("/api/users", (req, res) => {
  User.find({}, function (err, users) {
    if (err) {
      console.error(err);
      res.json({ message: "Getting all users failed!" });
    }
    res.json(users);
  });
});

/*
 * POST
 * Create new exercise
 * @param _id
 */
app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  let { description, duration, date } = req.body;
  if (!date) {
    date = new Date().toISOString().substring(0, 10);
  }

  User.findById(userId, (err, userInDb) => {
    if (err) {
      console.error(err);
      res.json({ message: "No user with ID found!" });
    }
    let newExercise = new Exercise({
      userId: userInDb._id,
      username: userInDb.username,
      description: description,
      duration: parseInt(duration),
      date: date,
    });

    newExercise.save((err, exercise) => {
      if (err) {
        console.error(err);
        res.json({ message: "Exercise creation failed!" });
      }
      res.json({
        username: userInDb.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
        _id: userInDb._id,
      });
    });
  });
});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get("/api/users/:_id/logs", async function (req, res) {
  const userId = req.params._id;
  const from = req.query.from || new Date(0).toISOString().substring(0, 10);
  const to =
    req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
  const limit = Number(req.query.limit) || 0;

  let user = await User.findById(userId).exec();

  let exercises = await Exercise.find({
    userId: userId,
    date: { $gte: from, $lte: to },
  })
    .select("description duration date")
    .limit(limit)
    .exec();

  let parsedDatesLog = exercises.map((exercise) => {
    return {
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    };
  });
  res.json({
    _id: user._id,
    username: user.username,
    count: parsedDatesLog.length,
    log: parsedDatesLog,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
