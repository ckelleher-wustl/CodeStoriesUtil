const fs = require('fs'); // reading the screencap file directory
const util = require('util'); // this gives me promisify for libraries that only have callback structures.
const createworker = require('tesseract.js') // this is for OCR


class OCR {
    constructor() {
        fs.readdir = util.promisify(fs.readdir);
    }

    getCodeImage(directory) {
        // var directory = 'C:/Users/ckelleher/Downloads/screencap'; 

        let files = fs.readdirSync( directory ); // You can also use the async method
        let filesWithStats = [];
        let mostRecentCodeImage = '';
        if( files.length > 1 ) {
            let sorted = files.sort((a, b) => {
                let s1 = fs.statSync(directory + "/" + a);
                let s2 = fs.statSync(directory + "/" + b);
                return s1.ctime < s2.ctime;
            });
            sorted.forEach(file => {
                filesWithStats.push({
                    filename: file,
                    date: new Date(fs.statSync(directory + "/" + file).ctime),
                    path: directory + "/" + file
                });
            });

            var last = filesWithStats.length-1;
            mostRecentCodeImage = filesWithStats[last]['filename'];
            console.log("returning " + mostRecentCodeImage);
        }

       
    
        // try {
        //     const result = await fs.readdir(directory); 
        //     var last = result.length-1;
        //     var mostRecentCodeImage = result[last];
        //     console.log("returning " + mostRecentCodeImage);
        // } catch (err ) {
        //     return ("ERROR: " + err);
        // }
            
         return mostRecentCodeImage;   
    }

    //HERE: right now the new recognition box isn't actually getting used. So like fix that.

    // note the movement of recognition into getCodeTextForImage has not been tested in the call from getCodeText
    async getCodeTextForImage(codeImageName, directory, coordString) {
        console.log("codeImageName " + codeImageName);
        console.log("coords " + coordString);

        var coords = coordString.split(";");
        // console.log(coords);

        var upperX = parseInt(coords[0]);
        var upperY = parseInt(coords[1]);
        var lowerX = parseInt(coords[0]) + parseInt(coords[2]);
        var lowerY = parseInt(coords[1]) + parseInt(coords[3]);

        const worker = createworker.createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        console.log("initialized worker, starting recognize task..." + codeImageName + " " + upperX + " " + upperY + " " + (lowerX-upperX));
        // const { data: { text } } = await worker.recognize('C:/Users/ckelleher/Downloads/screencap/' + files[last]);
        const { data: { text } } = await worker.recognize(directory + "/" + codeImageName, {
            rectangle: { top: upperY, left: upperX, width: (lowerX-upperX), height: (lowerY-upperY) },
          });
        console.log(text);
    
        return { codeImage: codeImageName, codeText: text };
    }

    async getCodeText(directory) {
        // const worker = createworker.createWorker();
        var codeImageName = this.getCodeImage(directory);
        // await codeImageName;

        console.log("got codeImage " + codeImageName);

        return this.getCodeTextForImage(codeImageName, directory, "110;975;965;925");
        // await worker.load();
        // await worker.loadLanguage('eng');
        // await worker.initialize('eng');
        // console.log("initialized worker, starting recognize task...");
        // // const { data: { text } } = await worker.recognize('C:/Users/ckelleher/Downloads/screencap/' + files[last]);
        // const { data: { text } } = await worker.recognize(directory + "/" + codeImageName, {
        //     rectangle: { top: 110, left: 975, width: 965, height: 925 },
        //   });
        // console.log(text);
    
        // return { codeImage: codeImageName, codeText: text };
    }
}

module.exports = OCR;