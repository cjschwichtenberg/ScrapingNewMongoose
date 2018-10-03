const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const request = require("request");
const axios = require("axios");
const cheerio = require("cheerio");

const PORT = 3000;

const app = express();

const dbModels = require('./models');

mongoose.connect("mongodb://localhost/scrapeddb", { useNewUrlParser: true });
var db = mongoose.connection;
//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("Mongo DB Connected")
});

app.use(logger("dev"));

app.use(bodyParser.urlencoded({ extended: true }));

console.log("\n***********************************\n" +
            "Grabbing every thread name and link\n" +
            "from reddit's RVA board:" +
            "\n***********************************\n");

request("https://old.reddit.com/r/rva/", function (error, response, html) {
    var $ = cheerio.load(html);
    var results = [];
    $("p.title").each(function(i, element) {
        var title = $(element).text();
        var link = $(element).children().attr("href");
        results.push({
            title: title,
            link: link
        });
    });
    console.log(results);
});

app.use(express.static("public"));

app.get("/scrape", function (req, res) {
    axios.get("https://old.reddit.com/r/rva/").then(function (error, response, html) {
        // var $ = cheerio.load(html);
        var $ = cheerio.load(html);
        // var results = [];
        // var title = $(element).text();
        // var link = $(element).children().attr("href");

        $("p.title").each(function (i, element) {

            var resultsObject = {};

            resultsObject.title = $(this)
                .element.text();

            resultsObject.link = $(this)
                .element.children("a").attr("href");

            dbModels.Article.create(resultsObject).then(function (dbArticle) {
                console.log(resultsObject);
                console.log(dbArticle);
            }).catch(function (err) {
                return res.json(err);
            });
        });
        
        res.send("Scrape Complete");
    });
});

app.get("/articles", function (req, res) {
    dbModels.Article.find({})
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.get("/articles/:id", function (req, res) {
    dbModels.Article.findOne({ _id: req.params.id })
        .populate("note")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.listen(PORT, function () {
    console.log("App running on port" + PORT + "!");
});