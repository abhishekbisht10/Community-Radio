const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');

let show = [];
let sauce = [];

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));


const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/radioStationDB", {useNewUrlParser: true});

const showsSchema = new mongoose.Schema ({
    code: String,
    name: String,
    description: String
});

const Shows = mongoose.model("Shows", showsSchema);

Shows.find( function(err, shows) {

  if(err) {
    console.log("shows" + err);
  }
  else {
    show = shows;
  }
});

const saucesSchema = new mongoose.Schema ({
    code: String,
    name: String,
    description: String,
    date: String,
    link: String
});

const Sauces = mongoose.model("Sauces", saucesSchema);

Sauces.find( function(err, sauces) {

  if(err) {
    console.log("sauces" + err);
  }
  else {
    sauce = sauces;
  }
});

const formSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String
});

const Form = mongoose.model("Form", formSchema);

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


app.get("/", function(req, res) { 
    res.render("home", {show});
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

app.get("/podcast", function(req, res) {
    res.render("podcast", {show});
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

app.listen(process.env.PORT || 3000, function() {
    console.log("Server started at port 3000");
});