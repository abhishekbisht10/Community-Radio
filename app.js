const express = require('express')
const bodyParser = require('body-parser')

const app = express()

app.set('view engine', 'ejs')

app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended:true}))


app.get("/", function(req, res) { 
    res.render("home")
})

app.get("/shows/:id", function(req, res) {
    let show = req.params.id
    res.render("shows", {showId: show})
})

app.get("/podcast", function(req, res) {
    res.render("podcast")
})

app.get("/about", function(req, res) {
    res.render("about")
})

app.post("/contact-form", function(req, res) {
    let name = req.body.name;
    res.redirect("/about")
})

app.listen(3000, function() {
    console.log("Server started at port 3000")
})