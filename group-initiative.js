// @ts-check

const MODULE_NAME = 'group-initiative';
const SETTING_NAME = 'rollGroupInitiative';

// Default setting
let CONFIG_GROUPINITIATIVE = false;

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
 * Roll the group initiative
 */
async function rollGroupInitiative() {
  const npcs = this.turns.filter(
    t => (!t.actor || !t.players.length) && !t.initiative
  );
  if (!npcs.length) return;

  console.log('group-initiative | Rolling initiative!');

  // Split the combatants in groups based on actor id.
  const groups = npcs.reduce(
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
  await this.rollInitiative(ids, null, messageOptions);

  // Prepare the others in the group.
  const updates = npcs.reduce((updates, {_id, initiative, actor}) => {
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
  // Save the setting when closing the combat tracker setting.
  await game.settings.set(MODULE_NAME, SETTING_NAME, CONFIG_GROUPINITIATIVE);
});

/**
 * Override the roll methods from combat tracker.
 */
Hooks.on('renderCombatTracker', ({combat}) => {
  if (!combat) return;

  if (!combat.originalRollNPC) {
    combat.originalRollNPC = combat.rollNPC;
  }

  if (CONFIG_GROUPINITIATIVE) {
    combat.rollNPC = rollGroupInitiative.bind(combat);
  } else if (combat.originalRollNPC) {
    combat.rollNPC = combat.originalRollNPC;
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
});
