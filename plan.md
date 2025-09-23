# The main tasks (high level)
1. Write backend to receive and store data from the frontend
    * Should have DB models for sessions, survey answers, and slider responses
    * API for submitting data from web app
    * Rudimentary way to view data (incl. filtering) and download it as a CSV.

2. Finish frontend:
    * Add functionality to send session data to the server.
    * Add functionality to render surveys and save survey answers.
    * How to handle authentication? Username and password that enumerators need to enter manually?

# Details for the frontend
0. Michelle to specify exact user flow through app.
1. How to handle surveys:
    * Implement a Survey class
        - function to render survey to html (using Bootstrap styling)
    * Implement question class(es)
        - needs to handle different kinds of questions
        - function to render question to html
    * Implement SurveyManager to handle survey page
        - should load survey from json file
        - should render all the questions
        - should validate (?) and save answers to indexedDB using Dexie.js
        - should registered callbacks for the mpl questions so that they're rendered.
    * Extend the dbManager with SurveyAnswer model. Entries should include:
        - uuid
        - session_id
        - created_by
        - created_at
        - question
        - answer
2. Add a page that renders all the answers for a given session and survey.
3. Add a page that sends completed sessions to the backend and moves the locally stored data to the "archive".

# How to encode/represent the survey questions

See example survey.json for how questions are encoded.

# Notes:
* We can replace variables in curly brackets with: return surveyHTML.replace(/{(\w+)}/g, (match, key) => variables[key] || match);
* 


# Offline functionality
* Check the manifest file
* Review the service workers