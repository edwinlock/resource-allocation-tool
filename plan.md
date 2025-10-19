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




IMPORTANT
* Need to make sure the sw.js is up to date.


Now I want to work on sliders.html in the frontend again.

* The scenario.json files should have a global field "pre_earnings" that specifies, for each scenario, multiple possible initial pre-earnings: in the current files, initialise this as[[6,1],  [5,2], or [4,3]]. The first entry is the "higher" value, and the second entry is the "lower value".
* Whenever a scenario is loaded, we should flip a coin to decide whether the first child (child1) gets the higher pre-earnings, or the second child (child2) has the higher pre-earnings. The outcome should be saved in the sliderresponse and in the frontend & backend models (of course). Save it as "high_child" = 1 | 2.
* The scenarios.json files should globally specify a label for the high (orange) child, and a label for the low (green) child. For example, you can use fields "child_high_name" and "child_low_name".
* In constants.js, we currently specify colours for child1 and child2. Instead, I want to specify the colour in the scenarios.json files for the high and low child, as child_high_col and child_low_col, etc. Look at constants.js, and port over all the relevant constants to scenarios.json. In the graphs, the high child should be orange in the graph, and the low child should be green in the graph. 
* The x-axis of the graph is always going to be the allocation to the first child.
