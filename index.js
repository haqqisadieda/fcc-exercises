const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (err) => {
    console.log(`MongoDB connection error : ${err}`);
});

db.once('open', () => {
    console.log('MongoDB connected!');
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
    },
});

const exerciseSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    date: {
        type: Date,
    },
    duration: {
        type: Number,
    },
    description: {
        type: String,
    },
});

const logSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    count: {
        type: Number,
    },
    log: {
        type: Array,
    },
});

const userInfo = mongoose.model('userInfo', userSchema);
const exerciseInfo = mongoose.model('exerciseInfo', exerciseSchema);
const logInfo = mongoose.model('logInfo', logSchema);

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
    userInfo.find({ username: req.body.username }, (err, data) => {
        if (err) return console.error(err);
        if (data.length === 0) {
            const userData = new userInfo({
                username: req.body.username,
            });

            userData.save((err, data) => {
                if (err) return console.error(err);
                res.json({ _id: data.id, username: data.username });
            });
        } else {
            res.send('Username Already Exists');
        }
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {
    let idJson = { id: req.params._id };
    let checkedDate = new Date(req.body.date);
    let idToCheck = idJson.id;

    let noDateHandler = () => {
        if (checkedDate instanceof Date && !isNaN(checkedDate)) {
            return checkedDate;
        } else {
            return (checkedDate = new Date());
        }
    };

    userInfo.findById(idToCheck, (err, data) => {
        noDateHandler(checkedDate);
        if (err) return console.error(err);
        const exerciseData = new exerciseInfo({
            username: data.username,
            description: req.body.description,
            duration: req.body.duration,
            date: checkedDate.toDateString(),
        });

        exerciseData.save((err, data) => {
            if (err) return console.log(err);
            res.json({
                _id: idToCheck,
                username: data.username,
                description: data.description,
                duration: data.duration,
                date: data.date.toDateString(),
            });
        });
    });
});

app.get('/api/users/:_id/logs', (req, res) => {
    const { from, to, limit } = req.query;
    let idJson = { id: req.params._id };
    let idToCheck = idJson.id;

    userInfo.findById(idToCheck, (err, data) => {
        let query = {
            username: data.username,
        };
        if (from !== undefined && to === undefined) {
            query.date = { $gte: new Date(from).getDate() - 1 };
        } else if (to !== undefined && from === undefined) {
            query.date = { $lte: new Date(to) };
        } else if (from !== undefined && to !== undefined) {
            query.date = { $gte: new Date(from), $lte: new Date(to) };
        }

        let limitChecker = (limit) => {
            let maxLimit = 100;
            if (limit) {
                return limit;
            } else {
                return maxLimit;
            }
        };

        if (err) return console.error(err);

        exerciseInfo.find(
            query,
            null,
            { limit: limitChecker(+limit) },
            (err, docs) => {
                let loggedArray = [];
                if (err) return console.error(err);
                let documents = docs;
                loggedArray = documents.map((item) => {
                    return {
                        description: item.description,
                        duration: item.duration,
                        date: item.date.toDateString(),
                    };
                });

                const logData = new logInfo({
                    username: data.username,
                    count: loggedArray.length,
                    log: loggedArray,
                });

                logData.save((err, data) => {
                    if (err) return console.error(err);
                    if (from && !to) {
                        res.json({
                            _id: idToCheck,
                            username: data.username,
                            from: new Date(from).toDateString(),
                            count: data.count,
                            log: loggedArray,
                        });
                    } else if (to && !from) {
                        res.json({
                            _id: idToCheck,
                            username: data.username,
                            to: new Date(to).toDateString(),
                            count: data.count,
                            log: loggedArray,
                        });
                    } else {
                        res.json({
                            _id: idToCheck,
                            username: data.username,
                            from: new Date(from).toDateString(),
                            to: new Date(to).toDateString(),
                            count: data.count,
                            log: loggedArray,
                        });
                    }
                });
            }
        );
    });
});

app.get('/api/users', (rew, res) => {
    userInfo.find({}, (err, data) => {
        if (err) return console.error(err);
        res.json(data);
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
