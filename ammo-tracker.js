const AmmoTracker = (function () {
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
    startCombat() {
      console.log('Ammo Tracker starting combat');
      this.trackers.forEach(t => t.startCombat());
    }

    /** Records ammo quantities at the end of a combat. */
    endCombat() {
      console.log('Ammo Tracker ending combat');
      this.trackers.forEach(t => t.endCombat());
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
    startCombat() {
      this._ammoRecords = {};
      this.ammoItems.forEach(item => {
        item.setFlag(FLAG_NAMESPACE, 'startQuantity', item.data.data.quantity);
        this._ammoRecords[item._id] = item;
      });
    }

    /** Records ammo quantities at the end of a combat. */
    endCombat() {
      this.ammoItems.forEach(item => {
        if (item._id in this._ammoRecords) {
          item.setFlag(FLAG_NAMESPACE, 'endQuantity', item.data.data.quantity);
        }
      });

      this.spentAmmo.map(ammo => this._notifySpentAmmo(ammo));
    }

    /**
     * Lists ammo items that were consumed during combat.
     * @return {Array<Item>}
     */
    get spentAmmo() {
      return Object.values(this._ammoRecords)
        .map(item => {
          const startQuantity = item.getFlag(FLAG_NAMESPACE, 'startQuantity');
          const endQuantity = item.getFlag(FLAG_NAMESPACE, 'endQuantity') || 0;
          const spent = startQuantity - endQuantity;
          const recoverable = Math.floor(spent / 2);
          return {item, startQuantity, endQuantity, spent, recoverable};
        })
        .filter(({spent}) => spent > 0);
    }

    /** Recover half of spent ammo (rounded down). */
    recoverAmmo() {
      const recoveredLines = [];
      this.spentAmmo
        .forEach(ammo => {
          const {item, recoverable} = ammo;
          if (recoverable > 0) {
            item.update({
              data: {
                quantity: item.data.data.quantity + recoverable
              }
            });
            // Mark this off so you can't accidentally double-click
            ammo.recoverable = 0;
            recoveredLines.push(`${recoverable}x ${item.name} recovered`);
          }
        });

      if (recoveredLines.length) {
        ChatMessage.create({
          content: [
            `${this.actor.name} spends a minute recovering ammo`,
            ...recoveredLines,
          ].join('\n'),
          speaker: ChatMessage.getSpeaker({actor: this.actor}),
        });
      }
    }

    /** Sends a whisper message about spent and recoverable ammo. */
    _notifySpentAmmo({startQuantity, endQuantity, spent, recoverable, item}) {
      const msgLines = [
        `${item.name}: ${startQuantity} -> ${endQuantity}`,
        `<b>Spent:</b> ${spent}`,
        `<b>Recoverable:</b> ${recoverable}`,
        `@Macro[Recover Ammo]`
      ];

      ChatMessage.create({
        content: msgLines.join('\n'),
        speaker: ChatMessage.getSpeaker({alias: "Ammo Tracker"}),
        type: CHAT_MESSAGE_TYPES.WHISPER, // https://foundryvtt.com/api/foundry.js.html#line83
        whisper: ChatMessage.getWhisperRecipients(this.actor.name)
      });
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
