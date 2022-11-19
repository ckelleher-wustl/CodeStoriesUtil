import json
import requests
import urllib
import pandas as pd
from requests_html import HTML, HTMLSession
from bs4 import BeautifulSoup
import difflib

# data (or webData) refers to web data recorded by the browser extension
DATA_FILE_NAME = r'C:\Users\thien\Box\project\project\data'
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
        print(e)


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
    df_copy = df_copy[['time', 'new_action', 'title_info', 'curTitle']]

    # rename the columns
    df_copy.columns = ['time', 'action', 'info', 'title']

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


if __name__ == '__main__':
    run()
