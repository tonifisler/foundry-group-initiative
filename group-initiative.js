// @ts-check

const MODULE_NAME = 'group-initiative';
const SETTING_NAME = 'rollGroupInitiative';

// Default setting
let CONFIG_GROUPINITIATIVE = false;
let CONFIG_SKIPGROUPED = false;

/**
 * Shortcut to localize.
 *
 * @param key
 * @returns {string}
 */
const i18n = key => game.i18n.localize(key);

/**
 * Sets the settings or returns the current value.
 *
 * @param key
 * @param setting
 * @returns {*}
 */
const initSetting = (key, setting) => {
  let config;

  try {
    config = game.settings.get(MODULE_NAME, key);
  } catch (e) {
    if (e.message !== 'This is not a registered game setting') {
      throw e;
    }

    game.settings.register(MODULE_NAME, key, setting);
    config = game.settings.get(MODULE_NAME, key);
  }

  return config;
};

/**
 * Override the RollNPC method.
 *
 * @returns {Promise<void>}
 */
async function rollNPC() {
  const npcs = this.turns.filter(
    t => (!t.actor || !t.players.length) && !t.initiative
  );
  if (!npcs.length) return;

  await rollGroupInitiative.call(this, npcs);
}

/**
 * Override the RollAll method.
 *
 * @returns {Promise<void>}
 */
async function rollAll() {
  const unrolled = this.turns.filter(t => !t.initiative);
  if (!unrolled.length) return;

  await rollGroupInitiative.call(this, unrolled);
}

/**
 * Roll the group initiative
 */
async function rollGroupInitiative(creatures) {
  console.log('group-initiative | Rolling initiative!');

  // Split the combatants in groups based on actor id.
  const groups = creatures.reduce(
    (g, combatant) => ({
      ...g,
      [combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant._id),
    }),
    {}
  );

  // Get first Combatant id for each group
  const ids = Object.keys(groups).map(key => groups[key][0]);

  const messageOptions = {
    flavor: i18n('COMBAT.groupRollsInitiative'),
  };

  // Roll initiative for the group leaders only.
  await this.rollInitiative(ids, {messageOptions});

  // Prepare the others in the group.
  const updates = creatures.reduce((updates, {_id, initiative, actor}) => {
    const group = groups[actor._id];
    if (group.length <= 1 || initiative) return updates;

    // Get initiative from leader of group.
    initiative = this.getCombatant(group[0]).initiative;

    updates.push({_id, initiative});
    return updates;
  }, []);

  // Batch update all other combatants.
  this.updateEmbeddedEntity('Combatant', updates);
}

/**
 * Add the setting option in the combat tracker config.
 */
Hooks.on('renderCombatTrackerConfig', async (ctc, html) => {
  const data = {
    rollGroupInitiative: CONFIG_GROUPINITIATIVE,
    skipGrouped: CONFIG_SKIPGROUPED,
  };

  const newOption = await renderTemplate(
    'modules/group-initiative/templates/combat-config.html',
    data
  );

  html.css({height: 'auto'}).find('button[name=submit]').before(newOption);
});

/**
 * Save the setting when closing the combat tracker config.
 */
Hooks.on('closeCombatTrackerConfig', async ({form}) => {
  CONFIG_GROUPINITIATIVE = form.querySelector('#rollGroupInitiative').checked;
  CONFIG_SKIPGROUPED = form.querySelector('#skipGrouped').checked;
  // Save the setting when closing the combat tracker setting.
  await game.settings.set(MODULE_NAME, SETTING_NAME, CONFIG_GROUPINITIATIVE);
  await game.settings.set(MODULE_NAME, "skipGrouped", CONFIG_SKIPGROUPED);
});

/**
 * Override the roll methods from combat tracker.
 */
Hooks.on('renderCombatTracker', ( app, html, options ) => {
  let combat = options.combat ;

  if (!combat) return;

  if (!combat.originalRollNPC) {
    combat.originalRollNPC = combat.rollNPC;
  }
  if (!combat.originalRollAll) {
    combat.originalRollAll = combat.rollAll;
  }

  if (CONFIG_GROUPINITIATIVE) {
    combat.rollNPC = rollNPC.bind(combat);
    combat.rollAll = rollAll.bind(combat);
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
  CONFIG_GROUPINITIATIVE = initSetting(SETTING_NAME, {
    name: i18n('COMBAT.RollGroupInitiative'),
    hint: i18n('COMBAT.RollGroupInitiativeHint'),
    default: CONFIG_GROUPINITIATIVE,
    type: Boolean,
    scope: 'world',
    config: false,
  });

  CONFIG_SKIPGROUPED = initSetting("skipGrouped", {
    name: "Skip grouped combatants", // LOCALIZE
    hint: "Skip combatants following the first in a group.", // LOCALIZE
    default: CONFIG_SKIPGROUPED,
    type: Boolean,
    scope: 'world',
    config: false,
  })
});

Hooks.on("renderCombatTracker", async (app, html, data) => {
  // if not using grouped initiative, return
  if (!CONFIG_GROUPINITIATIVE) return;
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
    const headerCombatant = headerCombatants[i];
    const currentGroup = $(headerCombatantLIs[i]).prop("parentElement");
    const headerHTML = `
      <summary>
        <li class="combatant actor directory-item flexrow">
            <img class="token-image" src=${headerCombatant.img} title=${headerCombatant.name}>
            <div class="token-name flexcol">
                <h4>${headerCombatant.name}</h4>
            </div>
            <div class="token-initiative">
                <span class="initiative">${headerCombatant.initiative || ""}</span>
            </div>
        </li>
      </summary>
    `;
    $(headerHTML).prependTo(currentGroup)
  }

  // if current combatant is in a collapsed group, open the group
  const activeCombatantLI = html.find("li.active");
  const details = $(activeCombatantLI).prop("parentElement");
  if ($(details).prop("nodeName") === "DETAILS") {
    if (CONFIG_SKIPGROUPED && $(activeCombatantLI).prev().prop("nodeName") === "LI") return game.combat.nextTurn();
    $(details).prop("open", true);
  }

});
