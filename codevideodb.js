var CodingDB = require("./public/javascripts/database.js")
var OCR = require("./public/javascripts/ocr.js")
var GitHistory = require("./public/javascripts/git_history.js")
const canvas = require('canvas'); // need this for images
const express = require('express'); // handling web routes
const cors = require('cors'); // cross origin requests to allow external sites to use this api

const levenshtein = require('js-levenshtein');

const app = express();
const port = 3000;
// myDB = new CodingDB("./foodNotFood.db");
myDB = new CodingDB("./git_classification2.db");
// myDB = new CodingDB("./techWithTim1.db");
// myDB = new CodingDB("./wordle_polished.db");
//myDB = new CodingDB("./slam.db");
ocr = new OCR();

var directory = '/Users/joeyallen/Downloads/screencap_slam'; 
console.log("DB = " + myDB + "; OCR = " + ocr);


/* e.g. for using git history
if git folder is on Box, need to verify that it's safe to access
"git config --global --add safe.directory C:/Users/thien/Box/project/project"
cd to that directory and run "git prune" to resolve any corrupted files
make sure to comment out myDB, ocr, and log statement above and uncomment the following */
// var userDir = String.raw`/Users/pham/Downloads/new-app`;
// var eventsFile = String.raw`/Users/pham/Documents/GitHub/CodeStoriesUtil/web_data.csv`;
// myDB = new GitHistory(userDir, eventsFile, "pseudoGit");


// body-parser has been incorporated into express, so no need to have a separate thing
app.use(express.urlencoded());
app.use(express.json());
app.use(cors());

const sourceVideoID = 2; // right now, this is hard coded to use the george hotz video, so we'll want to request entries with this ID.

// default behavior for the server is to send back the results
app.get('/', async (req, res) => {
    console.log("requesting data..." + JSON.stringify(req.query));
    var offset = 0;
    var order = "DESC";
    var limit = 20;
    var end = 0;
    if (req.query.offset){
        console.log("offset is " + req.query.offset);
        offset = req.query.offset;
    }
    if (req.query.order){
        console.log("order is " + req.query.order);
        order = req.query.order;
    }
    if (req.query.limit){
        console.log("limit is " + req.query.limit);
        limit = req.query.limit;
    }
    if (req.query.end){
        console.log("end is " + req.query.end);
        end = req.query.end;
    }

    // todo: make it so entries actually pays attention to end.
    const rows = await myDB.getEntries(sourceVideoID, offset, end, order, limit);
    console.log("rows " + rows);
    res.json(rows);
});

// get code in interval
app.get('/intervalCode', async (req, res) => {
    console.log("requesting data..." + JSON.stringify(req.query));
    var begin = 0;
    var end = 0;
    // var order = "ASC";
    if (req.query.begin){
        console.log("begin is " + req.query.begin);
        begin = req.query.begin;
    }
    if (req.query.end){
        console.log("end is " + req.query.end);
        end = req.query.end;
    }

    const rows = await myDB.getCodeInRange(begin, end);
    console.log("rows " + rows);
    res.json(rows);
});


// get code in interval
app.get('/intervalSearches', async (req, res) => {
    console.log("requesting data..." + JSON.stringify(req.query));
    var begin = 0;
    var end = 0;
    // var order = "ASC";
    if (req.query.begin){
        console.log("begin is " + req.query.begin);
        begin = req.query.begin;
    }
    if (req.query.end){
        console.log("end is " + req.query.end);
        end = req.query.end;
    }

    const rows = await myDB.getSearchesInRange(begin, end);
    console.log("rows " + rows);
    res.json(rows);
});


// default behavior for the server is to send back the results
app.get('/eventsList', async (req, res) => {
    console.log("requesting data..." + JSON.stringify(req.query));
    var offset = 0;
    var order = "ASC";
    if (req.query.offset){
        console.log("offset is " + req.query.offset);
        offset = req.query.offset;
    }
    if (req.query.order){
        console.log("order is " + req.query.order);
        order = req.query.order;
    }

    const rows = await myDB.getEventList(sourceVideoID, offset, order);
    console.log("rows " + rows);
    res.json(rows);
});

// get the current image, ocr it and then record results in the db 
async function captureAndRecordCode(directory) {
    var textResult = await ocr.getCodeText(directory);
    console.log( "got text result" );
    var dbResult = await myDB.recordCodeInfo(textResult.codeImage, textResult.codeText);
    console.log( "text result recorded");
}

// get the current image and then record results in the db 
async function captureAndRecordWeb(directory) {
    // this shouldn't be codetext.
    console.log("getting code image...")
    var webImage = ocr.getCodeImage(directory);
    console.log( "got code image: "  + webImage);
    var dbResult = await myDB.recordWebInfo(webImage);
    console.log( "web result recorded");
}

app.post("/newcode", async (req, res, next) => {
    var errors=[]
    // console.log(req)
    if (!req.body.timedurl){
        errors.push("No url specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        timedurl: req.body.timedurl,
        comment : req.body.comment
    }

    var time = req.body.timedurl.substring(req.body.timedurl.indexOf("watch?t=")+ "watch?t=".length, req.body.timedurl.indexOf("&"));

    console.log("insert " + req.body.timedurl + ": " + req.body.comment +  " " + time);
    result = await myDB.newEntry(sourceVideoID, data, time);

    // start the process to get the code image and do text recognition on it.
    // var directory = 'C:/Users/ckelleher/Downloads/screencap_onlineChat'; 
    // taking out the image recognition part for now - just grab the most recent file and record.
    console.log("pre-result: " + result);
    captureAndRecordWeb(directory)
    console.log("post-result: " + result);

    console.log("done " + result);
})

app.post("/newweb", async (req, res, next) => {
    var errors=[]
    // console.log(req)
    if (!req.body.timedurl){
        errors.push("No url specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        timedurl: req.body.timedurl,
        comment : req.body.comment
    }

    var time = req.body.timedurl.substring(req.body.timedurl.indexOf("watch?t=")+ "watch?t=".length, req.body.timedurl.indexOf("&"));

    console.log("insert " + req.body.timedurl + ": " + req.body.comment);
    result = await myDB.newEntry(sourceVideoID, data, time);

    // start the process to get the code image and do text recognition on it.
    // var directory = 'C:/Users/ckelleher/Downloads/screencap_onlineChat'; 
    console.log("pre-result: " + result);
    captureAndRecordWeb(directory)
    console.log("post-result: " + result);

    console.log("done " + result);
})

app.post("/delete", async (req, res, next) => {
    var errors=[]
    // console.log(req)
    if (!req.body.eventID){
        errors.push("No id specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        eventID: req.body.eventID
    }

    result = await myDB.deleteEntry(data.eventID);
    console.log("deleted " + req.body.eventID + " " + result );
})

async function updateCoords(eventID, imgName, coordString) {
    result = await myDB.updateOcrBox(eventID, coordString);
    console.log("updated coordString")
}

app.post ("/updateocrbox", async (req, res, next) => {
    var errors = [];
    if (!req.body.eventID) {
        errors.push("no eventID specified");
    }
    if (!req.body.coords) {
        errors.push("no coords specified");
    }
    if (!req.body.img_file) {
        errors.push("no image name specified");
    }

    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        console.log("ERRORS: " + errors);
        return;
    }

    var data = {
        eventID: req.body.eventID,
        coords: req.body.coords,
        img_file: req.body.img_file
    }

    result = await myDB.updateOcrBox(data.eventID, data.coords);
    console.log("updated coords for" + req.body.eventID );

    console.log("update " + data.img_file, data.coords);

    updateCoords(data.eventID, data.img_file, data.coords);

    console.log("started coord update process")
})

app.post("/updatecodetext", async (req, res, next) => {
    if (!req.body.eventID) {
        errors.push("no eventID specified");
    }
    if (!req.body.code_text) {
        errors.push("no code_text specified");
    }

    var data = {
        eventID: req.body.eventID,
        code_text: req.body.code_text
    }

    result = await myDB.updateCodeText(data.eventID, data.code_text);
});


app.get('/getCodeText', async (req, res) => {
    console.log("requesting code text..." + JSON.stringify(req.query));
    // console.log("string edit distance: " + levenshtein('kitten', 'sitting'));

    var limit = 20;
   
    if (req.query.offset){
        console.log("offset is " + req.query.offset);
    }
    if (req.query.order){
        console.log("order is " + req.query.order);
    }
    if (req.query.limit){
        console.log("limit is " + req.query.limit);
        limit = req.query.limit;
    }

    const rows = await myDB.getCodeText(sourceVideoID, req.query.offset, req.query.order, limit);
    console.log("rows " + rows.length + rows );
    res.json(rows);
});

app.get('/getCommentsInRange', async (req, res) => {
    console.log("requesting comments..." + JSON.stringify(req.query));
   
    if (req.query.startTime){
        console.log("startTime is " + req.query.startTime);
    }
    if (req.query.endTime){
        console.log("order is " + req.query.endTime);
    }

    const rows = await myDB.getCommentsInRange(sourceVideoID, req.query.startTime, req.query.endTime);
    console.log("rows " + rows);
    res.json(rows);
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});



