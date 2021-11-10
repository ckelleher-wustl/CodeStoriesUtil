import {record, getChangeList, stripLineNumbers, findPhasesForLines, getPhasesForLine, findLinesForPhases, getLinesForPhases, calculateStats} from './codehistory.js';

var codeEntries = {};
var offset = 0;
var intervalBounds = [197, 381, 595, 975, 1149, 1404, 1634, 2006, 2308, 2506];
var colors = ["#728FCE", "#CCCCFF", "#FFFAC0", "#FFFFE0"];

var comments = [
    "Creating skeleton to load video and loop through images.",
    "Attempt to display each frame using cv2 and imshow.",
    "Set up pygame as alternative framework.",
    "Debug pygame and drawing.",
    "Try a new pygame approach.",
    "Drawing a circle as a last ditch effort.",
    "Now let's try sdl2.",
    "Try running sdl example and going from there.",
    "Window show."
]

// this is going to be [{comment: commentText, changeCounts: typeCount},....]
var data = [];
var iter = 0; // this is a cheat to enable me to get to the full array of counts to sum them



$( document ).ready(function() {
    console.log( "ready!" );
    getCode();

})


function drawTable() {
    
    var table = d3.select("#table").append("table");

    var tablebody = table.append("tbody");
    var rows = tablebody
            .selectAll("tr")
            .data(data)
            .enter()
            .append("tr")
            .append("td")
            .append("span")
            .attr("id", function(d,i){
                return "phase" + i;
            })
            .text(function(d) {
                return d.comment;
            })
            .on("mouseenter", function(d,i){
                // if (i==0) {
                    d3.select(this)
                        .style("background-color", "steelblue");
    
                    // console.log("parent is " + JSON.stringify(this.parentNode)) ;
    
                    var lines = getLinesForPhases("phase" + i);
                    console.log("highlight " + "phase" + i + " " + JSON.stringify(lines));
    
                    for (var j = 0; j < lines.length; j++) {
                        console.log("line " + lines[j]);
                        d3.select("#" + lines[j])
                            .style("background-color", "steelblue");
                    }
                // }
            })
            .on("mouseout", function(d,i){
                // if (i == 0) {
                    d3.select(this)
                        .style("background-color", "white");
    
                        // i here is the index into the color array and not the index into the phases array. need to get that.
    
                    var lines = getLinesForPhases("phase" + i);
                    console.log("highlight " + "phase" + i + " " + JSON.stringify(lines));
    
                    for (var j = 0; j < lines.length; j++) {
                        console.log("line " + lines[j]);
                        d3.select("#" + lines[j])
                            .style("background-color", "white");
                    }
                // }
            });
}


//trying to adapt this so that it will draw inside the table
function drawGraph() {
    const pad = 3;
    const width = 20;

    var table = d3.select("#table").select("table");

    table.selectAll("tr")
        .data(data)
        .append("td")
        .append("svg")
        .attr("width", 500)
        .attr("height", 25)
        .selectAll("rect")
        .data(function(d) {
            // console.log("change counts " + d.changeCounts);
            return d.changeCounts;
        })
        .enter()
        .append("rect") 
        .attr("id", function(d,i){
            return "phase" + i;
        })
        .attr("x", function(d, i) { 
            // console.log("d is: " + JSON.stringify(d));
            return d.translate * 20;
        })
        .attr("y",0)
        .attr("width", function(d) { return d.size * 20; })
        .attr("height", 20)
        .attr("fill", function(d, i) { return colors[i] })
}

function getTypeCounts(changeList) {
    var pCount = 0, 
        mpCount = 0, 
        tCount = 0, 
        mtCount = 0;

    for (var i = 0; i < changeList.length; i++) {
        var change = changeList[i];

        
        // console.log(changeList[j]);
        if (changeList[i]["type"] == "p") {
            pCount = pCount + 1;
        } else if (changeList[i]["type"] == "mp") {
            mpCount = mpCount + 1;
        } else if (changeList[i]["type"] == "t") {
            tCount = tCount + 1;
        } else if (changeList[i]["type"] == "mt") {
            mtCount = mtCount + 1;
        }
        
    }

    // return {pCount: pCount, mpCount: mpCount, tCount: tCount, mtCount: mtCount};
    return [{size: pCount, translate: 0}, {size: mpCount, translate: pCount}, {size: tCount, translate: pCount + mpCount}, {size: mtCount, translate: pCount + mpCount + tCount }];

}

function getStructuralChanges(changeList) {
    var sChanges = "";
    for (var i = 0; i < changeList.length; i++) {
        if (changeList[i]["type"] == "p") {
            sChanges += changeList[i]["line"] + ";";
        }
    }
    return sChanges;
}


function getPhaseOverview() {
    for (var i = 1; i < intervalBounds.length; i++) {

        // var changes = [];

        var startTime = intervalBounds[i-1];
        var endTime = intervalBounds[i];
        var sessionEnd = 2506;

        var endIndex = findIndexForTime(intervalBounds[i]);
        var code = codeEntries[endIndex]["code_text"];

        var changeList = getChangeList(code, startTime, endTime, sessionEnd);
        var counts = getTypeCounts(changeList, i-1);


        // build up the right data structure: {comment: commentText, changeCounts: typeCount}
        var phaseEntry = {comment: comments[i-1], changeCounts: counts}
        data.push(phaseEntry);
        // drawViz(counts, getStructuralChanges(changeList), comments[i-1]);

        // console.log(counts);
    }

    // console.log("data is" + JSON.stringify(data));
    drawTable();
    drawGraph();

    calculateStats(sessionEnd);
}

function drawCode() {
    var idx = findIndexForTime(2506);
    var table = d3.select("#code").append("table").style("border", "1px solid black").style("border-collapse", "collapse");
    console.log("code entries: " + JSON.stringify(codeEntries[idx]));
    var codeState = stripLineNumbers(codeEntries[idx]["code_text"]);   
    var lines = codeState.split(/\r?\n/);

    var tablebody = table.append("tbody");
    var rows = tablebody
            .selectAll("tr")
            .data(lines)
            .enter()
            .append("tr")
            .append("td")
            .append("pre")
            .append("span")
            .attr("id", function(d,i){
                return "line" + i;
            })
            .text(function(line) {
                return line;
            })
            .on("mouseenter", function(d,i){
                d3.select(this)
                    .style("background-color", "steelblue");
                var phases = getPhasesForLine("line" + i);
                console.log("highlight " + "line" + i + " " + JSON.stringify(phases));

                for (var j = 0; j < phases["phases"].length; j++) {
                    console.log("phase " + phases["phases"][j]);
                    d3.select("#" + phases["phases"][j])
                        .style("background-color", "steelblue");
                }
            })
            .on("mouseout", function(d,i){
                d3.select(this)
                    .style("background-color", "white");

                var phases = getPhasesForLine("line" + i);
                console.log("highlight " + "line" + i + " " + JSON.stringify(phases));

                for (var j = 0; j < phases["phases"].length; j++) {
                    console.log("phase " + phases["phases"][j]);
                    d3.select("#" + phases["phases"][j])
                        .style("background-color", "white");
                }
            });
}



function getCode() {
    console.log("get code");
    $.get('http://localhost:3000/getCodeText', { offset: offset, order : "ASC", limit : 150 }, 
        function(response){
            codeEntries = response;
            console.log("0th entry" + JSON.stringify(codeEntries[0]));

            // var startIndex = findIndexForTime(intervalBounds[intervalIndex]);
            // var endIndex = findIndexForTime(intervalBounds[intervalIndex + 1]);

            for (var i = 0; i < codeEntries.length; i++) {
                record(codeEntries[i]["code_text"], codeEntries[i]["time"]);
            }

            getPhaseOverview();
            drawCode();


            var idx = findIndexForTime(2506);
            var codeState = stripLineNumbers(codeEntries[idx]["code_text"]);   
            findPhasesForLines(codeState, 2506);
            findLinesForPhases();
    });
}

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






