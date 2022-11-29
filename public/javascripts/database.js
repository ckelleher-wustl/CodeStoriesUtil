var sqlite3 = require('sqlite3').verbose()
const util    = require('util'); // this gives me promisify for libraries that only have callback structures.

const DBSOURCE = "db.sqlite"


class CodingDB {

    //TODO: make this pay attention to the file being passed in.
    constructor(dbFile) {
    //   this.name = name;
        this.db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE, err => {
            if (err) {
                return console.error(err.message);
            }
            console.log('Connected to SQLite test db!')
        });
        this.db.run = util.promisify(this.db.run);
        this.db.get = util.promisify(this.db.get);
        this.db.all = util.promisify(this.db.all);
    }

    // // This should get removed once everything is shifted over.
    // async getDB() {
    //     return this.db;
    // }

    async getEntries(sourceVideoID, offset, end, order, limit) {
        // (videoID, timed_url, time, notes) VALUES(2, "test.html", 123, "These are some witty observations");
        console.log("interval " + offset + " - " + end);
        let sql = '';
        if (end == 0) {
            sql = 'SELECT eventID as id, timed_url as timed_url, time as time, notes as notes, img_file as img_file, code_text as code_text, coords as coords FROM CodingEvents \
            WHERE time>=' + offset + ' ORDER BY time ' + order + ' LIMIT ' + limit;
        } else {
            sql = 'SELECT eventID as id, timed_url as timed_url, time as time, notes as notes, img_file as img_file, code_text as code_text, coords as coords FROM CodingEvents \
            WHERE time>=' + offset + ' AND time<=' + end + ' ORDER BY time ' + order;
        }

            //WHERE time>=" + offset + "
        try {
            const rows = await this.db.all(sql, []);
            console.log("returning entries...");
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getEventList(sourceVideoID, offset, order) {
        // (videoID, timed_url, time, notes) VALUES(2, "test.html", 123, "These are some witty observations");
        let sql = 'SELECT time as time, notes as notes, img_file as img_file FROM CodingEvents \
        WHERE time>=' + offset + ' ORDER BY time ' + order;

            //WHERE time>=" + offset + "
        try {
            const rows = await this.db.all(sql, []);
            console.log("returning entries...");
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getCodeText(sourceVideoID, offset, order, limit) {
        console.log("offset " + offset);
        console.log("order " + order);
        console.log("limit " + limit);
        // (videoID, timed_url, time, notes) VALUES(2, "test.html", 123, "These are some witty observations");
        let sql = 'SELECT eventID as id, time as time, code_text as code_text, notes as notes FROM CodingEvents \
        WHERE (code_text IS NOT NULL AND LENGTH(code_text) > 0) AND NOT(notes LIKE "%output:%") AND time>=' + offset + ' ORDER BY time ' + order + ' LIMIT ' + limit;
        console.log(sql);

            //WHERE time>=" + offset + "
        try {
            const rows = await this.db.all(sql, []);
            console.log("returning entries...");
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getCommentsInRange(sourceVideoID, startTime, endTime) {
        let sql = 'SELECT eventID as id, time as time, notes as notes FROM CodingEvents \
        WHERE code_text IS NULL AND time>=' + startTime + ' AND time<=' + endTime + ' ORDER BY time ASC';
        console.log(sql);

            //WHERE time>=" + offset + "
        try {
            const rows = await this.db.all(sql, []);
            console.log("returning entries...");
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getCodeInRange(startTime, endTime) {
        let sql = 'SELECT eventID as id, time as time, notes as notes, code_text as code_text FROM CodingEvents \
        WHERE (code_text IS NOT NULL AND LENGTH(code_text)>0) AND NOT(notes LIKE "%output:%") AND time>=' + startTime + ' AND time<=' + endTime + ' ORDER BY time ASC';
        console.log(sql);

        try {
            const rows = await this.db.all(sql, []);
            console.log("returning entries...");
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async getSearchesInRange(startTime, endTime) {
        let sql = 'SELECT eventID as id, time as time, notes as notes, img_file as img_file FROM CodingEvents \
        WHERE (notes LIKE "%visit:%" or notes LIKE "search:%" ) AND time>=' + startTime + ' AND time<=' + endTime + ' ORDER BY time ASC';
        console.log(sql);

        try {
            const rows = await this.db.all(sql, []);
            console.log("returning entries...");
            return rows;
        } catch (err) {
            return ("ERROR: " + err);
        }
    }


    async newEntry(sourceVideoID, data, time) {
        //TODO in the future the "RETURNING" clause at the end of the statement might be used to return the eventID and remove the need
        // for another db lookup.
        var sql ='INSERT INTO CodingEvents (videoID, timed_url, time, notes) VALUES (?,?,?,?)'
        var params =[sourceVideoID, data.timedurl, time, data.comment]

        try {
            this.db.run(sql, params);
            console.log("added new entry at time=" + time)
            return "success";
        } catch (err) {
            return ("ERROR: " + err);
        }
    }

    async deleteEntry(eventID) {
        var sql ='DELETE FROM CodingEvents WHERE eventID = ?' 
        var params =[eventID]

        try {
            this.db.run(sql, params);
            return "success";
        } catch(err) {
            return("ERROR: " + err);
        }
    }
  
    async getMaxEventID() {
        var sql = "SELECT max(eventID) as id FROM CodingEvents";
        
        try{ 
            var id = -1;
            const result = await this.db.all(sql, []);
            result.forEach((row) => {
                id = row.id
            });
            console.log("returning max_id: " + id);
            return id;
    
        } catch( err ) {
            return ("ERROR: " + err);
        }
    }

    async recordCodeInfo(codeImage, codeText) {
        
        const id = await this.getMaxEventID(); 
        console.log("id value is " + id);
    
        var sql = "UPDATE CodingEvents SET img_file = ?, code_text = ? WHERE eventID = ?"
        var params =[codeImage, codeText, id]
    
        try{    
            const result = await this.db.all(sql, params);
            console.log("db updated : " + result);
        } catch( err ) {
            return ("ERROR: " + err);
        }
    }

    async recordWebInfo(webImage) {

        console.log("RECORD WEB INFO");
        
        const id = await this.getMaxEventID(); 
        console.log("id value is " + id);
    
        var sql = "UPDATE CodingEvents SET img_file = ? WHERE eventID = ?";
        var params =[webImage, id];

        console.log("SQL = " + sql + " " + params);
    
        try{    
            const result = await this.db.all(sql, params);
            // console.log("db prepare  " );
            // const result = db.prepare(sql, params).all();
            console.log("db updated : " + result);
        } catch( err ) {
            return ("ERROR: " + err);
        }
    }

    async updateOcrBox(eventID, coords) {
        
        console.log("set coords to" + coords + " for " + eventID);
    
        var sql = "UPDATE CodingEvents SET coords = ? WHERE eventID = ?"
        var params =[coords, eventID]
    
        try{    
            const result = await this.db.all(sql, params);
            console.log("db updated : " + result);
        } catch( err ) {
            return ("ERROR: " + err);
        }
    }

    async updateCodeText(eventID, code_text) {
        
        console.log("updating code_text for " + eventID);
    
        var sql = "UPDATE CodingEvents SET code_text = ? WHERE eventID = ?"
        var params =[code_text, eventID]
    
        try{    
            const result = await this.db.all(sql, params);
            console.log("db updated : " + result);
        } catch( err ) {
            return ("ERROR: " + err);
        }
    }
    

    // function closeDB() {
//     db.close((err) => {
//         if (err) {
//             return console.error(err.message);
//         }
//         console.log("SQLite test db connection closed.")
//     })
// }

  }
  
  module.exports = CodingDB;



