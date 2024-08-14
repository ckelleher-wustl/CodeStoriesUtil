import sqlite3
import pandas as pd
import json

# Paths to your files
db_file = 'doodleJump_gitData.db'
selection_history_file = r'C:\Users\thien\Desktop\doodleJump\CH_cfg_and_logs\CH_selection_history.ndjson'
save_log_file = r'C:\Users\thien\Desktop\doodleJump\CH_cfg_and_logs\CH_save_log.ndjson'

# Load ndjson files into dataframes
def load_ndjson(file_path):
    with open(file_path) as f:
        data = pd.read_json(f, lines=True)
    return pd.DataFrame(data)

# Load the SQLite database into a dataframe
def load_database(db_file):
    conn = sqlite3.connect(db_file)
    df = pd.read_sql_query("SELECT * FROM CodingEvents", conn)
    conn.close()
    return df


# Create new rows based on save_log_df and append them to db_df
def append_save_log_to_db(db_df, save_log_df):
    # Extract the filename from the document path in save_log_df
    save_log_df['filename'] = save_log_df['document'].apply(lambda x: x.split('\\')[-1])

    # Create new rows with time and notes
    new_rows = pd.DataFrame({
        'eventID': None,  # SQLite should auto-increment the PRIMARY KEY
        'videoID': 2,
        'timed_url': None,
        'time': save_log_df['time'],
        'img_file': None,
        'text_file': None,
        'notes': 'save: ' + save_log_df['filename'] + ';',
        'code_text': None,
        'diff_text': None,
        'coords': None
    })

    # Append the new rows to the existing db_df
    updated_df = pd.concat([db_df, new_rows], ignore_index=True)

    # Ensure that no duplicate or unnecessary rows have been added by checking the DataFrame
    updated_df = updated_df.drop_duplicates(subset=['time', 'notes'], keep='first')

    return updated_df


# Append selection log to the database DataFrame
def append_selection_log_to_db(db_df, selection_log_df):
    # Extract the filename from the document path in selection_log_df
    selection_log_df['filename'] = selection_log_df['document'].apply(lambda x: x.split('\\')[-1])

    # Extract the range from the selection log
    selection_log_df['coords'] = selection_log_df['range'].apply(lambda x: json.dumps(x))

    # Create a DataFrame with the necessary columns
    new_rows = pd.DataFrame({
        'eventID': None,  # SQLite should auto-increment the PRIMARY KEY
        'videoID': None,
        'timed_url': None,
        'time': selection_log_df['time'],
        'img_file': None,
        'text_file': None,
        'notes': 'selection: ' + selection_log_df['filename'] + ';',
        'code_text': selection_log_df['selectedText'],
        'diff_text': None,
        'coords': selection_log_df['coords']
    })

    # Append the new rows to the existing db_df
    updated_df = pd.concat([db_df, new_rows], ignore_index=True)

    return updated_df


# Sort by time, reset index, and repopulate eventID
def sort_and_reset_eventID(df):
    # Sort the DataFrame by time
    df = df.sort_values(by='time').reset_index(drop=True)

    # Repopulate eventID based on the new index (starting from 1)
    df['eventID'] = df.index + 1

    return df

# Load data
db_df = load_database(db_file)
selection_history_df = load_ndjson(selection_history_file)
save_log_df = load_ndjson(save_log_file)

# merge save log with db
merged_save_db = append_save_log_to_db(db_df, save_log_df)

# merge selection log with db
merged_selection_db = append_selection_log_to_db(merged_save_db, selection_history_df)

# sort and reset eventID
final_df = sort_and_reset_eventID(merged_selection_db)

conn = sqlite3.connect('new_doodleJump_history.db')
final_df.to_sql('CodingEvents', conn, if_exists='replace', index=False)
conn.close()
