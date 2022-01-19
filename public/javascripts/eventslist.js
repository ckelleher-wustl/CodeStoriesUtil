

var eventEntries = {};
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
    getEvents();

    $('#calc').on( "click", function(){
        // calculateEpisodeConnections();
        updateCodeDisplay();

        // for (var i = 0; i < codeEntries.length; i++) {
        //     analyzeLines(codeEntries[i]["code_text"], codeEntries[i]["time"]);
        // }

        // var start = 975;
        // var end = 1149;
        // var sessionEnd = 2704;

        // findNewLinesInPeriod(start, end);
        // var persistentLines = findPersistingLinesInPeriod(start, end, sessionEnd);

        // // console.log(persistentLines);

        // writePersistentCode(end, sessionEnd, persistentLines);
        
    } );
})



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

function getEvents() {
    console.log("get list of events");
    $.get('http://localhost:3000/eventsList', { offset: offset, order : "ASC" }, 
        function(response){
            eventEntries = response;
            console.log("0th entry" + JSON.stringify(eventEntries[0]));
            
            updateCodeDisplay();
    });
}

function updateCodeDisplay() {
    var tableCode = '<TABLE style="width: 100%"> \
    <colgroup>\
       <col span="1" style="width: 10%;">\
       <col span="1" style="width: 70%;">\
       <col span="1" style="width: 20%;">\
    </colgroup>';


    // looping through this way ensures they are in order
    for (var i = 0; i < eventEntries.length; i++) {

        tableCode = tableCode + "<TR>";
        
        tableCode = tableCode + "<TD>" + eventEntries[i]["time"] +  "</TD>";
        tableCode = tableCode + "<TD>" + eventEntries[i]["notes"] + "</TD>";
        tableCode = tableCode + "<TD>" + eventEntries[i]["img_file"] + "</TD>";
        // tableCode = tableCode + "<TD>" + lastSearch +  "</TD>";
        
        tableCode = tableCode + "</TR>";

    }
    tableCode = tableCode + "</TABLE>"

    document.getElementById('episodes').innerHTML = tableCode;

}

