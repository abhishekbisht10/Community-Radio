const express = require('express');
const app = express();
const md5 = require('md5');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended:true }));

// multer for file uploads
const multer = require('multer');
const fileStorageEngine = multer.diskStorage({
    destination: function(req, res, cb) {
        cb(null, "./public/podcasts");
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
    limits: { fileSize: 20000000 }   // 20mb
});
const upload = multer({ storage: fileStorageEngine });

let show = [];
let sauce = [];                                     // global variables to store shows, category, podcasts.
let podcasts = [];


const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/radioStationDB", {useNewUrlParser: true});

const showsSchema = new mongoose.Schema ({
    code: String,
    name: String,
    description: String,
    image: String,
    cover: String
});

const Shows = new mongoose.model("Shows", showsSchema);

Shows.find( function(err, shows) {

  if(err) {
    console.log("shows" + err);
  }
  else {
    show = shows;                   // passing to global variable
  }
});

const saucesSchema = new mongoose.Schema ({
    code: String,
    name: String,
    description: String,
    date: String,
    link: String
});

const Sauces = new mongoose.model("Sauces", saucesSchema);

Sauces.find( function(err, sauces) {

  if(err) {
    console.log("sauces" + err);
  }
  else {
    sauce = sauces;                 // passing to global variable
  }
});

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

Podcast.find( {approved: "yes"}, function(err, podcast) {
    if(!err) {
        podcasts = podcast;         // passing to global variable
    }
});

const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Admin = new mongoose.model("Admin", adminSchema);

function getSauce(code) {

    let sauces = [];

    sauce.forEach( function(element) {
        if(element.code === code) {
            sauces.push(element);
        }
    });

    return sauces;
}

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
        image: "ts4.png"        // change this to empty
    });

    podcast.save();
}

app.get("/", function(req, res) { 
    res.render("home", {show, podcasts});
});

app.get("/shows", function(req, res) {
    res.render("shows", {show, sauce});
});

app.get("/category/:id", function(req, res) {
    let category = [];
    let sauces = [];

    show.forEach( function(element) {
        if(element.name === req.params.id) {
            category = element;                       
            sauces = getSauce(element.code);
        }
    });

    res.render("category", {show, category, sauces});
});

app.get("/podcast/record", function(req, res) {
    res.render("record", {show});
});

app.get("/podcast/upload", function(req, res) {
    res.render("upload", {show});
});

app.get("/podcast", function(req, res) {

    Podcast.find( {approved: "yes"}, function(err, podcast) {
        if(!err) {
            res.render("podcast", {show, podcast});
        }
    });
});

app.get("/about", function(req, res) {
    res.render("about", {show});
});

app.post("/about", [
    check("name", "Name must be 4+ characters long").exists().isLength({min: 4}),
    check("email", "Enter a valid e-mail address").isEmail().normalizeEmail()
], function(req, res) {

    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        const alert = errors.array();
        res.render("about", {show, alert});
    }
    
    else {
        saveForm(req.body.name, req.body.email, req.body.message);
        res.render("about", {show, feedback: "Thanks for filling the form, we will contact you soon!"});    
    }
});

app.post("/podcast/upload", upload.single('audio'), [
        check("name", "Name must be 4+ characters long").exists().isLength({min: 4}),
        check("email", "Enter a valid e-mail address").isEmail().normalizeEmail()
    ], function(req, res) {

    const errors = validationResult(req);

    if(!errors.isEmpty()) {

        const alert = errors.array();
        res.render("upload", {show, alert});
        
    } else {

        if(req.file.mimetype == "audio/mp3" || req.file.mimetype == "audio/mpeg") {

            Podcast.find( { approved: "no" }, function(err, podcast) {                  // podcast list check

                if(podcast.length <= 10) {

                    savePodcast(req.body.name, req.body.email, req.body.description, req.file.filename);        // line 127 & 128 changed for now 
                    res.render("upload", {show, feedback: "Thanks for creating the podcast, it will be posted as soon as it gets approved!"});      
                
                } else {
                    
                    res.render("upload", {show, feedback: "There are too many podcasts to be approved. Please try again later!"});
                }
            });
            
        } else {
            res.render("upload", {show, alert: "File type must be mp3/mpeg."});
        }
    }
       
});


app.route("/admin")

.get( function(req, res) {
    res.render("admin/login");
})

.post( function(req, res) {
    let user = req.body.username;
    let pass = req.body.password;
    Admin.findOne({username: user}, function(err, foundAdmin) {
        if(!err) {
            if(foundAdmin.password === md5(pass)) {
                Podcast.find( {}, function(err, podcast) {
                    if(!err) {
                        res.render("admin/home", {podcast});        // here comes next step
                    }
                });
            } else {
                res.render("admin/login", {alert: "Incorrect username or password"});
            }
        }
    });
});

app.post("/admin/podcast", function(req, res) {
    if(req.body.approved === "yes") {
        Podcast.updateOne({email: req.body.email, link: req.body.link}, {$set: {approved: "yes"}}, function(err) {
            Podcast.find( {}, function(err, podcast) {
                if(!err) {
                    res.render("admin/home", {podcast});        // here comes next step
                }
            });
        });
    } else if(req.body.approved === "no") {
        Podcast.updateOne({email: req.body.email, link: req.body.link}, {$set: {approved: "no"}}, function(err) {
            Podcast.find( {}, function(err, podcast) {
                if(!err) {
                    res.render("admin/home", {podcast});        // here comes next step
                }
            });
        });
    }
});

app.listen(process.env.PORT || 3000, function() {
    console.log("Server started at port 3000");
});