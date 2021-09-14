    

    var dragging = false;   //  lower square is currently dragging
    var draggingUpper = false;  // upper square is currently dragging

    var dragX = 0;  // drag start X
    var dragY = 0;  // drag start Y
    var diffX = 0;  // diff btwn currentX and dragX
    var diffY = 0;  // diff btwn currentY and dragY

    // bounds of current selection rectangle
    var upperX = 0;
    var upperY = 0;
    var lowerX = 0;
    var lowerY = 0;

    var canvas = null;


    var chatty = true;

    function isBetween(num, lowerBound, upperBound) {
        if ((num > lowerBound) & (num < upperBound)) {
            return true;
        } else {
            return false;
        }
    }

    // obviously the hard corded magic numbers need to come out when the interwebs are back to functioning.
    function startDragUpper(event) {
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        if (chatty) {
            console.log(rect.left + ", " + rect.top);
        }
        if ( isBetween(x, upperX - 5, upperX + 5) & isBetween(y, upperY - 5, upperY + 5) ) {
        return true;
        } else {
        return false;
        }
    }

    function startDragLower(event) {
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        if (chatty) {
            console.log(rect.left + ", " + rect.top);
        }
        if ( isBetween(x, lowerX - 5, lowerX + 5) & isBetween(y, lowerY - 5, lowerY + 5) ) {
        return true;
        } else {
        return false;
        }
    }

    function onMouseDown(event) {
        if (chatty) {
            console.log("mouse down : " + event.clientX + " " + event.clientY);
        }

        var startUpperDrag = startDragUpper(event);
        var startLowerDrag = startDragLower(event);
        if (startUpperDrag || startLowerDrag) {
        
            if (chatty) {
                console.log("starting drag... " + event.clientX + ", " + event.clientY );
            }    
            dragX = event.clientX;
            dragY = event.clientY;
            dragging = true;

            if(startUpperDrag) {
                draggingUpper = true;
            } else {
                draggingUpper = false;
            }
        }
    }

    function drawBox() {
        // var canvas=document.getElementById("overlay-canvas"),
        if (!canvas) {
            console.log("please call setCanvas with the canvas to draw on")
        }
        var ctx = canvas.getContext("2d");

        canvas.width = 640;
        canvas.height = 500;

        console.log("drawing " + upperX + " " + upperY + " " + (lowerX-upperX) + " " + (lowerY-upperY)); 
        // draw current selection box (red)
        ctx.strokeStyle = "#FF0000";
        ctx.strokeRect(upperX, upperY, lowerX-upperX, lowerY-upperY);

        ctx.fillStyle = '#FF0000';
        ctx.fillRect(upperX-5, upperY-5, 10, 10);
        ctx.fillRect(lowerX-5, lowerY-5, 10, 10);

        // draw dragging selection box (blue)
        if (dragging) {
            ctx.fillStyle = '#0000FF';
            if (draggingUpper) {
                ctx.fillRect(upperX + diffX - 5, upperY + diffY - 5, 10, 10);
                ctx.strokeStyle = "#0000FF";
                ctx.strokeRect(upperX + diffX, upperY + diffY, lowerX-upperX-diffX, lowerY-upperY-diffY);
            } else {
                ctx.fillRect(lowerX + diffX - 5, lowerY + diffY - 5, 10, 10);
                ctx.strokeStyle = "#0000FF";
                ctx.strokeRect(upperX, upperY, lowerX+diffX-upperX, lowerY +diffY -upperY);
            }    
        }
    }

    function onMouseMove(event) {
        if (dragging){
            diffX = event.clientX - dragX;
            diffY = event.clientY - dragY
            console.log("dragging... " + (diffX) + " " + (diffY) );
            drawBox();
        }
    }

    function onMouseUp(event) {
        if (dragging) {
            console.log("mouse up... " + (event.clientX - dragX) + " " + (event.clientY - dragY) );
            dragging = false;

            if (draggingUpper) {
                upperX = upperX + diffX;
                upperY = upperY + diffY;
            } else {
                lowerX = lowerX + diffX;
                lowerY = lowerY + diffY;
            }

            drawBox();
        }
    }

    // this sets the target canvas and sets up the necessary mouse listeners
    export function setCanvas(targetCanvas) {
        canvas = targetCanvas;
        console.log("context " + canvas.getContext("2d"));
        canvas.addEventListener("mousedown", onMouseDown, false);
        canvas.addEventListener("mousemove", onMouseMove, false);
        canvas.addEventListener("mouseup", onMouseUp, false);
        // canvas.on("mousedown", function(e) {onMouseDown(e)});
        // canvas.mousemove(function(e) {onMouseMove(e)});
        // canvas.mouseup(function(e) {onMouseUp(e)});

        console.log("added selection box listeners.")
    }

    export function getCoordString(imgNaturalWidth) {
        var scale = imgNaturalWidth/ 640;
        var newCoords = Math.floor(upperX  * scale)+ ";" + Math.floor(upperY * scale) + ";" + Math.floor((lowerX - upperX)*scale) + ";" + Math.floor((lowerY - upperY)*scale);
        return newCoords;
    }

    export function setCoordString(coordString, imgNaturalWidth) {
        var coords = coordString.split(";");

        console.log("coordString " + coordString + " " + imgNaturalWidth);

        // var myImg = document.querySelector("#code-img");
        var scale = imgNaturalWidth/ 640;
        upperX = parseInt(coords[0])/scale;
        upperY = parseInt(coords[1])/scale;
        lowerX = (parseInt(coords[0]) + parseInt(coords[2]))/scale;
        lowerY = (parseInt(coords[1]) + parseInt(coords[3]))/scale;

        console.log("coords to draw " + upperX + " " + upperY + " " + (lowerX-upperX) + " " + (lowerY-upperY)); 

        drawBox();
    }

    export function printSelectionBox() {
        console.log("upperX " + upperX);
        console.log("upperY " + upperY);
        console.log("lowerX " + lowerX);
        console.log("lowerY " + lowerY);
    }
    


// module.exports = selectionBox;


