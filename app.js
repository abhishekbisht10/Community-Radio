require('dotenv').config();

const express = require('express');
const ejs = require('ejs');
const fs = require('fs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const {check, validationResult} = require('express-validator');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended:true }));
app.use(session({
    secret: 'process.env.SECRET',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB, {useNewUrlParser: true});

const multer = require('multer');
const fileStorageEngine = multer.diskStorage({
    destination: function(req, res, cb) {
        cb(null, "./public/podcasts");
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
    limits: { fileSize: 15000000 }   // 15MB
});
const upload = multer({ storage: fileStorageEngine });

let show = [];                                    // global variables to store shows, category, podcasts.
let podcasts = [];

const showsSchema = new mongoose.Schema ({
    code: String,
    name: String,
    description: String,
    image: String,
    cover: String
});
const Shows = new mongoose.model("Shows", showsSchema);

Shows.find( (err, shows) => show = shows);                   // passing to global variable

const saucesSchema = new mongoose.Schema ({
    code: String,
    name: String,
    description: String,
    date: String,
    link: String
});
const Sauces = new mongoose.model("Sauces", saucesSchema);

const formSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String
});
const Form = new mongoose.model("Form", formSchema);

const podcastSchema = new mongoose.Schema({
    name: String,
    email: String,
    description: String,
    link: String,
    approved: String,
    image: String
});
const Podcast = new mongoose.model("Podcast", podcastSchema);

Podcast.find( {approved: "yes"}, (err, podcast) => podcasts = podcast);         // passing to global variable
 
const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});
adminSchema.plugin(passportLocalMongoose);
const Admin = new mongoose.model("Admin", adminSchema);

passport.use(Admin.createStrategy());
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

function saveForm(name, email, message) {
    const form = new Form({
        name: name,
        email: email,
        message: message
    });
    form.save();
}

function savePodcast(name, email, description, link) {
    const podcast = new Podcast({
        name: name,
        email: email,
        description: description,
        link: link,
        approved: "no",         
        image: "https://ucarecdn.com/aa2c48e2-9fc7-4817-bd1f-90e97590b90e/ts4.png"        // change this to empty
    });
    podcast.save();
}

function clearAudio(filename) {
    fs.unlink(__dirname + "/public/podcasts/" + filename, (err) => {
        if(err) {
            console.log(err);
        }
    });
}

app.get("/", (req, res) => res.render("home", {show, podcasts}));

app.get("/shows", (req, res) => {
    Sauces.find({}, (err, foundSauce) => res.render("shows", {show, sauce: foundSauce}));
});

app.get("/category/:id", (req, res) => {
    Shows.findOne({name: req.params.id}, (err, foundShow) => {
        Sauces.find({code: foundShow.code}, (err, foundSauce) => res.render("category", {show, category: foundShow, sauces: foundSauce}));
    });
});

app.get("/podcast/record", (req, res) => res.render("record", {show}));

app.get("/podcast/upload", (req, res) => res.render("upload", {show}));

app.get("/podcast", (req, res) => {
    Podcast.find( {approved: "yes"}, (err, podcast) => {
        if(!err) {
            res.render("podcast", {show, podcast});
        }
    });
});

app.get("/about", (req, res) => res.render("about", {show}));

app.post("/about", [
    check("name", "Name must be 4+ characters long").exists().isLength({min: 4}),
    check("email", "Enter a valid e-mail address").isEmail().normalizeEmail()
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const alert = errors.array();
        res.render("about", {show, alert});
    } else {
        saveForm(req.body.name, req.body.email, req.body.message);
        res.render("about", {show, feedback: "Thanks for filling the form, we will contact you soon!"});    
    }
});

app.post("/podcast/upload",  upload.single('audio'), [
        check("name", "Name must be 4+ characters long").exists().isLength({min: 4}),
        check("email", "Enter a valid e-mail address").isEmail().normalizeEmail()
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const alert = errors.array();
        clearAudio(req.file.filename);
        res.render("upload", {show, alert});
    } else {
        if(req.file.mimetype == "audio/mp3" || req.file.mimetype == "audio/mpeg") {
            Podcast.find( { approved: "no" }, (err, NotApproved) => {                  // podcast list check
                if(NotApproved.length <= 10) {                      
                    savePodcast(req.body.name, req.body.email, req.body.description, req.file.filename);        // line 127 & 128 changed for now 
                    res.render("upload", {show, feedback: "Thanks for creating the podcast, it will be posted as soon as it gets approved!"});             
                } else {   
                    clearAudio(req.file.filename);     
                    res.render("upload", {show, feedback: "There are too many podcasts to be approved. Please try again later!"});
                }
            });
        } else {
            clearAudio(req.file.filename);
            res.render("upload", {show, alert: "File type must be mp3/mpeg."});
        }
    }
});


app.route("/admin")

.get( (req, res) => {
    res.render("admin/login");
})

.post( (req, res) => {
    const user = new Admin({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if(err) {
            console.log(err);
            res.redirect("/admin");
        } else {
            passport.authenticate("local")(req, res, () => res.redirect("/admin/podcast")); 
        }       
    });   
});

app.route("/admin/podcast")

.get( (req, res) => {
    if(req.isAuthenticated()) {
        Podcast.find({}, (err, podcast) => {
            if(!err) {
                res.render("admin/home", {podcast, user: req.user.username});       
            }
        });
    } else {
        res.redirect("/admin");
    }
})

.post( (req, res) => {
    Podcast.updateOne({_id: req.body.id}, {$set: {approved: req.body.approved}}, () => res.redirect("/admin/podcast"));
});

app.post("/admin/podcast/delete", (req, res) => {
    clearAudio(req.body.audio);
    Podcast.deleteOne({_id: req.body.id}, () => res.redirect("/admin/podcast"));
});

app.post("/logout", (req, res) => req.logout( () => res.redirect("/admin") ));

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started at port 3000");
});