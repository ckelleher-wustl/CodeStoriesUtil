var codeEntries = {};
var offset = 0;
var index = 1;

var codeFiles = {};

let span = null;
    
$( document ).ready(function() {
    console.log( "ready!" );
    getCode();

    $('#show-prev-btn').on( "click", function(){
        showPreviousEntry();
    } );
    $('#show-next-btn').on( "click", function(){
        showNextEntry();
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
 
    var diff = Diff.createTwoFilesPatch("previous", "current", codeState1, codeState2,null,null,{context:100});
    // console.log(diff)
    var diffHtml = Diff2Html.html(diff, {
        drawFileList: false,
        //matching: 'words',
        outputFormat: 'side-by-side',
    });
    document.getElementById('diff').innerHTML = diffHtml;
}

function showComments(commentEntries, startTime, endTime){
    const search = document.getElementById('search');
    var lastSearch = "None."
    var evtString = startTime + " - " + endTime + "<br>";
    for(var comment in commentEntries) {
        // console.log(JSON.stringify(commentEntries[comment]));
        const currNote = JSON.stringify(commentEntries[comment]);
        evtString = evtString + currNote + "<br>";
        if (currNote.indexOf("search:") != -1) {
            lastSearch = currNote;
        }
    }

    evtString = "<b>" + lastSearch + "</b></br>" + evtString;

    $(search).html(evtString);
}

function getComments(startTime, endTime) {
    $.get('http://localhost:3000/getCommentsInRange', { startTime: startTime, endTime : endTime}, 
    function(response){
        var commentEntries = response;
        // console.log("0th comment" + JSON.stringify(commentEntries[0]));

        showComments(commentEntries, startTime, endTime);
    });
}

function getCode() {
    console.log("get code");
    $.get('http://localhost:3000/getCodeText', { offset: offset, order : "ASC"}, 
        function(response){
            codeEntries = response;
            console.log("0th entry" + JSON.stringify(codeEntries[0]));
            
            updateCodeDisplay();
    });

    jQuery.get('http://localhost:8000/public/initialcode/person.txt', function(data) {
        codeFiles["person"] = data;
        console.log(codeFiles["person"]);
        // alert(data);
    });

    jQuery.get('http://localhost:8000/public/initialcode/server.txt', function(data) {
        codeFiles["server"] = data;
        // alert(data);
    });

    jQuery.get('http://localhost:8000/public/initialcode/test.txt', function(data) {
        codeFiles["test"] = data;
        // alert(data);
    });
}

function segmentCode(codeText){

    var header = codeText.substring(0,codeText.indexOf("def"));

    console.log("Header is: ");
    console.log(header);

    return header;
}

function updateCodeDisplay() {
    var notes = codeEntries[index]["notes"];
    var codeState1 = codeEntries[index-1]["code_text"];
    var codeState2 = codeEntries[index]["code_text"];

    var filename = notes.substring(notes.indexOf(": ")+2, notes.indexOf(".py"))
    console.log(filename);

    if (filename) {
        console.log("filename is" + filename + ".");
        console.log("available files " + Object.keys(codeFiles));
        // console.log("present: " + (codeFiles[filename]));
    }
    var origCode = ""

    if (filename && (codeFiles[filename])) {
        origCode = codeFiles[filename];
        console.log("FOUND " + filename);
    } 

    if(origCode.length > 0) {
        segmentCode(origCode);
        showDiff(origCode, codeState2);
    } else {
        showDiff(codeState1, codeState2);
    }

    var startTime = codeEntries[index-1]["time"];
    var endTime = codeEntries[index]["time"];

    getComments(startTime, endTime);
}

function showNextEntry() {
    index = index + 1;
    if (index >= codeEntries.length) {
        offset = codeEntries[codeEntries.length-2]["time"];
        index = 1;
        getCode();

        console.log("offset is: " + offset);
        // index = codeEntries.length -1;
    } else {
        updateCodeDisplay();
    }
    console.log("code entries length: " + codeEntries.length)

}

function showPreviousEntry() {
    index = index - 1;
    if (index < 1) {
        index = 1;
    }
    updateCodeDisplay();

}