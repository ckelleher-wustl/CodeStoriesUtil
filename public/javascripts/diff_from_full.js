var codeEntries = {};
var offset = 0;
var index = 1;

var codeFiles = {};

let span = null;

// the idea here is that we'll get the original code and then search for the best match for a snippet of code by
// looking at the best matches for individual lines and forming the tightest clusters of those lines

// goal #2 - showdiff method is where things need to start happening. first thing is to break both code snippets into lines.
// goal #1 - strip down what's here to make it make sense for the current situation.

// what needs to happen here
// for each line in code snippet:
//      find matches in full code - record line# match & strength

    
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

function breakIntoLines(code) {
    var lines = code.split(/\r?\n/);
    return lines;
}

function getAnchors(origLines, snippetLines){
    var anchors = {};

    for (var snippetLine = 0; snippetLine < snippetLines.length; snippetLine++ ) {

        // find the best match for line within the existing lines of code (codeLines)
        var bestMatch = stringSimilarity.findBestMatch(snippetLines[snippetLine], origLines);
        var rating = bestMatch["bestMatch"]["rating"];

        // anchor lines are ones that have a rating of 1 and don't have other perfect matches
        if (rating == 1) {

            var perfectMatchCnt = 0;
            for (var matchIdx = 0; matchIdx < bestMatch["ratings"].length; matchIdx++) {
                if (bestMatch["ratings"][matchIdx]["rating"] > 0.6) {
                    perfectMatchCnt += 1;
                }
            }

            if (perfectMatchCnt == 1) {
                console.log(([snippetLine, bestMatch["bestMatchIndex"]]));
                anchors[snippetLine] = bestMatch["bestMatchIndex"];
            }

        }

    }
    return anchors;

}

function matchUpLines(origLines, snippetLines, anchors){

    var clusters = [];
    var currentCluster = [];
    var lastIdx = -1;

    var keys = Object.keys(anchors)
    for (var key in keys) {

        // if the current cluster is empty, then add this anchor
        if (lastIdx == -1) {
            lastIdx = keys[key];
            currentCluster.push( [ lastIdx, anchors[keys[key]] ]);       
        
        // if the next key is adjacent to the last one and the mapping is after the previous mapping
        } else if ( ((parseInt(currentCluster[currentCluster.length-1][0]) + 1) == keys[key]) && (currentCluster[currentCluster.length-1][1] < anchors[keys[key]]) ) {
            lastIdx = keys[key];
            currentCluster.push([ lastIdx, anchors[keys[key]] ] );

        //  look for an appropriate mapping in the returned results
        } else  {

            var bestMatch = stringSimilarity.findBestMatch(snippetLines[keys[key]], origLines);

            // iterate through the matches
            for (var matchIdx = 0; matchIdx < bestMatch["ratings"].length; matchIdx++) {
                //  if the current matchIdx > the match for the last thing in the cluster
                if ((matchIdx > currentCluster[currentCluster.length-1][1]) && (bestMatch["ratings"]["rating"] > 0.6)) {
                    currentCluster.push([keys[key], matchIdx]);
                    lastIdx = keys[key];
                }
            }

            // if we weren't able to match this one, then it should start a new cluster with its top match
            // TODO: circumstances where there just isn't a good match
            if (lastIdx != keys[key]) {
                clusters.push(currentCluster);
                currentCluster = [[keys[key], bestMatch["bestMatchIndex"]]];
                lastIdx = keys[key];
            }
        }
    }

    clusters.push(currentCluster);
    console.log("ALL CLUSTERS " + JSON.stringify(clusters));
    for (var i = 0; i < clusters.length; i++) {
        console.log(i + ": " + JSON.stringify(clusters[i]));
    }
    // console.log("CURRENT CLUSTER " + JSON.stringify(currentCluster));

    return clusters;

}

function checkNeighborBelow(origLines, snippetLines, clusterToGrow, lineNumber) {
    // find the match data for snippetLine[lineNumber] within codeLines
    var bestMatch = stringSimilarity.findBestMatch(snippetLines[lineNumber], origLines);
    var clusterLowerMatch = clusterToGrow[0][1];
   
    // find the match that is the closest in index to the
    for (var matchIdx = bestMatch["ratings"].length-1; matchIdx >= 0; matchIdx--) {
        if ( (bestMatch["ratings"][matchIdx]["rating"] > 0.5) && (matchIdx< clusterLowerMatch) ) {

            // prepend this onto the cluster List.
            clusterToGrow.unshift( [ lineNumber.toString(), matchIdx ]);
            console.log("\t DOWN" + lineNumber + ":" + "match :" + matchIdx + " " + bestMatch["ratings"][matchIdx]["target"].trim() + " " + bestMatch["ratings"][matchIdx]["rating"]);
            break;
        } else {
            // console.log("down NOPE:" + bestMatch["ratings"][matchIdx]["rating"] + " " + matchIdx + " < " + clusterLowerMatch);
        }
    }

    return clusterToGrow;
}

function checkNeighborAbove(origLines, snippetLines, clusterToGrow, lineNumber) {
    // console.log("lineNumber " + lineNumber);
    // console.log("snippet Lines " + JSON.stringify(snippetLines[lineNumber]));
    // console.log("code lines: " + JSON.stringify(origLines));

    // find the match data for snippetLine[lineNumber] within codeLines
    if (snippetLines[lineNumber].length > 0) {
        var bestMatch = stringSimilarity.findBestMatch(snippetLines[lineNumber], origLines);
        var clusterLowerMatch = clusterToGrow[clusterToGrow.length-1][1];
    
        // find the match that is the closest in index to the
        for (var matchIdx = 0; matchIdx < bestMatch["ratings"].length-1; matchIdx++) {
            if ( (bestMatch["ratings"][matchIdx]["rating"] > 0.5) && (matchIdx> clusterLowerMatch) ) {

                // prepend this onto the cluster List.
                clusterToGrow.push( [ lineNumber.toString(), matchIdx ]);
                console.log("\t UP" + lineNumber + ":" + "match :" + matchIdx + " " + bestMatch["ratings"][matchIdx]["target"].trim() + " " + bestMatch["ratings"][matchIdx]["rating"]);
                break;
            }
        }
    }
    return clusterToGrow;
}

function growCluster(origLines, snippetLines, clusterToGrow) {

    var clusterLowerBound = clusterToGrow[0][0];
    var clusterUpperBound = clusterToGrow[clusterToGrow.length-1][0];

    console.log("GROW CLUSTER: " +   JSON.stringify(clusterToGrow) + " mapped from " + clusterLowerBound +  " to " + clusterUpperBound );

    // need to grow down
    if (clusterLowerBound > 1) {
        console.log("check down " + (parseInt(clusterUpperBound)+1));
        clusterToGrow = checkNeighborBelow(origLines, snippetLines, clusterToGrow, parseInt(clusterLowerBound)-1);
    } 
    
    // try to grow up
    if (clusterUpperBound < snippetLines.length) {
        clusterToGrow = checkNeighborAbove(origLines, snippetLines, clusterToGrow, parseInt(clusterUpperBound)+1);
    }

    console.log("NEW (BIGGER?) CLUSTER " + JSON.stringify(clusterToGrow));
    console.log("\n");
    return clusterToGrow;

}

const merged = 0; // two adjoining clusters have been merged.
const cant_merge = 1; // two clusters are adjoining, but incompatible and can't be merged.
const disconnected = 2; // two clusters are not yet adjoining.

function glueClusters(firstCluster, secondCluster) {

    // ok so to glue these together, we want to determine whether they are either adjoining or off by one.
    var endOfFirst = firstCluster[firstCluster.length-1][0];
    var startOfSecond = secondCluster[0][0];

    var endFirstMap = firstCluster[firstCluster.length-1][1];
    var startSecondMap = secondCluster[0][1];

    if (endOfFirst == startOfSecond) {
        console.log("MERGE: Same index in both");   

        if (endFirstMap == startSecondMap) {
            secondCluster = firstCluster.slice(0,firstCluster.length-1).concat( secondCluster);
            // console.log("cluster slice: " + JSON.stringify(firstCluster.slice(0,firstCluster.length-1)));
            console.log("MERGED CLUSTER " + JSON.stringify(secondCluster));
            return { status: merged, cluster: secondCluster };

        } else {
            console.log("CAN'T MERGE CLUSTERS first: " + endFirstMap + " " + startSecondMap);
            return { status: cant_merge, cluster: null };
        }

    } else if (endOfFirst + 1 == startOfSecond) {
        console.log("MERGE: endFirst adjoins startSecond");

        if (endFirstMap < startOfSecond) {
            secondCluster = firstCluster.slice(0,firstCluster.length).concat(secondCluster);
            console.log("MERGED CLUSTER " + JSON.stringify(secondCluster));
            return { status: merged, cluster: secondCluster };
        } else {
            console.log("CAN'T MERGE CLUSTERS");     
            return { status: cant_merge, cluster: null };
        }
    }

    return { status: disconnected, cluster: null };

}

function printClusters(clusters) {
    for (var i = 0; i < clusters.length; i++) {
        console.log(i + ": " + JSON.stringify(clusters[i]));
    }
}

// so now we have clusters but we need to find the intermediate things to match up?
function mergeClusters(origLines, snippetLines, currentClusters) {
    var disconnectedCnt = currentClusters.length-1;
    var clustersToDelete = [];
    for (var cnt = 0; cnt < 5; cnt++) {
    // while (disconnectedCnt > 0) {
        disconnectedCnt = 0;
        clustersToDelete = [];

        // expand all of the clusters
        for (var i = 0; i < currentClusters.length; i++) {
            currentClusters[i] = growCluster(origLines, snippetLines, currentClusters[i]);
        }
    
        // then try to connect them
        for (var i = 0; i < currentClusters.length-1; i++) {
            var firstCluster = currentClusters[i];
            var secondCluster = currentClusters[i+1];

            // console.log("first " + JSON.stringify(firstCluster));
            // console.log("second " + JSON.stringify(secondCluster));

            var status = glueClusters(firstCluster, secondCluster);
           
            if (status["status"]==disconnected) {
                disconnectedCnt++;
            } else if (status["status"] == merged) {
                clustersToDelete.push(i);
                currentClusters[i+1] = status["cluster"]
                console.log("POST GLUE " + JSON.stringify(currentClusters[i+1]));
            }
        }

        // remove the clusters that have been merged into something else
        for(var i = 0; i < clustersToDelete.length; i++) {
            var removedClusters = currentClusters.splice(clustersToDelete[i], 1);
        }
        console.log("FINAL CLUSTERS: " );
        printClusters(currentClusters);
        console.log("CLUSTERS TO DELETE: " + clustersToDelete);
        console.log("#Disconnected Clusters: " + disconnectedCnt);
    }
}

function getMinMaxLines(currentClusters) {
    var min = -1;
    var max = -1;
    for (var i = 0; i < currentClusters.length; i++) {
        var cluster = currentClusters[i];

        if ((min == -1) || (cluster[0][1] < min)) {
            min = cluster[0][1];
        }

        if ((max == -1) || (cluster[cluster.length - 1][1] > max)) {
            max = cluster[cluster.length-1][1];
        }
    }

    return {min: min, max: max};

}

function showDiff(origCode, snippet) {

    var origLines = breakIntoLines(origCode);
    var snippetLines = breakIntoLines(snippet);

    var anchors = getAnchors(origLines, snippetLines);
    // console.log("anchors " + JSON.stringify(anchors));

    var currentClusters = matchUpLines(origLines, snippetLines, anchors);

    mergeClusters(origLines, snippetLines, currentClusters);

    // document.getElementById('diff').innerHTML = "";
    for (var clusterIdx in currentClusters) {
        var cluster = currentClusters[clusterIdx];

        var slice = origLines.slice( cluster[0][1], cluster[cluster.length-1][1]);
        var origSliceCode = "";
        for (var line in slice){
            origSliceCode += slice[line] + "\n";
        }

        slice = snippetLines.slice( parseInt(cluster[0][0]), parseInt(cluster[cluster.length-1][0]));
        var snippetSliceCode = "";
        for (var line in slice){
            snippetSliceCode += slice[line] + "\n";
        }
 
        console.log("snippetSliceCode=\n" +snippetSliceCode);
        var diff = Diff.createTwoFilesPatch("Original Code", "Snippet Mod", origSliceCode, snippetSliceCode,null,null,{context:100, ignoreWhitespace: true});
        // console.log(diff)
        var diffHtml = Diff2Html.html(diff, {
            drawFileList: false,
            //matching: 'words',
            outputFormat: 'side-by-side',
        });
        document.getElementById('diff').innerHTML += diffHtml;
    }

    var bounds = getMinMaxLines(currentClusters);
    console.log("BOUNDS " + JSON.stringify(bounds));
    console.log("MIN " + origLines[bounds["min"]]);
    console.log("MAX " + origLines[bounds["max"]-1]);

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
        updateOriginalCode("person", data);
    });
    jQuery.get('http://localhost:8000/public/initialcode/server.txt', function(data) {
        updateOriginalCode("server", data);
    });
    jQuery.get('http://localhost:8000/public/initialcode/test.txt', function(data) {
        updateOriginalCode("test", data);
    });
}

function updateOriginalCode(filename, code_text) {
    codeFiles[filename] = code_text;
    if (codeEntries[index]) {
        updateCodeDisplay();
    }
}

function updateCodeDisplay() {
    // get current code
    var codeState = codeEntries[index]["code_text"];

    // figure out which code file was edited
    var notes = codeEntries[index]["notes"];
    var filename = notes.substring(notes.indexOf(": ")+2, notes.indexOf(".py"))
    
    // get the code for filename
    var origCode = ""
    if (filename && (codeFiles[filename])) {
        if (filename == "client") {
            filename = "test";
        }
        origCode = codeFiles[filename];
        console.log("FOUND " + filename);
    } else {
        console.log("NOT FOUND!!!! " + filename);
    } 
    document.getElementById('diff').innerHTML = filename + ":";
    showDiff(origCode, codeState);

    // if this is not the first interval, show events in between
    if (index > 0) {
        var startTime = codeEntries[index-1]["time"];
        var endTime = codeEntries[index]["time"];
        getComments(startTime, endTime);
    }
}

function showNextEntry() {
    index = index + 1;
    if (index >= codeEntries.length) {
        offset = codeEntries[codeEntries.length-1]["time"];
        index = 1;
        getCode();

        console.log("offset is: " + offset);
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