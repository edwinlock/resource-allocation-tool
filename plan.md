# The main tasks (high level)
1. Write backend to receive and store data from the frontend
    * Should have DB models for sessions, survey answers, and slider responses
    * API for submitting data from web app
    * Rudimentary way to view data (incl. filtering) and download it as a CSV.

2. Finish frontend:
    * Add functionality to send session data to the server.
    * Add functionality to render surveys and save survey answers.
    * How to handle authentication? Username and password that enumerators need to enter manually?

# Details for the backend


# Details for the frontend

# How to encode/represent the survey questions

Surveys consist of questions, which are grouped by section.




# Notes:
* We can replace variables in curly brakcets with: return surveyHTML.replace(/{(\w+)}/g, (match, key) => variables[key] || match);
* 