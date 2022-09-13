class GitHistory {

    
    constructor() {
  
    }


    // this should get the first <limit> events starting between offset and end,
    async getEntries(sourceVideoID, offset, end, order, limit) {

    }

    async getEventList(sourceVideoID, offset, order) {
       
    }

    async getCodeText(sourceVideoID, offset, order, limit) {

    }

    async getCommentsInRange(sourceVideoID, startTime, endTime) {
        return ("ERROR: No comments recorded")
    }

    async getCodeInRange(startTime, endTime) {
        
    }

    async getSearchesInRange(startTime, endTime) {
       
    }


    async newEntry(sourceVideoID, data, time) {
        return ("ERROR: can't add entries to git history")
    }

    async deleteEntry(eventID) {
       return ("ERROR: can't modify git history")
    }
  
    async getMaxEventID() {     
        return ("ERROR: not needed" );
    }

    async recordCodeInfo(codeImage, codeText) {  
        return ("ERROR: no recording to git history ");
    }

    async recordWebInfo(webImage) {
        return ("ERROR: no recording to git history ");
    }

    async updateOcrBox(eventID, coords) {
        return ("ERROR: no recording to git history ");
    }

    async updateCodeText(eventID, code_text) {
        return ("ERROR: no recording to git history ");
    }
    

  }
  
  module.exports = GitHistory;
