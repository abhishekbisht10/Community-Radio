const express = require('express');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));


app.get("/", function(req, res) { 
    res.render("home");
});

app.get("/shows/:id", function(req, res) {
    let show = req.params.id;
    res.render("shows", {showId: show});
});

app.get("/podcast", function(req, res) {
    res.render("podcast");
});

app.get("/about", function(req, res) {
    res.render("about");
});

app.post("/about", [
    check("name", "Name must be 4+ characters long").exists().isLength({min: 4}),
    check("email", "Enter a valid e-mail address").isEmail().normalizeEmail()
], function(req, res) {

    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        const alert = errors.array();
        res.render("about", {alert: alert});
    }
    
    else {
    let name = req.body.name;
    let email = req.body.email;
    let message = req.body.message;
    res.redirect("/about");
    }
});

app.listen(3000, function() {
    console.log("Server started at port 3000");
});