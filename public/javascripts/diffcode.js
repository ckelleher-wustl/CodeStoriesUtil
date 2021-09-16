var codeEntries = {};
var offset = 0;
var index = 1;

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

function showDiff(codeState1, codeState2) {

    //todo: write something to strip the line numbers from the code before comparison

    var diff = Diff.createTwoFilesPatch("previous", "current", codeState1, codeState2,null,null,{context:100});
    console.log(diff)
    var diffHtml = Diff2Html.html(diff, {
        drawFileList: false,
        //matching: 'words',
        outputFormat: 'side-by-side',
    });
    document.getElementById('diff').innerHTML = diffHtml;
}

function showComments(commentEntries, startTime, endTime){
    const search = document.getElementById('search');
    var evtString = startTime + " - " + endTime + "<br>";
    for(var comment in commentEntries) {
        console.log(JSON.stringify(commentEntries[comment]));
       evtString = evtString + JSON.stringify(commentEntries[comment]) + "<br>";
    }

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
}

function updateCodeDisplay() {
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