import json
import os
import sys

import requests
import urllib
import pandas as pd
from bs4 import BeautifulSoup
import datetime
import time
from generate_screencapture_helper import ScreenCapture

# data (or webData) refers to web data recorded by the browser extension
DATA_FILE_NAME = r'C:\Users\thien\Desktop\webDataViz\data_git_classification'

# output file name
CSV_FILE_NAME = 'data_garbage_classification_original_time.csv'


def read_data():
    # open the file
    with open(DATA_FILE_NAME) as f:
        # read the data
        data = f.read()
    # return the data
    return data


def parse_data(data):
    # parse the data
    parsed_data = json.loads(data)
    # return the parsed data
    return parsed_data


def decode_google_search_results(dataframe):
    # create a new column for the decoded data
    dataframe['search'] = dataframe['curUrl'].apply(lambda x: urllib.parse.unquote_plus(x))
    # apply getUrlVars to the search column
    dataframe['search'] = dataframe['search'].apply(lambda x: getUrlVars(x))
    # return the dataframe
    return dataframe


def getUrlVars(href):
    if 'https://www.google.com/search?q=' in href:
        vars = []
        hashes = href[href.index('?') + 1:].split('&')
        for i in range(0, len(hashes)):
            hash = hashes[i].split('=')
            vars.append({hash[0]: ''.join(hash[1:])})
        return vars[0]['q']
    if 'https://www.youtube.com/results?search_query=' in href:
        vars = []
        hashes = href[href.index('?') + 1:].split('&')
        for i in range(0, len(hashes)):
            hash = hashes[i].split('=')
            vars.append({hash[0]: ''.join(hash[1:])})
        return vars[0]['search_query']

    # if the href is not a google or youtube search result, return the href
    return None


def get_source(url):
    try:
        ignore_urls = ['https://www.google.com/search?q=', 'https://www.youtube.com/results?search_query=', 'localhost', '127.0.0.1']

        # return None if the url contains an ignore url
        for ignore_url in ignore_urls:
            if ignore_url in url:
                return None

        # making requests instance
        reqs = requests.get(url)

        # using the BeautifulSoup module
        soup = BeautifulSoup(reqs.text, 'html.parser')
        return soup

    except requests.exceptions.RequestException as e:
        print(url, e)


def parse_titles(response):
    if response is None:
        return None

    # get the titles
    titles = response.find_all('title')

    # if there are no titles, return None
    if len(titles) == 0 or titles[0].text == 'Not Acceptable!' or titles[0].text == '403 Forbidden' or titles[0].text == '404 Not Found':
        return None
    # print(titles[0].string.encode('utf-8-sig'))
    return titles[0].text


def check_visit(dataframe):
    # create a new column for the decoded data
    dataframe['visit'] = dataframe['curUrl'].apply(lambda x: get_source(x))
    # apply getUrlVars to the search column
    dataframe['visit'] = dataframe['visit'].apply(lambda x: parse_titles(x))
    # return the dataframe
    return dataframe


def process_new_action(dataframe):
    # create a new column for the decoded data
    dataframe['new_action'] = dataframe['action']

    dataframe['new_action'] = dataframe['search'].apply(lambda x: 'search' if x is not None else x)
    dataframe['new_action'] = dataframe['new_action'].apply(lambda x: 'visit' if x is None else x)

    # if the action column includes revisit, set the corresponding row in new_action to revisit
    dataframe.loc[dataframe['action'].str.contains('revisit'), 'new_action'] = 'revisit'

    # return the dataframe
    return dataframe


def process_new_title_info(dataframe):
    # make an empty array
    titles = []

    for i in range(0, len(dataframe)):
        # get the current row
        row = dataframe.iloc[i]
        # get the search term
        search_info = row['search']
        # get the visit
        visit_info = row['visit']

        # if the search term is not None, add it to the array
        if search_info is not None:
            titles.append(search_info)
        # if the visit is not None, add it to the array
        if visit_info is not None:
            titles.append(visit_info)

        # if both the search term and the visit are None, add the curUrl to the array
        if search_info is None and visit_info is None:
            titles.append(row['curUrl'])

    # create a new column for the titles
    dataframe['title_info'] = titles
    # return the dataframe
    return dataframe


def final_check(dataframe):
    # make revisit column all False
    dataframe['seen'] = False

    # If a title reappears after its first occurrence, set the revisit column to True
    dataframe.loc[dataframe.groupby('title_info').cumcount() > 0, 'seen'] = True

    # get the seen indeces
    seen_indeces = dataframe[dataframe['seen'] == True].index

    # if seen is true and new_action is visit, set new_action to revisit
    # else if seen is true and new_action is search, set new_action to research
    dataframe.loc[seen_indeces, 'new_action'] = dataframe.loc[seen_indeces, 'new_action'].apply(lambda x: 'research' if x == 'search' else 'revisit')

    # check if consecutive titles are the same
    # if the former title has visit and the latter title has revisit, drop the latter title
    dataframe.drop(dataframe[dataframe['title_info'].shift(1) == dataframe['title_info']].index, inplace=True)

    dataframe['dwell_time'] = 0

    # for new action that contains 'visit' or 'revisit', get the difference between the next row's timestamp and the current row's timestamp
    dataframe.loc[dataframe['new_action'].str.contains('visit'), 'dwell_time'] = dataframe['time'].shift(-1) - dataframe['time']

    # remove row with dwell time less than 2.5 seconds and new action that contains 'visit' or 'revisit'
    dataframe.drop(dataframe[(dataframe['dwell_time'] < 2.5) & (dataframe['new_action'].str.contains('visit'))].index, inplace=True)

    # remove row with 'research' action
    dataframe.drop(dataframe[dataframe['new_action'] == 'research'].index, inplace=True)

    # remove quotation marks from the title_info column
    dataframe['title_info'] = dataframe['title_info'].apply(lambda x: x.replace('"', ''))
    # trim the title_info column
    dataframe['title_info'] = dataframe['title_info'].apply(lambda x: x.strip())

    # check if action column has value has "("
    # then check if the action column has value has ")"
    # if so, grab the value between the "(" and ")"
    dataframe['action'] = dataframe['action'].apply(lambda x: x[x.index('(') + 1:x.index(')')] if '(' in x else x)

    new_actions = []

    # iterate through the dataframe
    for i in range(0, len(dataframe)):
        # get the current row
        row = dataframe.iloc[i]
        # get the action
        new_action = row['new_action']
        old_action = row['action']

        if ('typed' in old_action) and ('visit' in new_action):
            new_actions.append(new_action + ' (typed)')

        elif ('form_submit' in old_action) and ('visit' in new_action):
            new_actions.append(new_action + ' (form_submit)')

        elif ('auto_bookmark' in old_action) and ('visit' in new_action):
            new_actions.append(new_action + ' (auto_bookmark)')

        elif ('reload' in old_action) and ('visit' in new_action):
            new_actions.append(new_action + ' (reload)')

        else:
            new_actions.append(new_action)

    dataframe['new_action'] = new_actions

    # if the action column includes [typed, reload, form_submit, auto_bookmark],
    # set the corresponding row in new_action to the respective value
    # dataframe.loc[dataframe['action'].str.contains('typed'), 'new_action'] = 'typed'
    # dataframe.loc[dataframe['action'].str.contains('reload'), 'new_action'] = 'reload'
    # dataframe.loc[dataframe['action'].str.contains('form_submit'), 'new_action'] = 'form_submit'
    # dataframe.loc[dataframe['action'].str.contains('auto_bookmark'), 'new_action'] = 'auto_bookmark'

    # return the dataframe
    return dataframe


def run():
    # read in the json data
    data = read_data()
    # parse the json data
    parsed_data = parse_data(data)
    # convert data into dataframe
    df = pd.DataFrame(parsed_data)
    # make a copy of the dataframe
    df_copy = df.copy()
    # filter out "empty new tab is active tab" rows
    df_copy = df_copy[df_copy['action'] != 'empty new tab is active tab']

    # delete rows if the value of curUrl is exact match as the value of prevUrl
    # get the indices of the rows that are exact matches
    indices = df_copy[df_copy['curUrl'] == df_copy['prevUrl']].index
    # delete the rows
    df_copy.drop(indices, inplace=True)

    # decode the google search results
    df_copy = decode_google_search_results(df_copy)

    # get titles of curUrl
    df_copy = check_visit(df_copy)

    # get new action for df_copy
    df_copy = process_new_action(df_copy)

    # get title info for df_copy
    df_copy = process_new_title_info(df_copy)

    # final walkthrough of new_action
    df_copy = final_check(df_copy)

    # make a new dataframe with only the columns we want in order
    # first column is timestamp, second column is new_action, third column is title_info, fourth column is curUrl, fifth column is prevUrl
    df_copy = df_copy[['time', 'new_action', 'title_info', 'curTitle', 'curUrl']]

    # rename the columns
    df_copy.columns = ['time', 'action', 'info', 'title', 'timed_url']

    # make a new dataframe with column img_file and set it to None
    img_file_df = pd.DataFrame(columns=['img_file'])
    img_file_df['img_file'] = None

    # check if images folder exists
    if not os.path.exists('imgs_git_webdata'):
        # if not, create it
        os.makedirs('imgs_git_webdata')
    else:
        # else, delete all files in the folder
        for file in os.listdir('imgs_git_webdata'):
            os.remove('imgs_git_webdata/' + file)
        # delete the folder
        os.rmdir('imgs_git_webdata')

        # create the folder again
        os.makedirs('imgs_git_webdata')

    start_time = time.time()

    sc = ScreenCapture()

    # iterate through the dataframe
    for i in range(0, len(df_copy)):
        print(i)
        # get the current row
        row = df_copy.iloc[i]
        # get the timestamp
        timestamp = row['time']
        # get the timed_url
        timed_url = row['timed_url']

        print(timed_url)

        # convert the timestamp to this format 2022-08-09-14_52_58
        timestamp = datetime.datetime.fromtimestamp(timestamp)
        timestamp = timestamp.strftime('%Y-%m-%d-%H_%M_%S')

        if 'youtube.com' in timed_url:
            img_file_df.loc[i, 'img_file'] = sc.capture(timed_url, 'imgs_git_webdata/screencapture-n' + str(i) + '_' + str(timestamp) + '-youtube.png')
        else:
            img_file_df.loc[i, 'img_file'] = sc.capture(timed_url, 'imgs_git_webdata/screencapture-n' + str(i) + '_' + str(timestamp) + '.png')

    end_time = time.time()
    print("--- %s minutes ---" % ((end_time - start_time) / 60))

    """ generate searchEvts.csv, note that this is stand alone and not in incorporate commit events
    # subtract every time by the first time
    df_copy['time'] = df_copy['time'] - df_copy['time'].iloc[0]
    # add event id for each row
    df_copy['eventId'] = df_copy.index
    # create a new column called filename, and add action: info to each row
    df_copy['filename'] = df_copy['action'] + ': ' + df_copy['info'] + ';'
    # select only eventId, time, filename, and title
    df_copy = df_copy[['eventId', 'time', 'filename', 'title']]
    # write to csv
    df_copy.to_csv('test_searchEvts.csv', index=False)"""

    # generate events.csv with original timestamp and tab separated for CodeStoriesUtil
    df_copy.to_csv(CSV_FILE_NAME, index=False, encoding='utf-8-sig', sep='\t')
    img_file_df.to_csv('temp_img_file.csv', index=False, encoding='utf-8-sig', sep='\t')


if __name__ == '__main__':
    run()

    # take two csv files and merge them
    # to avoid weird encoding issues where img_file column not tab separated correctly

    # read in the csv files
    df1 = pd.read_csv(CSV_FILE_NAME, sep='\t')
    df2 = pd.read_csv('temp_img_file.csv', sep='\t')

    # merge the two dataframes
    df3 = pd.concat([df1, df2], axis=1)

    # write to csv
    df3.to_csv(CSV_FILE_NAME, index=False, encoding='utf-8-sig', sep='\t')

    # delete the temp csv file
    os.remove('temp_img_file.csv')
