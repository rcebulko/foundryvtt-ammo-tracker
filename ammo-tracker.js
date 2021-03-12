const AmmoTracker = (function () {
  const RECOVER_AMMO_MACRO = 'Recover Ammo';
  const FLAG_NAMESPACE = 'rc-spent-ammo';

  class GameAmmoTracker {
    constructor(optActors) {
      if (!optActors) {
        optActors = game.users.players
          .map(({data: {character}}) => game.actors.get(character));
      }
      this.trackers = optActors.map(actor => new ActorAmmoTracker(actor));
    }

    /** Records ammo at the start of a combat. */
    async startCombat() {
      console.log('Ammo Tracker starting combat');
      return Promise.all(this.trackers.map(t => t.startCombat()));
    }

    /** Records ammo quantities at the end of a combat. */
    async endCombat() {
      console.log('Ammo Tracker ending combat');
      return Promise.all(this.trackers.map(t => t.endCombat()));
    }
  }

  class ActorAmmoTracker {
    constructor(actor) {
      this.actor = actor;
      this._ammoRecords = null;
    }

    /**
     * Produces a list of all of the actor's ammo items.
     * @return {Array<Item>}
     */
    get ammoItems() {
      return this.actor.items.filter(
        item => item.data.data.consumableType == 'ammo'
      );
    }

    /** Records ammo at the start of a combat. */
    async startCombat() {
      this._ammoRecords = {};
      for (const item of this.ammoItems) {
        // Record initial state
        await item.setFlag(
          FLAG_NAMESPACE,
          'startQuantity',
          item.data.data.quantity,
        );
        await item.setFlag(
          FLAG_NAMESPACE,
          'endQuantity',
          // If the item is used up and removed from inventory, it won't be
          // updated, so we set this to 0 and assume it'll be overwritten during
          // `endCombat`
          0,
        );

        this._ammoRecords[item._id] = item;
      }
    }

    /** Records ammo quantities at the end of a combat. */
    async endCombat() {
      // Set the `endQuantity` flag on all remaining ammo items
      for (const item of this.ammoItems) {
        // TODO: This will not handle ammo that is fully spent and removed from
        // inventory
        if (item._id in this._ammoRecords) {
          await item.setFlag(FLAG_NAMESPACE, 'endQuantity', item.data.data.quantity);
        }
      }

      await this.notifySpentAmmo();
    }

    /**
     * Lists ammo items that were consumed during combat.
     * @return {Array<Item>}
     */
    get spentAmmo() {
      return Object.values(this._ammoRecords)
        // Determine spent/recoverable ammo
        .map(item => {
          const startQuantity = item.getFlag(FLAG_NAMESPACE, 'startQuantity');
          const endQuantity = item.getFlag(FLAG_NAMESPACE, 'endQuantity') || 0;
          const spent = startQuantity - endQuantity;
          const recoverable = Math.floor(spent / 2);

          return {item, startQuantity, endQuantity, spent, recoverable};
        })
        // Ignore unspent ammo
        .filter(({spent}) => spent > 0);
    }

    /** Recover half of spent ammo (rounded down). */
    async recoverAmmo() {
      const recoveredLines = [];
      // Recover ammo where possible, updating quantity and recording message
      for (const ammo of this.spentAmmo) {
        const {item, recoverable} = ammo;
        if (recoverable > 0) {
          const newQuantity = item.data.data.quantity + recoverable;
          await item.update({
            data: {quantity: newQuantity}
          });

          // This prevents accidental double-clicks
          await item.setFlag(FLAG_NAMESPACE, 'startQuantity', newQuantity);
          await item.setFlag(FLAG_NAMESPACE, 'endQuantity', newQuantity);
          recoveredLines.push(`${recoverable}x ${item.name} recovered`);
        }
      };

      // Post a message if anything was recovered
      if (recoveredLines.length) {
        await ChatMessage.create({
          content: [
            `${this.actor.name} spends a minute recovering ammo`,
            ...recoveredLines,
          ].join('\n'),
          speaker: ChatMessage.getSpeaker({actor: this.actor}),
        });
      } else {
        await ChatMessage.create({
          content: 'You already recovered this ammo!',
          speaker: ChatMessage.getSpeaker({alias: "Ammo Tracker"}),
          type: CHAT_MESSAGE_TYPES.WHISPER, // https://foundryvtt.com/api/foundry.js.html#line83
          whisper: ChatMessage.getWhisperRecipients(this.actor.name)
        });
      }
    }

    /** Sends a whisper message about spent and recoverable ammo. */
    async notifySpentAmmo() {
      // Build a blurb for each type of ammo spent
      const chatParts = this.spentAmmo.map(
        ({startQuantity, endQuantity, spent, recoverable, item}) => [
          `${item.name}: ${startQuantity} -> ${endQuantity}`,
          `<b>Spent:</b> ${spent}`,
          `<b>Recoverable:</b> ${recoverable}`,
        ].join('\n'));

      if (chatParts.length) {
        await ChatMessage.create({
          content: [...chatParts, `@Macro[${RECOVER_AMMO_MACRO}]`].join('<hr>'),
          speaker: ChatMessage.getSpeaker({alias: "Ammo Tracker"}),
          type: CHAT_MESSAGE_TYPES.WHISPER, // https://foundryvtt.com/api/foundry.js.html#line83
          whisper: ChatMessage.getWhisperRecipients(this.actor.name)
        });
      }
    }
  }

  return GameAmmoTracker;
})();

// Lazy initialize in hooks since some utils (ui, game) may not be available
// when script is run.
Hooks.on('createCombat', () => {
  if (!AmmoTracker.instance) {
    AmmoTracker.instance = new AmmoTracker();
  }
  AmmoTracker.instance.startCombat();
});
Hooks.on('deleteCombat', () => {
  if (!AmmoTracker.instance) {
    AmmoTracker.instance = new AmmoTracker();
  }
  AmmoTracker.instance.endCombat()
});
