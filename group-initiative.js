// @ts-check

const MODULE_NAME = 'groupInitiative';
const SETTING_NAME = 'rollGroupInitiative';

async function rollGroupInitiative() {
  const currentId = this.combatant._id;

  // Check if setting is active
  const setting = game.settings.get(MODULE_NAME, SETTING_NAME);
  if (!setting) {
    this.rollNPC();
    return;
  }

  // Split the combatants in groups based on actor id.
  const groups = this.combatants.reduce((g, combatant) => ({
    ...g,
    [combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant._id)
  }), {});

  // Get first Combatant id for each group
  const ids = Object.keys(groups).map(key => groups[key][0]);

  const formula = null;
  const messageOptions = {};

  // START CLONE
  // CLONED FROM DND5E ROLLINITIATIVE METHOD
  // Iterate over Combatants, performing an initiative roll for each
  const [updates, messages] = ids.reduce((results, id, i) => {
    let [updates, messages] = results;

    // Get Combatant data
    const c = this.getCombatant(id);
    if (!c) return results;

    // Roll initiative
    const cf = formula || this._getInitiativeFormula(c);
    const rollData = c.actor ? c.actor.getRollData() : {};
    const roll = new Roll(cf, rollData).roll();
    updates.push({ _id: id, initiative: roll.total });

    // Construct chat message data
    const rollMode = messageOptions.rollMode || (c.token.hidden || c.hidden) ? "gmroll" : "roll";
    let messageData = mergeObject({
      speaker: {
        scene: canvas.scene._id,
        actor: c.actor ? c.actor._id : null,
        token: c.token._id,
        alias: c.token.name
      },
      flavor: `${c.token.name} rolls for Initiative!`
    }, messageOptions);
    const chatData = roll.toMessage(messageData, { rollMode, create: false });
    if (i > 0) chatData.sound = null;   // Only play 1 sound for the whole set
    messages.push(chatData);

    // Return the Roll and the chat data
    return results;
  }, [[], []]);
  // END CLONE

  // Update all other combatants from group
  updates.forEach((update, i) => {
    // Get to-be-updated combatant
    const combatant = this.getCombatant(update._id);
    // Get all others from group
    const group = groups[combatant.actor.id].filter(c => c !== update._id);

    if (group.length > 0) {
      // Rewrite message flavor
      messages[i].flavor = `${combatant.actor.name} ${game.i18n.localize('COMBAT.groupRollsInitiative')}`;

      group.forEach(id => {
        // Add combatant to updates object
        updates.push({
          ...update,
          _id: id,
        })
      })
    }
  })

  // Update multiple combatants
  await this.updateManyEmbeddedEntities("Combatant", updates);

  // Ensure the turn order remains with the same combatant
  await this.update({ turn: this.turns.findIndex(t => t._id === currentId) });

  // Create multiple chat messages
  await ChatMessage.createMany(messages);
}

class GICombatTrackerConfig extends CombatTrackerConfig {
  get NAME() {
    return 'trackerConfig';
  }

  // Add our new setting.
  async getData() {
    const superSettings = await super.getData();
    return {
      settings: {
        ...superSettings.settings,
        [SETTING_NAME]: game.settings.get(MODULE_NAME, SETTING_NAME)
      },
    };
  };

  // Change the rendered template.
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "modules/group-initiative/templates/combat-config.html",
    });
  }

  // Save our custom setting when updating.
  _updateObject(event, formData) {
    super._updateObject(event, formData);
    
    game.settings.set(MODULE_NAME, SETTING_NAME, formData.rollGroupInitiative);
  }
}

Hooks.on('renderCombatTracker', (component, html, data) => {
  // Display changed Combat settings
  html.find('.combat-settings').off().click(ev => {
    ev.preventDefault();
    new GICombatTrackerConfig().render(true);
  });

  // Roll NPC with group initiative if needed
  html.find('[data-control=rollNPC]').off().click(async event => {
    event.preventDefault();
    const ctrl = event.currentTarget;
    if (ctrl.getAttribute("disabled")) return;
    else ctrl.setAttribute("disabled", true);

    // Current Combat
    const combat = game.combats.viewed;
    await rollGroupInitiative.bind(combat)();
    
    ctrl.removeAttribute("disabled");
  });
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