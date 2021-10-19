

var codeEntries = {};
var lastSearch = ""
var offset = 0;


let span = null;
var intervalSearches = {};
var intervalKeywords = {};
var commonKeywords = {};
var commonSearchTerms = {};
var codeToSearchTerms = {};

var codeLines = {};
    
$( document ).ready(function() {
    console.log( "ready!" );
    getCode();

    $('#calc').on( "click", function(){
        calculateEpisodeConnections();
        updateCodeDisplay();

        for (var i = 0; i < codeEntries.length; i++) {
            analyzeLines(codeEntries[i]["code_text"], codeEntries[i]["time"]);
        }

        var start = 975;
        var end = 1149;
        var sessionEnd = 2704;

        findNewLinesInPeriod(start, end);
        var persistentLines = findPersistingLinesInPeriod(start, end, sessionEnd);

        // console.log(persistentLines);

        writePersistentCode(end, sessionEnd, persistentLines);
        
    } );
})

function stripLineNumbers(codeState) {
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

function compareKeywords(keywords1, keywords2) {
    var keywords1List = keywords1.split(";");
    var sharedKeywords = "";
    
    for (var i = 0; i < keywords1List.length; i++) {
        var idx = keywords2.indexOf(keywords1List[i]);
        if (idx != -1) {
            sharedKeywords = sharedKeywords + keywords1List[i] + ";";
        }
    }

    return sharedKeywords;
}

function showDiff(codeState1, codeState2) {

    //todo: write something to strip the line numbers from the code before comparison
    // console.log("strip line numbers codeState1");
    codeState1 = stripLineNumbers(codeState1);
    // console.log("strip line numbers codeState2");
    codeState2 = stripLineNumbers(codeState2);

    document.getElementById('diff').innerHTML = diffHtml;
}

function cleanSearchString(search) {
    
    var quoteIdx = search.indexOf('\"');
    if (quoteIdx != -1) {
        search = search.substring(0, quoteIdx);
    }
    var dashIdx = search.indexOf("-"); 
    if (dashIdx != -1) {
        search = search.substring(0, dashIdx);
    }

    if(search.length > 0) {
        search = search.replaceAll(" ", ";");
    }

    return search;
}

function calculateEpisodeConnections() {
    var lastInterval = "";

    for (var i = 1; i < codeEntries.length; i++) {
        const startTime = codeEntries[i-1]["time"];
        const endTime = codeEntries[i]["time"];

        const interval = startTime + " - " + endTime;

        if (lastInterval.length > 0) {

            // look for shared keywords in added code between intervals
            var sharedKeywords = compareKeywords(intervalKeywords[lastInterval], intervalKeywords[interval]);
            
            if (sharedKeywords.length > 0) {
                commonKeywords[lastInterval] = sharedKeywords;
            }

            // look for shared search terms between intervals
            var search1 = cleanSearchString(intervalSearches[lastInterval]);
            var search2 = cleanSearchString(intervalSearches[interval]);

            var sharedSearchTerms = compareKeywords(search1, search2);

            if( sharedSearchTerms.length > 0) {
                // console.log("Shared terms: " + lastInterval + " " + sharedSearchTerms);
                commonSearchTerms[lastInterval] = sharedSearchTerms;
            }

            // look for added code keywords becoming search terms
            var codeToSearch = compareKeywords(intervalKeywords[lastInterval], search2);
            if (codeToSearch.length > 0) {
                // console.log("keywords: " + intervalKeywords[lastInterval]);
                // console.log("search terms: " + search2);
                codeToSearchTerms[lastInterval] = codeToSearch;
            }
            
        }
        lastInterval = interval;
    }

}

function getKeywords(codeState1, codeState2) {
    codeState1 = stripLineNumbers(codeState1);
    codeState2 = stripLineNumbers(codeState2);

    var keywords = "";

    var diff = Diff.createTwoFilesPatch("previous", "current", codeState1, codeState2,null,null,{context:100});

    var lines = diff.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('+')) {
            // console.log("added: " + lines[i]);
            var dotIndex = lines[i].indexOf(".");
            var parenIndex = lines[i].indexOf("(");
            if ( (dotIndex != -1) && (parenIndex !=-1) ) {
                keywords = keywords +  lines[i].substring(dotIndex+1, parenIndex) + ";";
            }
        }
    }
    return keywords;
}

function analyzeLines(codeState, time) {
    codeState = stripLineNumbers(codeState);   
    var lines = codeState.split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {

        var found = false;

        for (let key in codeLines) {

            if ((lines[i].length > 0) && (key == lines[i].trim())) {
                found = true;
            }
        }

        if (found) {

            // if we found an exact match, update the list of times associated with
            
            var lastTime = codeLines[lines[i].trim()]["time"];
            codeLines[lines[i].trim()]["pastTimes"].push(lastTime);
            codeLines[lines[i].trim()]["time"] = time;

            // console.log("found " +  lines[i].trim() + time + " " + codeLines[lines[i].trim()]["pastTimes"]);
            
        } else {

            // console.log("not found" + lines[i].trim());

            // if we didn't find an exact match, then we need to determine whether this is a new line or an edit
            if (Object.keys(codeLines).length > 0) {
                var bestMatch = stringSimilarity.findBestMatch(lines[i].trim(), Object.keys(codeLines));
                var rating = bestMatch["bestMatch"]["rating"];

                if (rating > .65) {

                    // delete Employee.firstname;
                    var previousVersion = codeLines[bestMatch["bestMatch"]["target"]]; // squirrel away the old version

                    // append the current time for the matching line
                    if (! previousVersion["pastTimes"].includes(previousVersion["time"])) {
                        previousVersion["pastTimes"].push(previousVersion["time"]);
                    }

                    var versionRecord = {line: bestMatch["bestMatch"]["target"], times: previousVersion["pastTimes"]};

                    // if version record is already in the list of previous versions, ignore otherwise insert.
                    if( !_.isEqual(previousVersion["previousVersions"][previousVersion["previousVersions"].length-1], versionRecord)) {
                        previousVersion["previousVersions"].push(versionRecord);
                    }

                    var newEntry = {time: time, pastTimes: [], previousVersions: previousVersion["previousVersions"]};
                    // console.log("new entry" + JSON.stringify(newEntry));
 
                } else {
                    var line = lines[i].trim();
                    if (line.length > 0) {
                        codeLines[lines[i].trim()] = {time: time, pastTimes: [], previousVersions: []} ;
                    }
                }

            } else {
                var line = lines[i].trim();
                if (line.length > 0) {
                    codeLines[lines[i].trim()] = {time: time, pastTimes: [], previousVersions: []} ;
                }
            }

            // console.log(JSON.stringify(codeLines));
            
        }

        // var bestMatch = stringSimilarity.findBestMatch(lines[i], Object.keys(codeLines));
        // console.log("best match: " + JSON.stringify(bestMatch["bestMatch"]));
    }
}

function findNewLinesInPeriod(startTime, endTime) {
    console.log("\nNEW LINES: ");
    for (var line in codeLines) {
       
        var insertTime = codeLines[line]["time"];
        if (codeLines[line]["pastTimes"].length > 0) {
            insertTime = codeLines[line]["pastTimes"][0];
        }

        var lastTime = codeLines[line]["pastTimes"][codeLines[line]["pastTimes"].length-1];

        if ((insertTime >= startTime) && (insertTime <= endTime)) {

            // if (lastTime < endTime) {
                console.log("NEW [" + insertTime + "-" + lastTime + "] " + line);
            // }
        }

        // if (codeLines[line]["time"])
    }

    console.log("\nREMOVED: ")
    for (var line in codeLines) {
       
        var insertTime = codeLines[line]["time"];
        if (codeLines[line]["pastTimes"].length > 0) {
            insertTime = codeLines[line]["pastTimes"][0];
        }

        var lastTime = codeLines[line]["pastTimes"][codeLines[line]["pastTimes"].length-1];

        if (lastTime < endTime) {
            console.log("DEL [" + insertTime + "-" + lastTime + "] " + line);
        }
    

        // if (codeLines[line]["time"])
    }
}

function findPersistingLinesInPeriod(startTime, endTime, sessionEnd) {
    var persistentLines = [];
    console.log("\nPERSISTENT LINES: "  );
    for (var line in codeLines) {

        console.log("line " + line);
       
        var insertTime = codeLines[line]["time"];
        if (codeLines[line]["pastTimes"].length > 0) {
            insertTime = codeLines[line]["pastTimes"][0];
        }

        var lastTime = codeLines[line]["pastTimes"][codeLines[line]["pastTimes"].length-1];

        if ((insertTime >= startTime) && (insertTime <= endTime)) {

            if (lastTime == sessionEnd) {
                // console.log("STAY " + line + " inserted at " + insertTime + " persisted to END");
                persistentLines.push(line);
            }
        }

        // if (codeLines[line]["time"])
    }
    return persistentLines;
}

function writePersistentCode(endTime, sessionEnd, persistentLines) {

    for (var i = 0; i < codeEntries.length; i++) {
        if(codeEntries[i]["time"] == endTime) {
            // console.log(JSON.stringify(codeEntries[i]["code_text"]));

            var codeState = stripLineNumbers(codeEntries[i]["code_text"]);
            // console.log(codeState);
            var lines = codeState.split(/\r?\n/);

            for (var j = 0; j < lines.length; j++) {
                // console.log(lines[j]);

                // now  i need to check whether any of these are in the persistent lines. and print out the ones that are in persistent 
                var found = false;
                for (var persistentIdx = 0; persistentIdx < persistentLines.length; persistentIdx++) {
                    var persistentLine = persistentLines[persistentIdx];

                    if( _.isEqual(lines[j].trim(), persistentLine) ) {
                        found = true;
                    }
                }

                if (found) {
                    console.log("PERMA : " + lines[j].trim());
                }

                // // if version record is already in the list of previous versions, ignore otherwise insert.
                // if( !_.isEqual(previousVersion["previousVersions"][previousVersion["previousVersions"].length-1], versionRecord)) {
                //     previousVersion["previousVersions"].push(versionRecord);
                // }
            }


        }
    }
    

}

function getComments(startTime, endTime) {
    $.get('http://localhost:3000/getCommentsInRange', { startTime: startTime, endTime : endTime}, 
    function(response){
        var commentEntries = response;
        lastSearch = "";
        const interval = startTime + " - " + endTime;

        for (var i = 0 ; i < commentEntries.length; i++) {

            if (commentEntries[i]["notes"].indexOf("search:") !=  -1) {
                lastSearch = commentEntries[i]["notes"];
                // console.log("Found new search: " + interval + " " + lastSearch);
            }
        }

        intervalSearches[interval] = lastSearch;
        updateCodeDisplay();

    });

    
}

function getCode() {
    console.log("get code");
    $.get('http://localhost:3000/getCodeText', { offset: offset, order : "ASC", limit : 150 }, 
        function(response){
            codeEntries = response;
            console.log("0th entry" + JSON.stringify(codeEntries[0]));

            for (var i = 1; i < codeEntries.length; i++) {
                const startTime = codeEntries[i-1]["time"];
                const endTime = codeEntries[i]["time"];

                const interval = startTime + " - " + endTime;
                // this just initializes everything. getComments will then fill in values for ones that have them.
                intervalSearches[interval] = "None"; 
                intervalKeywords[interval] = getKeywords(codeEntries[i-1]["code_text"], codeEntries[i]["code_text"]);
                getComments(startTime, endTime);

                if (i == codeEntries.length-1) {
                  calculateEpisodeConnections();  
                }
                
            }
            
            updateCodeDisplay();
    });
}

function updateCodeDisplay() {
    var tableCode = '<TABLE style="width: 100%"> \
    <colgroup>\
       <col span="1" style="width: 10%;">\
       <col span="1" style="width: 30%;">\
       <col span="1" style="width: 30%;">\
       <col span="1" style="width: 10%;">\
       <col span="1" style="width: 10%;">\
       <col span="1" style="width: 10%;">\
    </colgroup>';

    // console.log(codeEntries.length)
    // var lastInterval = "";

    // looping through this way ensures they are in order
    for (var i = 1; i < codeEntries.length; i++) {
        const startTime = codeEntries[i-1]["time"];
        const endTime = codeEntries[i]["time"];

        const interval = startTime + " - " + endTime;

        tableCode = tableCode + "<TR>";
        
        tableCode = tableCode + "<TD>" + interval +  "</TD>";
        tableCode = tableCode + "<TD>" + intervalSearches[interval] + "</TD>";
        tableCode = tableCode + "<TD>" + intervalKeywords[interval] + "</TD>";
        tableCode = tableCode + "<TD>" + commonKeywords[interval] + "</TD>";
        tableCode = tableCode + "<TD>" + commonSearchTerms[interval] + "</TD>";
        tableCode = tableCode + "<TD>" + codeToSearchTerms[interval] + "</TD>";
        // tableCode = tableCode + "<TD>" + lastSearch +  "</TD>";
        
        tableCode = tableCode + "</TR>";

        // // I don't know that this is the right path going forward, but for now.
        // if (lastInterval.length > 0) {
        //     // console.log("keywords1: " + intervalKeywords[lastInterval]);
        //     // console.log("keywords2: " + intervalKeywords[interval]);

        //     var sharedKeywords = compareKeywords(intervalKeywords[lastInterval], intervalKeywords[interval]);

        //     if (sharedKeywords.length > 0) {
        //         console.log("shared keywords: " + lastInterval + " " + interval + " " + sharedKeywords);
        //     }
        // }
        // lastInterval = interval;
    
    }
    tableCode = tableCode + "</TABLE>"

    document.getElementById('episodes').innerHTML = tableCode;

}

