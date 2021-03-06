import {stripLineNumbers, record, classifyLinesInPeriod, getHTMLView} from './codehistory.js';

var codeEntries = {};
// var codeLines = {};
var offset = 0;

var intervalBounds = [197, 381, 595, 975, 1149, 1404, 1634, 2006, 2308, 2506];
var intervalIndex = 0;

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

function findIndexForTime(time) {
    var index = -1;
    for (var i = 0; i < codeEntries.length; i++) {
        if (codeEntries[i]["time"] == time) {
            index = i;
            break;
        }
    }

    console.log("Index for " + time + " is " + index);
    return index;
}


function showNextEntry() {

    if (intervalIndex < intervalBounds.length-1) {
        intervalIndex = intervalIndex + 1;

        var startIndex = findIndexForTime(intervalBounds[intervalIndex]);
        var endIndex = findIndexForTime(intervalBounds[intervalIndex + 1]);
         
        showDiff(codeEntries[startIndex]["code_text"], codeEntries[endIndex]["code_text"]);

        writeCodeChangeView(startIndex, endIndex);

    }

}

function showPreviousEntry() {
    if (intervalIndex > 0) {
        intervalIndex = intervalIndex - 1;

        var startIndex = findIndexForTime(intervalBounds[intervalIndex]);
        var endIndex = findIndexForTime(intervalBounds[intervalIndex + 1]);
         
        showDiff(codeEntries[startIndex]["code_text"], codeEntries[endIndex]["code_text"]);

        writeCodeChangeView(startIndex, endIndex);

    }
}

function getCode() {
    console.log("get code");
    $.get('http://localhost:3000/getCodeText', { offset: offset, order : "ASC", limit : 150 }, 
        function(response){
            codeEntries = response;
            console.log("0th entry" + JSON.stringify(codeEntries[0]));

            var startIndex = findIndexForTime(intervalBounds[intervalIndex]);
            var endIndex = findIndexForTime(intervalBounds[intervalIndex + 1]);
             
            showDiff(codeEntries[startIndex]["code_text"], codeEntries[endIndex]["code_text"]);

            for (var i = 0; i < codeEntries.length; i++) {
                record(codeEntries[i]["code_text"], codeEntries[i]["time"]);
            }

            writeCodeChangeView(startIndex, endIndex);
    });
}

function showDiff(codeState1, codeState2) {

    //todo: write something to strip the line numbers from the code before comparison
    // console.log("strip line numbers codeState1 " + codeState1);
    codeState1 = stripLineNumbers(codeState1);
    // console.log("strip line numbers codeState2 " + codeState2);
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

function getValueAtTime(time, line, history) {
    var lineAtTime = line;

    // if the target time is before the insertion of the current version then we need to look at the past versions
    if (time < codeLines[line]["pastTimes"][0]) {
        for (var i = 0; i < codeLines[line]["previousVersions"].length; i++) {

        }

    }
}


function writeCodeChangeView(startIndex, endIndex) {

    var start = codeEntries[startIndex];
    var end = codeEntries[endIndex];
    var sessionEnd = 2506;

    console.log("start " + start + startIndex);
    console.log("end " + end);

    var lines = classifyLinesInPeriod(start["time"], end["time"], sessionEnd);

    // get the code text associated with the end of the current phase and split into lines
    var idx = findIndexForTime(end["time"]);
    var code = codeEntries[idx]["code_text"];

    // generate the html view for the current code
    var html = getHTMLView(code, lines["persistent"], lines["transient"], lines["modPersistent"], lines["modTransient"]);

    document.getElementById('structure').innerHTML = html;
    console.log("persist: " +  lines["persistent"]);
    console.log("transient: " +  lines["transient"]);
    console.log("modpersist: " +  lines["modPersistent"]);
    console.log("modtransient: " +  lines["modTransient"]);
    console.log(html);

}


