const cp = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class GitHistory {

    
    constructor(gitFolder, eventsFile, addlWebDevDataFile, pseudoGit) {
        this.gitFolder = gitFolder;
        this.eventsFile = eventsFile;
        this.addlWebDevDataFile = addlWebDevDataFile;

        this.exec = util.promisify(cp.exec);
        this.readFile = util.promisify(fs.readFile);

        this.pseudoGitCmd = "";

        if(pseudoGit == "pseudoGit") {
            this.pseudoGitCmd = "--git-dir=codeHistories.git --work-tree=.";
        }

        this.gitData = this.constructGitData();

        let dbFile = "./gitData.db";

        // if db file exists, delete it
        if (fs.existsSync(dbFile)) {
            try {
                fs.unlinkSync(dbFile);
                console.log("Delete File successfully.");
            } catch (error) {
                console.log(error);
            }
        }

        // create new db file
        console.log("creating new db file");
        this.db = new sqlite3.Database(dbFile);
        console.log("db file created");
        this.db.run = util.promisify(this.db.run);

        // create table
        this.db.run(`CREATE TABLE IF NOT EXISTS CodingEvents (
            eventID INTEGER PRIMARY KEY,
            videoID INTEGER,
            timed_url VARCHAR(255),
            time INTEGER,
            img_file VARCHAR(255),
            text_file VARCHAR(255),
            notes VARCHAR(255),
            code_text TEXT,
            coords VARCHAR(255)
        );`).then(() => {
            console.log("Table created!");
        }).catch((err) => {
            console.log("ERROR: " + err);
        });

        // this.exportToJSON();
        this.exportToDB();
    }

    async getEntries(sourceVideoID, offset, end, order, limit) {
        console.log("interval " + offset + " - " + end);
        try {
            let gitData = await this.gitData;
            let rows = [];
            if(end == 0){
                // filter first 20 events
                rows = gitData.filter(event => event.time >= offset);
            } else {
                // filter events between offset and end
                rows = gitData.filter(event => event.time >= offset && event.time <= end);
            }

            if(order == 'DESC') {
                rows = rows.reverse();
            }

            rows = rows.slice(0, limit);
            console.log('returning entries...');
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getEventList(sourceVideoID, offset, order) {
        try {
            let gitData = await this.gitData;

            let selectedEvents = gitData.filter(event => event.time >= offset);
            if(order == 'DESC') {
                selectedEvents = selectedEvents.reverse();
            }

            // return only time, notes, and img_file from gitData
            let rows = [];
            for (let i = 0; i < selectedEvents.length; i++) {
                let selectedEvent = selectedEvents[i];
                let row = {};
                row.time = selectedEvent.time;
                row.notes = selectedEvent.notes;
                row.img_file = selectedEvent.img_file;
                rows.push(row);
            }
            
            console.log('returning entries...');
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getCodeText(sourceVideoID, offset, order, limit) {
        console.log("offset " + offset);
        console.log("order " + order);
        console.log("limit " + limit);

        try {
            let gitData = await this.gitData;

            // filter out events where code text is not null
            let selectedEvents = gitData.filter(event => event.code_text !== null);
            selectedEvents = selectedEvents.filter(event => event.time >= offset);
            if(order == 'DESC') {
                selectedEvents.reverse();
            }
            selectedEvents = selectedEvents.slice(0, limit);

            // make json object containing the following fields: id, time, notes, code_text
            let rows = [];
            for (let i = 0; i < selectedEvents.length; i++) {
                let selectedEvent = selectedEvents[i];
                let row = {};
                row.id = selectedEvent.id;
                row.time = selectedEvent.time;
                row.notes = selectedEvent.notes;
                row.code_text = selectedEvent.code_text;
                rows.push(row);
            }

            console.log('returning entries...');
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getCommentsInRange(sourceVideoID, startTime, endTime) {
        return ("ERROR: No comments recorded")
    }

    async getCodeInRange(startTime, endTime) {
        try{
            let gitData = await this.gitData;
            let selectedEvents = gitData.filter(event => event.code_text !== null);
            selectedEvents = selectedEvents.filter(event => event.time >= startTime && event.time <= endTime);
            // return only id, time, notes and code_text from gitData
            let rows = [];
            for (let i = 0; i < selectedEvents.length; i++) {
                let selectedEvent = selectedEvents[i];
                let row = {};
                row.id = selectedEvent.id;
                row.time = selectedEvent.time;
                row.notes = selectedEvent.notes;
                row.code_text = selectedEvent.code_text;
                rows.push(row);
            }
            console.log('returning entries...');
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getSearchesInRange(startTime, endTime) {
        try{
            let gitData = await this.gitData;
            let selectedEvents = gitData.filter(event => event.code_text === null);
            selectedEvents = selectedEvents.filter(event => !event.notes.startsWith("commit:"));

            // if end time <= 0, then return all events (mostly for accessing searchEvts in CodeStoriesViz)
            if(endTime <= 0) {
                selectedEvents = selectedEvents.filter(event => event.time >= startTime);
            } else {
                let smallerTime = Math.min(startTime, endTime);
                let largerTime = Math.max(startTime, endTime);
                selectedEvents = selectedEvents.filter(event => event.time >= smallerTime && event.time <= largerTime);
            }

            // return only id, time, notes and img_file from gitData
            let rows = [];
            for (let i = 0; i < selectedEvents.length; i++) {
                let selectedEvent = selectedEvents[i];
                let row = {};
                row.id = selectedEvent.id;
                row.time = selectedEvent.time;
                row.notes = selectedEvent.notes;
                row.img_file = selectedEvent.img_file;
                rows.push(row);
            }
            console.log('returning entries...');
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }


    async newEntry(sourceVideoID, data, time) {
        return ("ERROR: can't add entries to git history")
    }

    async deleteEntry(eventID) {
       return ("ERROR: can't modify git history")
    }
  
    async getMaxEventID() {     
        return ("ERROR: not needed" );
    }

    async recordCodeInfo(codeImage, codeText) {  
        return ("ERROR: no recording to git history ");
    }

    async recordWebInfo(webImage) {
        return ("ERROR: no recording to git history ");
    }

    async updateOcrBox(eventID, coords) {
        return ("ERROR: no recording to git history ");
    }

    async updateCodeText(eventID, code_text) {
        return ("ERROR: no recording to git history ");
    }

    async constructGitData() {
        try {
            let events = await this.combineWebEventsAndCommits();
            let gitData = [];
            // console.log(events);

            // make json object containing the following fields: id, timed_url, time, notes, img_file, code_text, coords
            for (let i = 0; i < events.length; i++) {
                let event = events[i];
                let entry = {};
                entry.id = i + 1;
                entry.timed_url = event.timed_url;
                entry.time = event.time;
                entry.notes = event.action + ": " + event.info + ";"; // combine action and info
                entry.img_file = event.img_file;

                // if event action is "code" commit, then get code text
                if (event.action == "code" || event.action == "output") {
                    let id = event.commitId;
                    let hashObj = this.hashObjsList.find(hashObj => hashObj.commitId == id);

                    let excludeList = ['.png', '.jpg', '.jpeg', '.gif', '.mp4', 
                                        '.mov', '.avi', '.mpg', '.mpeg', '.wmv', 
                                        '.flv', '.mkv', '.webm', '.DS_Store', '.otf', 
                                        '.eot', '.svg', '.ttf', '.woff', '.woff2',
                                        '.pyc', '.sqlite3', '.db', '.pdf', '.ico', '.DS_Store'];

                    let res = excludeList.filter((ext) => event.info.includes(ext));
                    if (res.length > 0) {
                        // these files contain non-text data
                        entry.code_text = null;
                    } else {
                        // event.info contains the filename that was changed
                        entry.code_text = await this.getCodeTextHelper(hashObj.hash, event.info, this.gitFolder);
                        
                        if(entry.code_text){
                            if(entry.code_text.stderr !== "") {
                                entry.code_text = entry.code_text.stderr.toString();
                            } else {
                                entry.code_text = entry.code_text.stdout.toString();
                            }
                        }
                        // console.log(entry.code_text);
                    }
                    entry.timed_url = null;
                    entry.img_file = null;
                } else {
                    if(event.img_file){
                        if(event.img_file.includes("\r")) {
                            entry.img_file = entry.img_file.replace("\r", "");
                        }
                    }
                    entry.code_text = null;
                }

                entry.coords = null;
                // console.log(i, event.info);
                gitData.push(entry);
            }

            // if webDevData is not empty, then add it to gitData
            let addlWebDevData = await this.getAddlWebDevData(this.addlWebDevDataFile);

            if(addlWebDevData.length > 0) {
                for (let i = 0; i < addlWebDevData.length; i++) {
                    let entry = addlWebDevData[i];
                    entry.id = gitData.length + 1;
                    gitData.push(entry);
                }

                // sort gitData by time
                gitData.sort((a, b) => a.time - b.time);

                // reassign id
                for (let i = 0; i < gitData.length; i++) {
                    gitData[i].id = i + 1;
                }
            }

            //offset time
            let offset = gitData[0].time;
            for (let i = 0; i < gitData.length; i++) {
                gitData[i].time = gitData[i].time - offset;
            }

            console.log('Git data constructed!');
            return gitData;
        } catch (err) {
            console.log("ERROR: " + err);
        }
    }
    
    async combineWebEventsAndCommits() {
        try {
            this.hashObjsList = await this.constructHashObjsList(this.gitFolder);
            this.eventsList = await this.constructEventsList(this.eventsFile);

            if(this.eventsList.length > 0 && this.hashObjsList.length > 0) {
                // combine and sort the time of events and commits
                let combinedTimeList = [];
                for (let i = 0; i < this.eventsList.length; i++) {
                    combinedTimeList.push(this.eventsList[i].time);
                }
                for (let i = 0; i < this.hashObjsList.length; i++) {
                    combinedTimeList.push(this.hashObjsList[i].time);
                }
                combinedTimeList.sort((a, b) => a - b);

                // remake the eventsList with the combined time list
                let newEventsList = [];
                for (let i = 0; i < combinedTimeList.length; i++) {
                    // filter out the events that have the same time as the combined time list
                    let filteredEvents = this.eventsList.filter(event => event.time == combinedTimeList[i]);

                    // either [] or [event]
                    // these are web events so they are unique
                    if(filteredEvents.length > 0) {
                        newEventsList.push(filteredEvents[0]);
                    }

                    // filter out the commits that have the same time as the combined time list
                    let filteredHashObjs = this.hashObjsList.filter(hashObj => hashObj.time == combinedTimeList[i]);
                    
                    if (filteredHashObjs.length > 0) {
                        // for each file changed, add a new event
                        for (let j = 0; j < filteredHashObjs[0].filesChanged.length; j++) {
                            let fileChanged = filteredHashObjs[0].filesChanged[j];
                            let action = "code";
                            if(fileChanged == "output.txt") {
                                action = "output";
                            }
                            let newEvent = {time: filteredHashObjs[0].time, action: action, info: fileChanged, commitId: filteredHashObjs[0].commitId};
                            newEventsList.push(newEvent);
                        }
                    }
                }
                console.log('Combined web data events and commits');
                return newEventsList;
            }
        } catch (err) {
            console.log("ERROR: " + err);
        }
    }
    
    async constructHashObjsList(gitFolder) {
        try{
            let gitLogAllHashes = `git ${this.pseudoGitCmd} log --pretty=format:%h`;
            let hashes = await this.exec(gitLogAllHashes, {cwd: gitFolder});
            hashes = hashes.stdout.toString().split('\n');
            hashes = hashes.filter(hash => hash !== '');
            hashes.reverse();

            let hashObjsList = [];

            for (let i = 0; i < hashes.length; i++) {
                // make an array of objects where each object contains the hash an the commit time
                let hash = hashes[i];
                let gitLogHash = `git ${this.pseudoGitCmd} log -1 --pretty=%B ${hash}`;
                let commitMessage = await this.exec(gitLogHash, {cwd: gitFolder});

                if(commitMessage.stdout) {
                    commitMessage = commitMessage.stdout.toString();
                } else {
                    commitMessage = null;
                }

                let gitLogTime = `git ${this.pseudoGitCmd} log -1 --pretty=%ct ${hash}`;
                let time = await this.exec(gitLogTime, {cwd: gitFolder});
                time = parseInt(time.stdout.toString());
                // console.log(time);

                // get files changed
                let filesChanged = await this.getFilesChangedInCommit(hash, gitFolder);

                hashObjsList.push({hash: hash, time: time, commitId: i+1, filesChanged: filesChanged});
            }
            console.log('Hash objects list constructed!');
            return hashObjsList;
        } catch (err) {
            console.log("ERROR: " + err);
        }
    }

    async constructEventsList(eventsFile) {
        try {
            let events = await this.readFile(eventsFile, 'utf8');
            events = await this.csvJSON(events);
            console.log('Events list constructed!');
            return events;
        } catch (err) {
            console.log("ERROR: " + err);
            return [];
        }
    }

    // https://stackoverflow.com/questions/27979002/convert-csv-data-into-json-format-using-javascript
    async csvJSON(csv){
        var lines=csv.split("\n");
        var result = [];
      
        // NOTE: If your columns contain commas in their values, you'll need
        // to deal with those before doing the next step 
        // (you might convert them to &&& or something, then covert them back later)
        // jsfiddle showing the issue https://jsfiddle.net/
        var headers=lines[0].split("\t");
    
        // delimit empty space
        for (let i = 0; i < headers.length; i++) {
            headers[i] = headers[i].trim();
        }
      
        for(var i=1;i<lines.length;i++){
            var obj = {};
            var currentline=lines[i].split("\t"); // split on tab because there might be , ; : etc. in the info
      
            for(var j=0;j<headers.length;j++){
                obj[headers[j]] = currentline[j];
            }
      
            result.push(obj);
      
        }
    
        // delete all title keys
        if(headers.includes('title')) {
            for (let i = 0; i < result.length; i++) {
                // if title is undefined, delete the whole object
                if (result[i].title == undefined) {
                    result.splice(i, 1);
                }
                // if title is not undefined, delete the title key
                else {
                    delete result[i].title;
                }
            }
        }
      
        return result; //JavaScript object
    }

    async getCodeTextHelper(hash, file, gitFolder) {
        try {
            // const { spawn } = require('node:child_process');
            // let codeText = spawn('git', ['show', `${hash}:"${file}""`], {cwd: gitFolder, shell: true, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, stdio: 'pipe'});
            let gitShowFileContent = `git ${this.pseudoGitCmd} show ${hash}:"${file}"`;
            let codeText = await this.exec(gitShowFileContent, {cwd: gitFolder, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024});
            return codeText;
        } catch (error) {
            console.log("ERROR: " + error);
            return null;
        }
    }

    async getFilesChangedInCommit(hash, gitFolder) {
        try {
            let gitShowFilesChange = `git ${this.pseudoGitCmd} show --name-only --pretty="" ${hash}`;
            let filesChanged = await this.exec(gitShowFilesChange, {cwd: gitFolder});
            filesChanged = filesChanged.stdout.toString().split('\n');
            filesChanged = filesChanged.filter(file => file !== '');
            // filesChanged = filesChanged.filter(file => file.endsWith('.py') || file == 'output.txt');
            // console.log(filesChanged);
            return filesChanged;
        } catch (error) {
            console.log("ERROR: " + err);
            return null;
        }
    }

    async getAddlWebDevData(addlWebDevDataDB) {
        try {
            if(fs.existsSync(addlWebDevDataDB)) {
                let db = new sqlite3.Database(addlWebDevDataDB);
                db.run = util.promisify(db.run);
                db.all = util.promisify(db.all);

                let sql = `SELECT * FROM addlWebDevData`;
                let addlWebDevData = db.all(sql);

                db.close();
                console.log('Additional web dev data database found!');
                return addlWebDevData;
            }
            else {
                console.log('No web dev data database found!');
                return [];
            }
        } catch (err) {
            console.log("ERROR: " + err);
            return [];
        }
    }

    async exportToJSON() {
        try {
            let json = JSON.stringify(await this.gitData);
            fs.writeFile('gitData.json', json, 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing JSON Object to File.");
                    return console.log(err);
                }
            });
            console.log('JSON file exported!');
        } catch (err) {
            console.log("ERROR: " + err);
        }
    }

    async exportToDB() {
        try {
            let gitData = await this.gitData;

            // insert data
            let i = 0;
            while (i < gitData.length) {
                let event = gitData[i];
                let eventID = event.id;
                let videoID = 2;
                let timed_url = event.timed_url;
                let time = event.time;
                let img_file = event.img_file;
                let text_file = null;
                let notes = event.notes;
                let code_text = event.code_text;
                let coords = null;

                this.db.run(`INSERT or REPLACE INTO gitData 
                            (eventID, videoID, timed_url, time, img_file, text_file, notes, code_text, coords) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`, 
                            [eventID, videoID, timed_url, time, img_file, text_file, notes, code_text, coords]
                            ).then(() => {
                                console.log(`Event ${eventID} inserted!`);
                            }).catch((err) => {
                                console.log("ERROR: " + err);
                            });

                i++;
            }

            if (i == gitData.length) {
                // close the database connection
                this.db.close(err => {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log('Close the database connection.');
                });
            }            
        } catch (err) {
            console.log("ERROR: " + err);
        }
    }
}
  
module.exports = GitHistory;
