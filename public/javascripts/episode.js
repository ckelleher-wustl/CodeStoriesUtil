

var codeEntries = {};
var lastSearch = ""
var offset = 0;


let span = null;
var intervalSearches = {};
var intervalKeywords = {};
    
$( document ).ready(function() {
    console.log( "ready!" );
    getCode();

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
            console.log("second is " + second + ": " + line);
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

function showDiff(codeState1, codeState2) {

    //todo: write something to strip the line numbers from the code before comparison
    console.log("strip line numbers codeState1");
    codeState1 = stripLineNumbers(codeState1);
    console.log("strip line numbers codeState2");
    codeState2 = stripLineNumbers(codeState2);

    document.getElementById('diff').innerHTML = diffHtml;
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
                
            }
            
            updateCodeDisplay();
    });
}

function updateCodeDisplay() {
    var tableCode = "<TABLE>"
    console.log(codeEntries.length)

    // looping through this way ensures they are in order
    for (var i = 1; i < codeEntries.length; i++) {
        const startTime = codeEntries[i-1]["time"];
        const endTime = codeEntries[i]["time"];

        const interval = startTime + " - " + endTime;

        tableCode = tableCode + "<TR>";
        
        tableCode = tableCode + "<TD>" + interval +  "</TD>";
        tableCode = tableCode + "<TD>" + intervalSearches[interval] + "</TD>";
        tableCode = tableCode + "<TD>" + intervalKeywords[interval] + "</TD>";
        // tableCode = tableCode + "<TD>" + lastSearch +  "</TD>";
        
        tableCode = tableCode + "</TR>";
    }
    tableCode = tableCode + "</TABLE>"

    document.getElementById('episodes').innerHTML = tableCode;
    
}

