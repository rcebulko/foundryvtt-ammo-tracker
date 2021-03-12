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
    return this.actor.data.items.filter(
      ({data}) => data.consumableType == 'ammo'
    );
  }

  /** Records ammo at the start of a combat. */
  startCombat() {
    this._ammoRecords = {};
    this.ammoItems.forEach((item) => {
      const {_id, data} = item;
      this._ammoRecords[_id] = {
        item,
        startQuantity: data.quantity,
        endQuantity: 0,
      };
    });
  }

  /** Records ammo quantities at the end of a combat. */
  endCombat() {
    this.ammoItems.forEach(({_id, data}) => {
      if (_id in this._ammoRecords) {
        this._ammoRecords[_id].endQuantity = data.quantity;
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
      .filter(({startQuantity, endQuantity}) => startQuantity - endQuantity > 0)
      .map(ammo => {
        const spent = ammo.startQuantity - ammo.endQuantity;
        const recoverable = Math.floor(spent / 2);
        return {...ammo, spent, recoverable};
      });
  }

  /** Sends a whisper message about spent and recoverable ammo. */
  _notifySpentAmmo({startQuantity, endQuantity, spent, recoverable, item}) {
    ChatMessage.create({
      content: `${item.name}: ${startQuantity} -> ${endQuantity}\n` +
        `<b>Spent:</b> ${spent}\n<b>Recoverable:</b> ${recoverable}`,
      speaker: ChatMessage.getSpeaker({alias: "Ammo Tracker"}),
      type: CHAT_MESSAGE_TYPES.WHISPER, // https://foundryvtt.com/api/foundry.js.html#line83
      whisper: ChatMessage.getWhisperRecipients(this.actor.name)
    });
  }
}

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
    this.trackers.forEach(t => t.startCombat());
  }

  /** Records ammo quantities at the end of a combat. */
  endCombat() {
    this.trackers.forEach(t => t.endCombat());
  }
}
