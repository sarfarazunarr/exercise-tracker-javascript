const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');

require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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

let User = mongoose.model('User', userSchema);

let Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', async (_req, res) => {
  res.sendFile(__dirname + '/views/index.html');
  await User.syncIndexes();
  await Exercise.syncIndexes();
});


// Get all users
app.get('/api/users', async function(_req, res) {
  try {
    const users = await User.find({}).exec();

    if (users.length === 0) {
      res.json({ message: 'No any user found!!!' });
    } else {
      console.log('users in database: '.toLocaleUpperCase() + users.length);
      res.json(users);
    }
  } catch (err) {
    console.error(err);
    res.json({ message: 'Getting all users failed due to some error Try Again!' });
  }
});

// Create a new user

app.post('/api/users', function(req, res) {
  const Username = req.body.username;

  let newUser = new User({ username: Username });

  newUser.save()
    .then(user => res.json({ username: user.username, _id: user._id }))
    .catch(err => {
      console.error(err);
      res.json({ message: 'User creation failed!' });
    });
});

// Add a new exercise

app.post('/api/users/:_id/exercises', function(req, res) {
  var userId = req.params._id;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;

  if (!date) {
    date = new Date().toISOString().substring(0, 10);
  }
  
  User.findById(userId)
  .then(userInDb => {
    if (!userInDb) {
      return res.json({ message: 'There are no users with that ID in the database!' });
    }
    
    let newExercise = new Exercise({
      userId: userInDb._id,
      username: userInDb.username,
      description: description,
      duration: parseInt(duration),
      date: date,
    });

    return newExercise.save().then(exercise => res.json({
      username: userInDb.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: userInDb._id,
    }));
  })
  .catch(err => {
    console.error(err);
    res.json({ message: 'Exercise creation failed!' });
  });


});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get('/api/users/:_id/logs', async function(req, res) {
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
    .select('description duration date')
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
  console.log('Your app is listening on port ' + listener.address().port);
});