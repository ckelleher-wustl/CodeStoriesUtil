import {setCanvas, setCoordString, getCoordString} from "./selectionBox.js"

var dbEntries = {};
var dbIndex = 0;
var offset = 0;

var evt = null;
var m = null;


$( document ).ready(function() {
    console.log( "ready!" );
    getData();


    setCanvas(document.getElementById('overlay-canvas'));
    // setCanvas($('#overlay-canvas'));
    var myImg = document.querySelector("#code-img");
    setCoordString("975;110;925;965", myImg.naturalWidth);

    $('#get-data-btn').on( "click", function(){
        getData();
    } );
    $('#show-prev-btn').on( "click", function(){
        showPreviousEntry();
    } );
    $('#show-next-btn').on( "click", function(){
        showNextEntry();
    } );
    $('#show-current-btn').on( "click", function(){
        updateCurrentEntry();
    } );

    $('#update-code-text').on( "click", function(){
        updateCodeText();
    } );
    $('#update-ocr-box').on( "click", function(){
        updateOCRBox();
    } );

    createMagnifier('public/images/testCode.png');
    
});

function createMagnifier(imagePath) {
    evt = new Event();

    m = new Magnifier(evt);
    console.log(m);
    m.attach({
        thumb: '#thumb',
        large: imagePath,
        largeWrapper: 'preview',
        zoom: 2,
        zoomable: true
    });
}

function updateDisplay() {
    // update image and code elements
    console.log(dbIndex + " < " + (Object.keys(dbEntries).length) + " " + Object.keys(dbEntries));
    console.log("code-img: " + dbEntries[dbIndex]["img_file"]);
    $( "#code-editor" ).val(dbEntries[dbIndex]["code_text"]);
    $('#code-img').attr("src","public/images/onlineChat/" + dbEntries[dbIndex]["img_file"]);

    $(".magnifier-thumb-wrapper").remove();
    $(".magnifier-preview").remove();


    var url = "public/images/onlineChat/" + dbEntries[dbIndex]["img_file"];
    var time = dbEntries[dbIndex]["time"];
    $('#zoom-ui').append(`<a href=${url} style="width: fit-content" class="magnifier-thumb-wrapper">Time=${time}</a>`);
    $('.magnifier-thumb-wrapper').append(`<img src=${url} id="thumb" style="width: 200px; height 266px"/>`);
    $('#zoom-ui').append('<div class="magnifier-preview" id="preview" style="width: 400px; height: 266px; display: inline-block">Code Zoom</div>');

    createMagnifier(url);

    

    // set the coord string the selection ui
    var boxCoords = dbEntries[dbIndex]["coords"];
    console.log("checking null");
    if (boxCoords == null) {
        console.log("setting default box size");
        boxCoords = "975;110;925;965";
    }
    console.log("coords " + boxCoords);
    var myImg = document.querySelector("#code-img");
    myImg.decode().then(() => {
        setCoordString(boxCoords, myImg.naturalWidth);
    });
   
}

function updateCodeText() {

    console.log("eventID: " + dbEntries[dbIndex]["id"]);
    console.log("code: " + $('#code-editor').val());

    $.ajax({
        url: "http://localhost:3000/updatecodetext", 
        data: {eventID: dbEntries[dbIndex]["id"], code_text: $('#code-editor').val()},
        method: 'POST',
        contentType: "application/x-www-form-urlencoded"
      }).done(function(response){
        console.log("SUCCESS: " + JSON.stringify(response));
      });

}

function updateOCRBox() {

    var myImg = document.querySelector("#code-img");
    var newCoords = getCoordString(myImg.naturalWidth);

    console.log("update..." + newCoords ); //+ " id:" + dbEntries[dbIndex]["id"] + " img:" + dbEntries[dbIndex]["img_file"]);

    $.ajax({
        url: "http://localhost:3000/updateocrbox", 
        data: {eventID: dbEntries[dbIndex]["id"], coords: newCoords, img_file: dbEntries[dbIndex]["img_file"]},
        method: 'POST',
        contentType: "application/x-www-form-urlencoded"
    }).done(function(response){
        console.log("SUCCESS: " + JSON.stringify(response));
    });
}

// display the data we are now getting from dbEntries in the appropriate spots.
function showNextEntry() {
  dbIndex = dbIndex + 1;

  if (dbIndex >= dbEntries.length) {
    dbIndex = dbEntries.length - 1;
    offset = dbEntries[dbEntries.length-1]["time"];
    getData();
    dbIndex = 0;
    console.log("offset now: " + offset)
  }
  updateDisplay();
}

function showPreviousEntry() {
  dbIndex = dbIndex - 1;

  if (dbIndex < 0 ) {
    dbIndex = 0;
  }
  updateDisplay();
}

function updateCurrentEntry() {
    updateDisplay();
}

function getData() {
    $.get('http://localhost:3000/', { offset: offset, order : "ASC"}, 
        function(response){
            dbEntries = response;
            console.log("0th entry" + JSON.stringify(dbEntries[0]));
    });
}
