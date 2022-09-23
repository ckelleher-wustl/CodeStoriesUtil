const cp = require('child_process');
const util = require('util');
const fs = require('fs');

class GitHistory {

    
    constructor(gitFolder, eventsFile) {
        this.gitFolder = gitFolder;
        this.eventsFile = eventsFile;

        this.exec = util.promisify(cp.exec);
        this.readFile = util.promisify(fs.readFile);

        this.gitData = this.constructGitData();
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

            // return time, notes, and img_file
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

            // return id, time, notes, and code_text
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
            
            // return id, time, notes and code_text
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
            selectedEvents = selectedEvents.filter(event => event.time >= startTime && event.time <= endTime);
            
            // return id, time, notes and img_file
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
            let events = await this.updateTimeline();
            let gitData = [];

            // make json object containing the following fields: id, time_url, time, notes, img_file, code_text, coords
            for (let i = 0; i < events.length; i++) {
                let event = events[i];
                let entry = {};
                entry.id = i + 1;
                entry.time_url = event.time_url;
                entry.time = event.time;
                entry.notes = event.action + ": " + event.info; // combine action and info
                entry.img_file = null;

                // if event action is "commit", then get code text
                if (event.action == "commit") {
                    // get id from info
                    let id = event.info.split(" ")[1];
                    let hashObj = this.hashObjsList.find(hashObj => hashObj.commitId == id);
                    entry.code_text = await this.getCodeTextHelper(hashObj.hash, "output.txt");
                    if(entry.code_text.stderr !== "") {
                        entry.code_text = entry.code_text.stderr.toString();
                    } else {
                        entry.code_text = entry.code_text.stdout.toString();
                    }
                } else {
                    entry.code_text = null;
                }

                entry.coords = null;
                gitData.push(entry);
            }
            console.log('Git data constructed!');
            return gitData;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }
    
    async updateTimeline() {
        try {
            this.hashObjsList = await this.constructHashObjsList(this.gitFolder);
            this.eventsList = await this.constructEventsList(this.eventsFile);

            if(this.eventsList.length > 0 && this.hashObjsList.length > 0) {
                const firstEventTime = this.eventsList[0].time;
                const firstCommitTime = this.hashObjsList[0].time;
                const offset = Math.min(firstEventTime, firstCommitTime);
    
                // go through eventsList and hashObjsList to offset the time to start from 0 (whether first commit happened before or after there's web data)
                for (let i = 0; i < this.eventsList.length; i++) {
                    this.eventsList[i].time = this.eventsList[i].time - offset;
                }
    
                for (let i = 0; i < this.hashObjsList.length; i++) {
                    this.hashObjsList[i].time = this.hashObjsList[i].time - offset;
                }
                
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
                    if(filteredEvents.length > 0) {
                        for (let j = 0; j < filteredEvents.length; j++) {
                            newEventsList.push(filteredEvents[j]);
                        }
                    }
                    let filteredHashObjs = this.hashObjsList.filter(hashObj => hashObj.time == combinedTimeList[i]);
                    if (filteredHashObjs.length > 0) {
                        newEventsList.push({time: filteredHashObjs[0].time, action: "commit", info: "number " + filteredHashObjs[0].commitId.toString()});
                    }
                }
                console.log('Timeline between events and commits updated!');
                return newEventsList;
            }
        } catch (err) {
            return ("ERROR: " + err);
        }
    }
    
    async constructHashObjsList(gitFolder) {
        try{
            let hashes = await this.exec(`git log --pretty=format:%h`, {cwd: gitFolder});
            hashes = hashes.stdout.toString().split('\n');
            hashes = hashes.filter(hash => hash !== '');
            hashes.reverse();

            let hashObjsList = [];

            for (let i = 0; i < hashes.length; i++) {
                // make an array of objects where each object contains the hash an the commit time
                let hash = hashes[i];
                let commitMessage = await this.exec(`git log -1 --pretty=%B ${hash}`, {cwd: gitFolder});

                if(commitMessage.stdout) {
                    commitMessage = commitMessage.stdout.toString();
                } else {
                    commitMessage = null;
                }
            
                // e.g. strip 8/18/2022, 8:55:39 PM from [Commit time: 8/18/2022, 8:55:39 PM]
                let time = commitMessage.match(/\[(.*?)\]/)[1];
                time = time.replace('Commit time: ', '');
            
                // convert time to epoch in seconds
                time = new Date(time).getTime() / 1000;
                hashObjsList.push({hash: hash, time: time, commitId: i+1});
            }
            console.log('Hash objects list constructed!');
            return hashObjsList;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async constructEventsList(eventsFile) {
        try {
            let events = await this.readFile(eventsFile, 'utf8');
            events = await this.csvJSON(events);
            console.log('Events list constructed!');
            return events;
        } catch (err) {
            return ("ERROR: " + err);
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

    async getCodeTextHelper(hash, file) {
        try {
            let codeText = await this.exec(`git show ${hash}:${file}`, {cwd: this.gitFolder});
            return codeText;
        } catch (error) {
            console.log("ERROR: " + err);
            return null;
        }
    }
}
  
module.exports = GitHistory;
