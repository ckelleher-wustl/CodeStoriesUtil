var codeLines = {};
var codeVersionsTable = {};
var linePhaseTable= {};
var phaseLineTable = {};

// this is duplicated which is not ideal, but for now: 
var intervalBounds = [197, 381, 595, 975, 1149, 1404, 1634, 2006, 2308, 2506];

function getLineAtTime(codeLine, time) {

    // console.log("line@time: " + JSON.stringify(codeLine) + " " + time);

    var linePrevs = codeLine["previousVersions"];

    for (var i = 0; i < linePrevs.length; i++) {
        var prevVersion = linePrevs[i];

        if(prevVersion["times"].indexOf(time) !== -1){
            return prevVersion["line"];
        }
    }

    return "";
}


export function calculateStats(endTime) {
    // console.log(JSON.stringify(codeEntries));
    var structural = [];
    var transient = [];
    
    var structuralEdits = 0;
    var transientEdits = 0;

    for (var entry in codeLines) {
        // console.log(JSON.stringify(codeLines[entry]));

        var isStructural = (codeLines[entry]["time"] >= endTime);
        if (isStructural) {
            var edits = codeLines[entry]["previousVersions"].length;
            if (edits > 3) console.log('structural ' + entry + "(" + edits + ")");
            structural.push(codeLines[entry]);
            structuralEdits = structuralEdits + edits;
        } else {
            var edits = codeLines[entry]["previousVersions"].length;
            if (edits > 3) console.log('transient ' + entry + "(" + edits + ")");
            transient.push(codeLines[entry]);
            transientEdits = transientEdits + edits;
        }

    }

    console.log("structural count " + structural.length);
    console.log("structural edits " + structuralEdits)
    console.log("transient count " + transient.length);
    console.log("transient edits " + transientEdits);
}

export function getTimeHistory(historyData) {
    // console.log("HISTORY: " + JSON.stringify(historyData["previousVersions"]));
    var changeTimes = [];
    var changePhases = [];
    for (var i = 0; i < historyData["previousVersions"].length; i++){
        // console.log("version " + JSON.stringify(historyData["previousVersions"][vsn]));
        changeTimes.push(historyData["previousVersions"][i]["times"][0]);
    }
    // add the first of the current times
    changeTimes.push(historyData["pastTimes"][0]);

    for (var i = 1; i < intervalBounds.length; i++) {
        for (var j = 0; j < changeTimes.length; j++) {
            var changeTime = changeTimes[j];
            if ((changeTime >= intervalBounds[i-1]) && (changeTime < intervalBounds[i])) {
                if (!(changePhases.includes("phase" + (i-1)))) {
                // console.log("pushing phase" + (i-1));
                changePhases.push("phase" + (i-1));
                }
            }
        }
    }
    // console.log("CHANGE TIMES " + changeTimes);
    console.log("CHANGE PHASES " + changePhases);
    if (changePhases.length == 0) {
        console.log("\tCHANGE Times " + changeTimes);
        console.log("\t" + JSON.stringify(historyData));
    }
    return changePhases;

    // note failing to find this one: window = sdl2.ext.Window(\"twitch SLAM\", size=(W, H), position=(-500, -500))" 
    // for now, pressing on to try to get the highlighting to work.

}

export function getPhasesForLine(line) {
    if (linePhaseTable.length == 0) {
        console.log("Phase table not yet created");
    } else{
        return linePhaseTable[line];
    }
}

export function getLinesForPhases(phase) {
    if (linePhaseTable.length == 0) {
        console.log("LinePhase table not yet created");
    } else{
        console.log("requesting " + phase + " " + phaseLineTable[phase]);
        return phaseLineTable[phase];
    }
}

export function findPhasesForLines(codeState, time) {
    createVersionsTable();
    codeState = stripLineNumbers(codeState);
    var lines = codeState.split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
        if (lines[i].trim().length > 0) {
            linePhaseTable["line" + i] = {code: lines[i], phases:[]};

            if (codeLines[lines[i].trim()]) {
                // console.log("line " + i + " " + lines[i].trim() + " data: " + JSON.stringify(codeLines[lines[i].trim()]));
                if (codeLines[lines[i].trim()]) {
                    linePhaseTable["line" + i]["phases"] = getTimeHistory(codeLines[lines[i].trim()]);
                }
            } else {
                // console.log("not found " + lines[i].trim());
                var endLine = codeVersionsTable[lines[i].trim()];
                // console.log("\tfinal line " +  endLine + " " + JSON.stringify(codeLines[endLine]));

                if (codeLines[endLine]) {
                    linePhaseTable["line" + i]["phases"] = getTimeHistory(codeLines[endLine]);
                }
            }
            
        }
    }
    // at this point, there should be valid data in the phases

    // for (var i= 0;  i < lines.length; i++) {
    //     if ("line" + i in linePhaseTable) {
    //         console.log( "line" + i + ":  " + JSON.stringify(linePhaseTable["line"+i]));
           
    //     }
    // }

}

export function findLinesForPhases() {
    // console.log("Lines for phases " + JSON.stringify(linePhaseTable));
    for (var line in linePhaseTable) {
        // console.log("LP" + "  " + line +   " " + JSON.stringify(linePhaseTable[line]));

        var phaseList = linePhaseTable[line]["phases"];
        if (phaseList) {
            for (var i = 0; i < phaseList.length; i++) {
                var phaseName = phaseList[i];
                if (phaseName in phaseLineTable) {
                    phaseLineTable[phaseName].push(line);
                } else {
                    phaseLineTable[phaseName] = [];
                }
            }
        }
    }

    // console.log("PHASELINETABLE " + JSON.stringify(phaseLineTable));
}


// find the lines that were inserted during this period that still exist at the end
export function classifyLinesInPeriod(startTime, endTime, sessionEnd) {
    var persistentLines = [];
    var transientLines = [];
    var modPersistentLines = [];
    var modTransientLines = [];
    
    // console.log("\nPERSISTENT LINES: [" + startTime + " - " + endTime + "]");
    // console.log();

    // for all the lines we know about (correcting for modifications)
    for (var line in codeLines) {
       
        // get a possible original time that this line was inserted
        var insertTime = codeLines[line]["time"];
        // var lineText = line;

        // if there are any pastTimes for this line, get the original one
        if (codeLines[line]["pastTimes"].length > 0) {
            insertTime = codeLines[line]["pastTimes"][0];
            // console.log("previous version insert time " + insertTime);
        }

        // if there are previousVersions, the time for the 0th is the earliest possible insertion
        if (codeLines[line]["previousVersions"].length > 0) {
            insertTime = codeLines[line]["previousVersions"][0]["times"][0];
            // lineText = codeLines[line]["previousVersions"][0]["line"];
        }

        // get the last time that this line existed - it has to be the current time 
        // var lastTime = codeLines[line]["pastTimes"][codeLines[line]["pastTimes"].length-1];
        var lastTime = codeLines[line]["time"];


        // console.log("Classifying " + line.trim() + " " + startTime + "-" + endTime + " " + insertTime + "-" + lastTime);
        // if the line was inserted during this period
        if ((insertTime >= startTime) && (insertTime <= endTime)) {

            // console.log("line inserted during target period");

            // and if it still exists at the end of the session then it's a persistant/structural line
            if (lastTime >= sessionEnd) {
                // console.log("PERSIST " + line + " " + JSON.stringify(codeLines[line]));
                var lineAtTime = getLineAtTime(codeLines[line], endTime);
                if (lineAtTime.length > 0) {
                    persistentLines.push(lineAtTime);
                } else {
                    persistentLines.push(line);
                }
                
            } else {
                // console.log("TRANSIENT " + line + " " + JSON.stringify(codeLines[line]));
                var lineAtTime = getLineAtTime(codeLines[line], endTime);
                // console.log("line@time " + lineAtTime);
                if (lineAtTime.length > 0) {
                    transientLines.push(lineAtTime);
                } else {
                    transientLines.push(line);
                }
            }
        } else {
            // figure out when this line was modified.
            // if there are previousVersions, the time for the 0th is the earliest possible insertion
            if (codeLines[line]["previousVersions"].length > 0) {

                var linePrevs = codeLines[line]["previousVersions"];

                for (var i = 0; i < linePrevs.length; i++) {
                    // console.log("linePrevs " + JSON.stringify(linePrevs) );
                    if ((linePrevs[i]["times"][0] >= startTime) && (linePrevs[i]["times"][0] < endTime)) {
                        // console.log("MODIFIED " + linePrevs[i]["line"] + " " + JSON.stringify(codeLines[line]));
                        // modifiedLines.push(linePrevs[i]["line"]);

                        var lastTime = codeLines[line]["time"];

                        // and if it still exists at the end of the session then it's a persistant/structural line
                        if (lastTime == sessionEnd) {
                            // console.log("MOD PERSIST " + linePrevs[i]["line"] + " " + linePrevs[i]["times"][0]);
                            modPersistentLines.push(linePrevs[i]["line"]);
                        } else {
                            // console.log("MOD TRANSIENT " + linePrevs[i]["line"] + " " + linePrevs[i]["times"][0]);
                            modTransientLines.push(linePrevs[i]["line"]);
                        }
                    }
                   
                }
                
            }
        }

    }
    return {persistent: persistentLines, transient: transientLines, modPersistent: modPersistentLines, modTransient: modTransientLines}; // these are the structural lines added between startTime and endTime
}

function lineInList(line, lineList) {

    var found = false;
    if (line.trim().length > 0) {

        for (var idx = 0; idx < lineList.length; idx++) {
            var lLine = lineList[idx];

            if( _.isEqual(line.trim(), lLine) ) {
                found = true;
                // console.log("\tlLine " + line.trim() + " " + lLine + " TRUE");
            } else {
                // console.log("\tlLine " + line.trim() + " " + lLine + " FALSE");
            }
        }
    }

    return found;
}

export function getHTMLView(code, pLines, tLines, mpLines, mtLines) {

    code = stripLineNumbers(code);
    var lines = code.split(/\r?\n/);

    var html = "<table>"

    for (var j = 0; j < lines.length; j++) {

        var persist = lineInList(lines[j], pLines);
        var mPersist = lineInList(lines[j], mpLines);
        var transient = lineInList(lines[j], tLines );
        var mTransient = lineInList(lines[j], mtLines);

        // if lines[j] is in the persistent lines list, then print it out.
        if (persist) {
            // console.log("PERMA : " + lines[j].trim());
            html = html + "<tr><td><span style='background-color: #728FCE;'>P:" + lines[j].trim() + "</span></td></td>";
        }

        // if lines[j] is in the persistent lines list, then print it out.
        if (mPersist) {
            // console.log("M-PERMA : " + lines[j].trim());
            html = html + "<tr><td><span style='background-color: #CCCCFF;'>MP:" + lines[j].trim() + "</span></td></td>";
        }

        if (transient) {
            // console.log("TRANS : " + lines[j].trim());
            html = html + "<tr><td><span style='background-color: #FFFAC0;'>T:" + lines[j].trim() + "</span></td></td>";
        }

        if (mTransient) {
            // console.log("M-TRANS : " + lines[j].trim());
            html = html + "<tr><td><span style='background-color: #FFFFE0;'>MT:" + lines[j].trim() + "</span></td></td>";
        }

    }
    html = html + "</table>";

    return html;
}

export function createVersionsTable() {
    for (var line in codeLines) {
        var prevCnt = codeLines[line]["previousVersions"].length;
        if (prevCnt > 0) {
            // console.log("codeLines Entry: " + line + " " + codeLines[line]["previousVersions"].length);
            for (var vsn in codeLines[line]["previousVersions"]) {
                var prevVersion = codeLines[line]["previousVersions"][vsn]["line"];
                codeVersionsTable[prevVersion] = line;
                // console.log("adding " + prevVersion + "-> " + line);
            }
        }
    }
}

export function getChangeList(code, startTime, endTime, sessionEnd) {

    var lists = classifyLinesInPeriod(startTime, endTime, sessionEnd);
    var pLines = lists["persistent"];
    var mpLines = lists["modPersistent"];
    var tLines = lists["transient"];
    var mtLines = lists["modTransient"];

    var changes = [];

    code = stripLineNumbers(code);
    var lines = code.split(/\r?\n/);

    for (var j = 0; j < lines.length; j++) {

        var persist = lineInList(lines[j], pLines);
        var mPersist = lineInList(lines[j], mpLines);
        var transient = lineInList(lines[j], tLines );
        var mTransient = lineInList(lines[j], mtLines);

        if (persist) {
            // console.log("PERMA : " + lines[j].trim());
            changes.push({line: lines[j].trim(), type: "p"}); 
        }

        if (mPersist) {
            // console.log("M-PERMA : " + lines[j].trim());
            changes.push({line: lines[j].trim(), type: "mp"}); 
        }

        if (transient) {
            // console.log("TRANS : " + lines[j].trim());
            changes.push({line: lines[j].trim(), type: "t"}); 
        }

        if (mTransient) {
            // console.log("M-TRANS : " + lines[j].trim());
            changes.push({line: lines[j].trim(), type: "mt"}); 
        }

    }

    return changes;

}

export function record(codeState, time) {
    codeState = stripLineNumbers(codeState);   
    var lines = codeState.split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {

        var found = false;
        var line = lines[i].trim();

        for (let key in codeLines) {

            if ((line.length > 0) && (key == line)) {
                found = true;
            }
        }

        if (found) {

            // if we found an exact match, update the list of times associated with        
            var lastTime = codeLines[line]["time"];
            codeLines[line]["pastTimes"].push(lastTime);
            codeLines[line]["time"] = time;
            
        } else {

            // if we didn't find an exact match, then we need to determine whether this is a new line or an edit
            if (Object.keys(codeLines).length > 0) {

                // find the best match for line within the existing lines of code (codeLines)
                var bestMatch = stringSimilarity.findBestMatch(line, Object.keys(codeLines));
                var rating = bestMatch["bestMatch"]["rating"];

                // record a new version for bestMatch["bestMatch"]
                if (rating > .65) {

                    var previousVersion = codeLines[bestMatch["bestMatch"]["target"]]; // this is the best existing thing that line matches

                    // append the current time for the matching line
                    if (! previousVersion["pastTimes"].includes(previousVersion["time"])) {
                        previousVersion["pastTimes"].push(previousVersion["time"]);
                    }

                    // this will be an entry in the previous versions list for the new line
                    var versionRecord = {line: bestMatch["bestMatch"]["target"], times: previousVersion["pastTimes"]};

                    // if version record is already in the list of previous versions, ignore otherwise insert.
                    if( !_.isEqual(previousVersion["previousVersions"][previousVersion["previousVersions"].length-1], versionRecord)) {
                        previousVersion["previousVersions"].push(versionRecord);
                    }

                    var newEntry = {time: time, pastTimes: [], previousVersions: previousVersion["previousVersions"]};

                    // remove the old line since it's no longer current
                    delete codeLines[bestMatch["bestMatch"]["target"]];

                    // add new Entry
                    codeLines[line] = newEntry;

 
                } else {
                    if (line.length > 0) {
                        codeLines[line] = {time: time, pastTimes: [], previousVersions: []} ;
                    }
                }

            } else {
                if (line.length > 0) {
                    codeLines[line] = {time: time, pastTimes: [], previousVersions: []} ;
                }
            }
            
        }
    }
}

export function stripLineNumbers(codeState) {
    const codeLines = codeState.split(/\r?\n/);
    var header = "";
    var body = "";

    for (var i = 0; i < codeLines.length; i++){

        var line = codeLines[i];
        // strip out digits at the beginning of each line
        if (line[0] >= '0' && line[0] <= '9') {
            if (line.indexOf(" ") != -1) {
                line = line.substring(codeLines[i].indexOf(" ")) ;
            } else {
                line = "";
            }
        } 

        // attempt to normalize indenting issues
        if (line.indexOf("          ") !=-1) {
            line = "\t\t\t" + line.substring(10);
        } else if (line.indexOf("          ") !=-1) {
            line = "\t\t\t" + line.substring(9);
        } else if (line.indexOf("        ") !=-1){
            line = "\t\t\t" + line.substring(8);
        } else if (line.indexOf("       ") !=-1){
            line = "\t\t" + line.substring(7);
        } else if (line.indexOf("      ") !=-1){
            line = "\t\t" + line.substring(6);
        } else if (line.indexOf("     ") !=-1){
            line = "\t\t" + line.substring(5);
        } else if (line.indexOf("    ") !=-1){
            line = "\t" + line.substring(4);
        } else if (line.indexOf("   ") !=-1){
            line = "\t" + line.substring(3);
        } else if (line.indexOf("  ") !=-1){
            line = "\t" + line.substring(2);
        }

        // fix ( " issues
        var idx = line.indexOf("( \"");
        if (idx != -1) {
            // console.log("( \" found: " + line);
           line = line.substring(0, idx) + "(\"" + line.substring(idx+3);
        //    console.log("( \" removed: " + line);
        }

         // fix ( ' issues
        idx = line.indexOf("( \'");
        if (idx != -1) {
            // console.log("( \' found: " + line);
           line = line.substring(0, idx) + "(\'" + line.substring(idx+3);
        //    console.log("( \' removed: " + line);
        }

        // fix ,X issues
        // let first = line.search(/[^ ],/) // find before the comma with no following space
        let second = line.search(/,[^ ]/) // find after the comma
        if (second != -1) {
            // console.log("second is " + second + ": " + line);
            line = line.substring(0,second) + ", " + line.substring(second + 1)
        }

        if ((line.indexOf("#") != -1) || (line.indexOf("import") != -1)) {
            header = header + line + "\n";
        } else {
            body = body + line + "\n";
        }
    }

    return header + body;
}
