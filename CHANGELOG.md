# Changelog

# 2.0.8
- fix issue with "Use already rolled initiative" setting on combat tracker settings

# 2.0.7
- put header grouping begin a setting that's disabled by default. this is while I try and sort out the various grouping issues
- add a setting that specifies whether you want a new combatant (added after combat started) to use another combatant's (of the same actor) initiative
- fix issue with the detail header arrow overriding other detail header's arrows styling

# 2.0.6
- fix grouping issue for v9

## 2.0.5
- fixed issue where Roll NPC and Roll All buttons only worked with the first encounter

## 2.0.4
- fixed a call to a depreciated function that is no longer availble on v9 - thanks @Zamrod for identifying the issue

## 2.0.3
- fixed an issue where the collapse/expand icons wouldn't scroll if there were a lot of combatants in the tracker - thanks @strongpauly
- fixed bug where the same combatants weren't properly being grouped
- if you make changes to a combatant (like hide/visible) in the tracker, the group would collapse. changed this so that it remembers the state of the group between updates.
- previously when adding an new combatant (for an already grouped actor) to the tracker, you would need to roll initiative for the new combatant and it wouldn't be grouped and initiative would be different. now if you add a new combatant, it'll check for it's group and uses the group's initiative automatically.
- fix an issue where the group initiative rolling would clash with Mob Attack Tools implementation of group initiative. this should no longer happen.

## 2.0.2

- fix issue with skipped groups and backwards turn moving

## 2.0.1 (2021-11-10)

- use CUB's Hide Name functionality to make sure group headers also hide names

## 2.0.0 (2021-11-09)

- collapsible initiative groups - @jessev14
- change collapsible initiative groups styling
- update core compatibility ready for 0.8.x and v9 - @Stendarpaval & @strongpauly
- refactor code

## 1.3.1 (2020-05-22)

- add Korean language support (thanks @KLO#1490)

## 1.3.0 (2020-05-02)

- improve code quality
- roll grouped initiative from "Roll All" button too (thanks @Norc) #1

## 1.2.0 (2020-04-14)

- replace some deprecated functions for 0.5.4
- fix base rollNPC method not used when disabling group initiative setting after having enabled it

## 1.1.1 (2020-04-10)

- fix error when there is no encounter

## 1.1.0 (2020-04-08)

- reworked all codebase
- use prettier

## 1.0.1 (2020-04-07)

- only roll for NPCs
- avoid re-rolls once initiative is set

## 1.0.0 (2020-04-07)

- **First public release**
- add option to enable rolling group initiative from Combat Tracker Settings
- implement feature to roll group initiative from "Roll NPCs" button in Combat Tracker
