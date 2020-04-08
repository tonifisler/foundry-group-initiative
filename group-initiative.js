// @ts-check

const MODULE_NAME = 'groupInitiative';
const SETTING_NAME = 'rollGroupInitiative';

async function rollGroupInitiative() {
  console.log('Group Initiative | Rolling initiative!');
  
  const npcs = this.turns.filter(t => (!t.actor || !t.players.length) && !t.initiative);
  if (!npcs.length) return;

  // Split the combatants in groups based on actor id.
  const groups = npcs.reduce((g, combatant) => ({
    ...g,
    [combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant._id)
  }), {});

  // Get first Combatant id for each group
  const ids = Object.keys(groups).map(key => groups[key][0]);

  const messageOptions = {
    flavor: game.i18n.localize('COMBAT.groupRollsInitiative'),
  };

  // Roll initiative for the group leaders only.
  await this.rollInitiative(ids, null, messageOptions);
  
  // Prepare the others in the group.  
  const updates = npcs.reduce((updates, {_id, initiative, actor}) => {
    const group = groups[actor._id];
    if (group.length <= 1 || initiative) return updates;

    // Get initiative from leader of group.
    initiative = this.getCombatant(group[0]).initiative;
    
    updates.push({ _id, initiative });
    return updates;
  }, []);

  // Batch update all other combatants.
  this.updateManyEmbeddedEntities('Combatant', updates);
}

Hooks.on('renderCombatTrackerConfig', async (ctc, html) => {
  const data = {
    rollGroupInitiative: game.settings.get(MODULE_NAME, SETTING_NAME),
  };

  const newOption = await renderTemplate('modules/group-initiative/templates/combat-config.html', data);

  html
    .css({ 'height': 'auto' })
    .find('button[name=submit]')
    .before(newOption);
});

Hooks.on('closeCombatTrackerConfig', async (ctc) => {
  // Save the setting when closing the combat tracker setting.
  game.settings.set(MODULE_NAME, SETTING_NAME, ctc.form.querySelector('#rollGroupInitiative').checked)
})

Hooks.on('renderCombatTracker', (component, html, data) => {
  const shouldRollGroupInitiative = game.settings.get(MODULE_NAME, SETTING_NAME);
  
  if (shouldRollGroupInitiative) {
    const combat = game.combats.viewed;
    combat.rollNPC = rollGroupInitiative.bind(combat);
  }
});

Hooks.on('init', () => {
  // Create the setting if it doesn't exist
  try {
    game.settings.get(MODULE_NAME, SETTING_NAME);
  } catch (e) {
    if (e.message !== "This is not a registered game setting") {
      throw e;
    }

    game.settings.register(MODULE_NAME, SETTING_NAME, {
      rollGroupInitiative: false,
    })
  }
});