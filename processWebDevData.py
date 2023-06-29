import re
import pandas as pd
import os
import sqlite3

# webDevOutput.txt refers to additional web dev data captured every time user saves a web dev related file
DATA_FILE_PATH = r'/Users/pham/Downloads/new-app/webDevOutput.txt'

# output file name (using db so that we could combine with the git data later)
DB_FILE_NAME = 'user_addlWebDevData.db'

def getIndividualFileSaveData(file_path, begin_marker, end_marker):
    try:
        each_file_save_data = []
        with open(file_path, 'r') as f:
            saved_data = ''
            for line in f:
                if line == begin_marker:
                    continue
                elif line == end_marker:
                    each_file_save_data.append(saved_data)
                    saved_data = ''
                else:
                    saved_data += line
        return each_file_save_data
    except Exception as e:
        print(e)

def processFileSaveData(each_file_save_data):
    try:
        save_data = {"file": "", "time": "", "content": "", "terminal": ""}
        done_with_file_content = False
        for line in each_file_save_data.splitlines():
            # first line is the file name
            if line == each_file_save_data.splitlines()[0]:
                file_save_path = line
                # remove the root path from the file path
                if file_save_path.startswith(root_path):
                    file_save_path = os.path.relpath(file_save_path, root_path)
                save_data["file"] = file_save_path
            # second line is the time stamp
            elif line == each_file_save_data.splitlines()[1]:
                time_stamp = line
                save_data["time"] = time_stamp
            # third line forward until terminal data is the file content
            else:
                data = line
                if re.search(r"Terminal data", data):
                    done_with_file_content = True
                    continue

                if not done_with_file_content:
                    save_data["content"] += data + "\n"
                else:
                    save_data["terminal"] += data + "\n"
        return save_data
    except Exception as e:
        print(e)

def createDatabase(db_name):
    try:
        # make a database
        conn = sqlite3.connect(db_name)

        # create a cursor
        c = conn.cursor()
        
        # Execute a SQL query to create a table
        c.execute("""CREATE TABLE IF NOT EXISTS addlWebDevData (
                eventID INTEGER PRIMARY KEY,
                videoID INTEGER,
                timed_url VARCHAR(255),
                time INTEGER,
                img_file VARCHAR(255),
                text_file VARCHAR(255),
                notes VARCHAR(255),
                code_text TEXT,
                coords VARCHAR(255)
            );""")

        # Save (commit) the changes
        conn.commit()

        # close the connection
        conn.close()
    except Exception as e:
        print(e)
    

if __name__ == '__main__':
    begin_marker = "~%$#@*(#^&&*@#$&*^&---------------------     BEGIN     -----------------------LAFAFJL7358267)\n"
    end_marker = "*(&*#@(()*$#@*((*@#---------------------     END     -------------------------236FHAJFFFASF))\n"

    # data_from_webDevOutput = read_data()
    each_file_save_data = getIndividualFileSaveData(DATA_FILE_PATH, begin_marker, end_marker)
    save_data_df = pd.DataFrame()

    # update this to trim the root path from the file path
    root_path = r'/Users/user/react-app/new-app'

    # string to be trimmed off from terminal data
    terminal_trim = "MacBook-Pro:new-app user$ "

    for data in each_file_save_data:
        save_data = processFileSaveData(data)
        
        terminal_data = save_data["terminal"]

        # find the last index of terminal_trim
        last_index_of_terminal_trim = terminal_data.rfind(terminal_trim)

        if last_index_of_terminal_trim != -1:
            # grab everything after the last index of matched string line
            # add new filtered terminal data to save_data
            save_data["terminal"] = terminal_data[last_index_of_terminal_trim+len(terminal_trim):]
        else:
            save_data["terminal"] = terminal_data

        # convert to dataframe series
        save_data_series = pd.Series(save_data)
        # append to dataframe
        save_data_df = pd.concat([save_data_df, save_data_series.to_frame().T], ignore_index=True)

    # save to json
    # save_data_df.to_json("addlWebDevData.json", orient="records")

    # create database
    createDatabase(DB_FILE_NAME)

    # add save_data_df to database
    for index, row in save_data_df.iterrows():
        codeEvent = {   'eventID': None, 
                        'videoID': 2, 
                        'timed_url': None, 
                        'time': row["time"], 
                        'img_file': None, 
                        'text_file': None, 
                        'notes': "code: " + row["file"] + ";", 
                        'code_text': row["content"], 
                        'coords': None}
        
        terminalEvent = {   'eventID': None,
                            'videoID': 2,
                            'timed_url': None,
                            'time': row["time"],
                            'img_file': None,
                            'text_file': None,
                            'notes': "output: webDevOutput.txt;",
                            'code_text': row["terminal"],
                            'coords': None}

        # add both events to database
        conn = sqlite3.connect(DB_FILE_NAME)
        c = conn.cursor()

        c.execute("""INSERT INTO addlWebDevData VALUES (:eventID, :videoID, :timed_url, :time, :img_file, :text_file, :notes, :code_text, :coords)""", codeEvent)
        c.execute("""INSERT INTO addlWebDevData VALUES (:eventID, :videoID, :timed_url, :time, :img_file, :text_file, :notes, :code_text, :coords)""", terminalEvent)

        conn.commit()

        conn.close()


