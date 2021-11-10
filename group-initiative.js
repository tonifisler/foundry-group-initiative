// @ts-check

const _gi_MODULE_NAME = 'group-initiative';
const _gi_SETTING_NAME = 'rollGroupInitiative';

// Default setting
let _gi_CONFIG_GROUPINITIATIVE = false;
let _gi_CONFIG_SKIPGROUPED = false;

// Shortcut to localize. 
const _gi_i18n = key => game.i18n.localize(key);

// Sets the settings or returns the current value. 
const _gi_initSetting = (key, setting) => {
    let config;

    try {
        config = game.settings.get(_gi_MODULE_NAME, key);
    } catch (e) {
        if (e.message !== 'This is not a registered game setting') {
            throw e;
        }

        game.settings.register(_gi_MODULE_NAME, key, setting);
        config = game.settings.get(_gi_MODULE_NAME, key);
    }

    return config;
};

const _gi_settingkeys = {
    hideNames: {
        enableHostile: "enableHideHostileNames",
        enableNeutral: "enableHideNeutralNames",
        enableFriendly: "enableHideFriendlyNames",
        hostileNameReplacement: "hostileNameReplacement",
        neutralNameReplacement: "neutralNameReplacement",
        friendlyNameReplacement: "friendlyNameReplacement"
    }
}

const GroupInitiative = {
    /**
     * Override the RollNPC method.
     *
     * @returns {Promise<void>}
     */
    async rollNPC() {
        const npcs = this.turns.filter(
            t => (!t.actor || !t.players.length) && !t.initiative
        );
        if (!npcs.length) return;

        await GroupInitiative.rollGroupInitiative.call(this, npcs);
    },

    /**
     * Override the RollAll method.
     *
     * @returns {Promise<void>}
     */
    async rollAll() {
        const unrolled = this.turns.filter(t => !t.initiative);
        if (!unrolled.length) return;

        await GroupInitiative.rollGroupInitiative.call(this, unrolled);
    },

    /**
     * Roll the group initiative
     */
    async rollGroupInitiative(creatures) {
        console.log('group-initiative | Rolling initiative!');

        // Split the combatants in groups based on actor id.
        const groups = creatures.reduce(
            (g, combatant) => ({
                ...g,
                [combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant.data._id),
            }),
            {}
        );

        // Get first Combatant id for each group
        const ids = Object.keys(groups).map(key => groups[key][0]);

        const messageOptions = {
            flavor: _gi_i18n('COMBAT.groupRollsInitiative'),
        };

        // Roll initiative for the group leaders only.
        await this.rollInitiative(ids, { messageOptions });

        // Prepare the others in the group.
        const updates = creatures.reduce((updates, { id, initiative, actor }) => {
            const group = groups[actor.data._id];
            if (group.length <= 1 || initiative) return updates;

            // Get initiative from leader of group.
            initiative = this.getCombatant(group[0]).initiative;

            updates.push({ _id: id, initiative });
            return updates;
        }, []);

        // Batch update all other combatants.
        this.updateEmbeddedEntity('Combatant', updates);
    },

    /**
     * TEMPORARY! Awaiting CUB API access - Checks an actor to see if its name should be replaced
     * @param {*} actor 
     * @returns {Boolean} shouldReplace
     */
    shouldReplaceName(actor) {
        const dispositionEnum = actor.isToken ? actor.token.data.disposition : actor.data.token.disposition;
        const disposition = Object.keys(CONST.TOKEN_DISPOSITIONS).find(key => CONST.TOKEN_DISPOSITIONS[key] === dispositionEnum);
        const dispositionEnableSetting = game.settings.get('combat-utility-belt', _gi_settingkeys.hideNames[`enable${disposition.titleCase()}`]);
        const actorEnableFlag = actor.getFlag('combat-utility-belt', 'enableHideName');
        const enableHide = actorEnableFlag ?? dispositionEnableSetting;

        return !!enableHide;
    },

    /**
     * TEMPORARY! Awaiting CUB API access - For a given actor, find out if there is a replacement name and return it
     * @param {*} actor 
     * @returns {String} replacementName
     */
    getReplacementName(actor) {
        const dispositionEnum = actor.isToken ? actor.token.data.disposition : actor.data.token.disposition;
        const disposition = Object.keys(CONST.TOKEN_DISPOSITIONS).find(key => CONST.TOKEN_DISPOSITIONS[key] === dispositionEnum);
        const replacementSetting = game.settings.get('combat-utility-belt', _gi_settingkeys.hideNames[`${disposition.toLowerCase()}NameReplacement`]);
        const replacementFlag = actor.getFlag('combat-utility-belt', 'hideNameReplacement');
        const replacementName = replacementFlag ?? replacementSetting;

        return replacementName;
    }
}


/**
 * Add the setting option in the combat tracker config.
 */
Hooks.on('renderCombatTrackerConfig', async (ctc, html) => {
    const data = {
        rollGroupInitiative: _gi_CONFIG_GROUPINITIATIVE,
        skipGrouped: _gi_CONFIG_SKIPGROUPED,
    };

    const newOption = await renderTemplate(
        'modules/group-initiative/templates/combat-config.html',
        data
    );

    html.css({ height: 'auto' }).find('button[name=submit]').before(newOption);
});

/**
 * Save the setting when closing the combat tracker config.
 */
Hooks.on('closeCombatTrackerConfig', async ({ form }) => {
    _gi_CONFIG_GROUPINITIATIVE = form.querySelector('#rollGroupInitiative').checked;
    _gi_CONFIG_SKIPGROUPED = form.querySelector('#skipGrouped').checked;
    // Save the setting when closing the combat tracker setting.
    await game.settings.set(_gi_MODULE_NAME, _gi_SETTING_NAME, _gi_CONFIG_GROUPINITIATIVE);
    await game.settings.set(_gi_MODULE_NAME, "skipGrouped", _gi_CONFIG_SKIPGROUPED);
});

/**
 * Override the roll methods from combat tracker.
 */
Hooks.on('renderCombatTracker', (app, html, options) => {
    let combat = options.combat;

    if (!combat) return;

    if (!combat.originalRollNPC) {
        combat.originalRollNPC = combat.rollNPC;
    }
    if (!combat.originalRollAll) {
        combat.originalRollAll = combat.rollAll;
    }

    if (_gi_CONFIG_GROUPINITIATIVE) {
        combat.rollNPC = GroupInitiative.rollNPC.bind(combat);
        combat.rollAll = GroupInitiative.rollAll.bind(combat);
    } else {
        // Reset the methods.
        if (combat.originalRollNPC) {
            combat.rollNPC = combat.originalRollNPC;
        }
        if (combat.originalRollAll) {
            combat.rollAll = combat.originalRollAll;
        }
    }
});

/**
 * Init the settings.
 */
Hooks.once('init', () => {
    _gi_CONFIG_GROUPINITIATIVE = _gi_initSetting(_gi_SETTING_NAME, {
        name: _gi_i18n('COMBAT.RollGroupInitiative'),
        hint: _gi_i18n('COMBAT.RollGroupInitiativeHint'),
        default: _gi_CONFIG_GROUPINITIATIVE,
        type: Boolean,
        scope: 'world',
        config: false,
    });

    _gi_CONFIG_SKIPGROUPED = _gi_initSetting("skipGrouped", {
        name: _gi_i18n('COMBAT.SkipGrouped'),
        hint: _gi_i18n('COMBAT.SkipGroupedHint'),
        default: _gi_CONFIG_SKIPGROUPED,
        type: Boolean,
        scope: 'world',
        config: false,
    })
});

Hooks.on("renderCombatTracker", async (app, html, data) => {
    // if not using grouped initiative, return
    if (!_gi_CONFIG_GROUPINITIATIVE) return;
    const combat = data.combat || app.combat;
    // if no combat, return
    if (!combat) return;

    let combatants = combat.turns;
    // create initiative groups; array of arrays
    let groups = [];
    let groupsIndex = 0;
    groups[groupsIndex] = [combatants[0]];
    for (let i = 1; i < combatants.length; i++) {
        // if current combatant has a different actor than previous combatant, create a new initiative group
        if (combatants[i].actor.id !== combatants[i - 1].actor.id) {
            groupsIndex++;
            groups[groupsIndex] = [];
        }
        groups[groupsIndex].push(combatants[i]);
    }
    // if only 1 initiative group, return 
    if (groups.length < 2) return;

    // filter out initiative groups with only a single combatant (no need to collapse)
    groups = groups.filter(g => g.length > 1);
    // for each group, use the first combatant as a "header"
    const headerCombatants = groups.map(g => g[0]);
    const headerActor = headerCombatants[0].actor;
    // get the list item HTML element corresponding to the header combatants
    const lis = html.find("li");
    const headerCombatantLIs = headerCombatants.map(c => {
        for (let li of lis) if ($(li).data("combatantId") === c._id) return li;
    });

    // create initiative groups of list item elements
    const initiativeGroups = []
    for (let i = 0; i < headerCombatantLIs.length; i++) {
        const current = headerCombatantLIs[i];
        const currentGroup = [current];
        $(current).nextAll().splice(0, groups[i].length - 1).forEach(e => currentGroup.push(e));
        initiativeGroups.push(currentGroup);
    }

    // for each list item element initiative group, wrap group in a HTML details element to collapse them
    for (let i = 0; i < initiativeGroups.length; i++) {
        $(initiativeGroups[i]).wrapAll(`<details id="${headerCombatants[i]._id}" />`);
        $(initiativeGroups[i]).css("padding-left", "30px");

        // create a summary element for each details element, based on header combatant
        const currentGroup = $(headerCombatantLIs[i]).prop("parentElement");
        let shouldReplace = false;
        let combatantName = headerCombatants[i].name;
        let showHiddenMask = false;
        let toolTip = '';
        if (game.modules.get("combat-utility-belt")?.active) {
            shouldReplace = GroupInitiative.shouldReplaceName(headerActor);
            
            if (shouldReplace) {
                if (game.user.isGM) {
                    showHiddenMask = true;
                    toolTip = GroupInitiative.getReplacementName(headerActor);
                } else {
                    combatantName = GroupInitiative.getReplacementName(headerActor);
                }
            }
        }
        
        const data = {
            CombatantImage: headerCombatants[i].img,            
            CombatantInitiative: headerCombatants[i].initiative || "",
            CombatantName: combatantName,
            ShowHiddenMask: showHiddenMask,
            ToolTip: toolTip,
        };
    
        const groupHeader = await renderTemplate(
            'modules/group-initiative/templates/group-collapse.html',
            data
        );
        $(groupHeader).prependTo(currentGroup)
    }

    // if current combatant is in a collapsed group, open the group
    const activeCombatantLI = html.find("li.active");
    const details = $(activeCombatantLI).prop("parentElement");
    if ($(details).prop("nodeName") === "DETAILS") {
        if (_gi_CONFIG_SKIPGROUPED && $(activeCombatantLI).prev().prop("nodeName") === "LI") return game.combat.nextTurn();
        $(details).prop("open", true);
    }
});
