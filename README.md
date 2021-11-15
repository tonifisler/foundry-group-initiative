![Latest Release Download Count](https://img.shields.io/badge/dynamic/json?color=blue&label=Downloads%40latest&query=assets%5B1%5D.download_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fvtt-lair%2Ffoundry-group-initiative%2Freleases%2Flatest) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fgroup-initiative&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=group-initiative) 
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fvtt-lair%2Ffoundry-group-initiative%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/N4N36ZSPQ)

# Group Initiative
Roll Group Initiative from the Combat Tracker in [Foundry VTT](https://foundryvtt.com/)

# Options
## Roll group initiative
Make one roll for an entire group of identical creatures (the same actor) directly from the Combact Tracker's "Roll NPCs" or "Roll All" buttons

## Skip grouped combatants
Skip combatants in a group except for the first found in said group.

![options](examples/options.jpg)

# Combat Tracker
![howtoroll](examples/all_grouped_collapsed_rolled.jpg)

![unrolled](examples/grouped_expanded_unrolled.jpg)

![rolled](examples/grouped_collapsed_rolled.jpg)

## Install

1. Go to the "Add-on Modules" tab in Foundry Setup
2. Search for "Group Initiative"
3. Open your world and go to the "Combat Tracker" tab
4. Open the "Combat Tracker Settings" (cog at the top right of the Encounter pane) and check the "Roll Group Initative" option
5. Use one of the "Roll" buttons to automatically roll initiative for NPCs by group
