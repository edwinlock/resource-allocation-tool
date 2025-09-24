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

# Offline functionality
* Check the manifest file
* Review the service workers


# Login and logout feature
* When the user hits the Login button, it should open a modal in which the user enters an email address and password. This is then used to make an API call using standard http auth to BACKEND_URL/login. This login then returns an authentication token. Store this auth token as permanently as possible in the browser. Then make an API call to BACKEND_URL/profile, which returns a JSON with the user's email and id. Store these, too, permanently in the browser. If one or both API calls fail, clear the auth token, email and id, and show an alert which call failed and what the error was.
* When the user hits the Logout button, it should clear the stored auth token, email and id. This doesn't require internet, so it should always work. Show a success alert.
* If a user is logged in, it show below the page title on index.html: "You are logged in as <email> with ID <id>."

Some notes on the create session modal on index.html:

* If the user is logged in, the enumerator ID should auto-populate to the enumerator's ID that is permanently stored.
* Throughout the app, we need to make sure that the enumerator ID is stored and handled as an integer.