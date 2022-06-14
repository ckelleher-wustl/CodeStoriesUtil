import sqlite3
from sqlite3 import Error
import numpy as np
from PIL import Image
import pytesseract
import json

#only change this to be the blackWhite folder generated after preprocess_images.py ie public/images/yourDir_blackWhite/
image_dir = "public/images/chessbot_blackWhite/"

def create_connection(db_file):
    """ create a database connection to the SQLite database
        specified by the db_file
    :param db_file: database file
    :return: Connection object or None
    """
    conn = None
    try:
        conn = sqlite3.connect(db_file)
    except Error as e:
        print(e)

    return conn

def select_coords(conn):

    cur = conn.cursor()
    cur.execute("SELECT * FROM CodingEvents WHERE coords IS NOT NULL")

    rows = cur.fetchall()
    
    return rows

def update_text(conn, eventID, text):
    cur = conn.cursor()
    cur.execute("UPDATE CodingEvents SET code_text=? WHERE eventID=?", [text, eventID])
    conn.commit()

#def main():
    
    

if __name__ == '__main__':
    #main()
    database = "test.db"

    # create a database connection
    conn = create_connection(database)
    
    images_text_map = {}

    with conn:
        print("1. Query rows that have coords:")
        rows = select_coords(conn)
        for entry in rows:
            image_file = entry[4]
            curr_code_text = entry[-2]

            if curr_code_text == None: #only do this if nothing currently saved
                eventID = str(entry[0])
                coords = entry[-1].split(';')
                print(eventID, image_file, coords)
                image = Image.open(image_dir+image_file)
                pix = np.array(image)

                upperX = int(coords[0])
                upperY = int(coords[1])
                lowerX = int(coords[0]) + int(coords[2])
                lowerY = int(coords[1]) + int(coords[3])

                pix[0,:,:]
                #im_new = Image.fromarray(pix[upperX:lowerX,upperY:lowerY,:])

                im_new = Image.fromarray(pix[upperY:lowerY,upperX:lowerX,:])

                text = pytesseract.image_to_string(im_new)
                images_text_map[image_file] = text
                
                update_text(conn, eventID, text)
                    #no code
                #print(text)
        #json.dump(images_text_map, open("images_text_map.json",'w'),indent=1)


