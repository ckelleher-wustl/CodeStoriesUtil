
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

function getDiff(codeState1, codeState2) {
    var diff = Diff.createTwoFilesPatch("previous", "current", codeState1, codeState2,null,null,{context:100});
    // console.log(diff)
    var diffHtml = Diff2Html.html(diff, {
        drawFileList: false,
        //matching: 'words',
        outputFormat: 'side-by-side',
    });

    return diffHtml;
}

function showDiff(codeState1, codeState2) {
 
    var diff = Diff.createTwoFilesPatch("previous", "current", codeState1, codeState2,null,null,{context:100});
    // console.log(diff)
    var diffHtml = Diff2Html.html(diff, {
        drawFileList: false,
        //matching: 'words',
        outputFormat: 'side-by-side',
    });
    document.getElementById('diff').innerHTML = diffHtml;
}

// show all the comments in an interval of time, typically between two code states
function showComments(commentEntries, startTime, endTime){
    const search = document.getElementById('search');
    var lastSearch = "None."
    var evtString = startTime + " - " + endTime + "<br>";
    for(var comment in commentEntries) {
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

function loadCodeClusters() {
    clusterFile = 'http://localhost:3000/data/codeClusters.csv'
    $.csv.toObjects(clusterFile);
}

function getCode() {
    // I think I want to change this so that it loads the csv of the code clusters and then makes a list and you can click on them
    console.log("get code");
    $.get('http://localhost:3000/getCodeText', { offset: offset, order : "ASC"}, 
        function(response){
            codeEntries = response;
            console.log("0th entry" + JSON.stringify(codeEntries[0]));
            
            updateCodeDisplay();
    });
}

function segmentCode(codeText){
    var header = codeText.substring(0,codeText.indexOf("def"));
    console.log("Header is: ");
    console.log(header);

    return header;
}

function updateCodeDisplay() {
    // currently unused, but would it be helpful to show the notes for the two
    // var notes = codeEntries[index]["notes"];
    var codeState1 = codeEntries[index-1]["code_text"];
    var codeState2 = codeEntries[index]["code_text"];

    showDiff(codeState1, codeState2);

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