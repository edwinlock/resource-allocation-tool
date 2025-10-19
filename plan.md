# TODO

## For Michelle

* ~~Update survey JSON files~~✅
* Edit schools.json  ⚠️[can't be done until I have the final list of participating schools. In theory, this week.]⚠️
* Edit Slider text 📢❗🚨
* Test the frontend app on the enumerator tablets

## Hosting

Link up the final domain name:

* Backend on Pythonanywhere
  * Accessible at https://learn.education-technology-equity.com ✅
* Frontend on GitHub pages
  * Accessible at https://education-technology-equity.com ✅



## Done

* Replaced survey files
* Replaced schools.json file
* Submit survey button is now "save"
* On the slider page, the children names are now loaded from the json file
* 


## For Michelle
* You can now update the slider scenarios infotext at the top, see scenarios.json etc. You should be able to use <br> for line breaks.
* please also update the names that should be displayed for child 1 and child 2 in scenarios.json and scenarios-dummy.json
* please don't edit the "scenarios_id" field in the two json files, that would break things.
* You can change the colours of the graphs in constants.js
* "ANDDDD... As far as I remember child2 was always the highest pre-earnings child right????" This is NOT true. Pre-earnings are selected randomly from [1,6], [2,5], [5,2], [6,1]. So half the time the first person gets more, and half the time they get less. We can't really change this any more.



# Changes

I should have made all the relevant changes we discussed. 

* Updated all the little bits
* Revamped the whole slider experience
* Added session fields to the CSV export

Unfortunately I had to reset the database, so all the registered users are gone. Your password is again learn_michelle. If it's crucial, I can try to recover all the users' accounts from the backup but it will cost me about an hour or two, most likely.

You have some jobs:
* read the updated survey_guide.qmd. There's now a way to specify "decimal_places" and "prefix" (for $), for instance. I couldn't add comma separators to the input fields themselves, so I instead outputted a formatted number below the input field for the participants to see. So you can go through all the different questions and update the open number questions accordingly. Setting decimal_places to 0 is the same as requiring an integer, which is the current default.
* You need to update the scenarios.json files. There are now THREE of these files you need to update. As you can see, you can specify the colours and names of the high and low child. And you specify the gap (=pre-earnings) for each scenario deterministically. There are additional variables: allocatable budget sets the total number of sessions available, and max_sessions is there to scale / compute the bar chart height properly. I added this because you wanted the dummy slider scenarios to have values different from 15. Please test the slider thoroughly because I had to change quite a bit of code there.
* I've created a sliders_summary.qmd file in guides/ for you to understand how the slider works. Please review very carefully. 
* I was not able to reproduce your issue that session IDs get re-generated when you re-download. If you could be more detailed about when this happens, I can try to fix it.

I've tested creating sessions in the front end and uploading them to the back end. It seems to work for me. But please let me know in case of any issues.