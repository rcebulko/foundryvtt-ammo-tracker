# RC Spent/Recoverable Ammo Tracker

Made for the DnD5e system. In 5e, after a combat, you can choose to spent 1 minute to recover half of expended ammo, rounding down. My players hated tracking their spent ammo each combat and trying to remember to recover it, so I made this module.

How it works:
- When you *Create Encounter*, it records the current quantity of any item with `consumableType == 'ammo'` (ie. arrows, crossbow bolts, etc.)
- When you hit *End Combat*, it counts how much of each ammo type was spent
- For spent ammo, it whispers to the actor how much was spent and how much can be recovered
- The message includes a button, which both updates inventory and posts a public message indicating the recovered ammo
- Tracking works fine across sessions/different devices, as all intermediate data is stored in flacts on the actors

Assumptions/Known limitations:
- Currently, this works by finding all actors linked with game users. If a player owns multiple actors, this may misbehave
  - The `GameAmmoTracker` class accepts an optional list of actors in the constructor. If you want to contribute controls/settings to improve this, be my guest.
- Behavior is undefined when ammo is fully depleted
  - The message will post, but the recover button will not work since there will be no item in the character sheet to update the quantity on
  - This is a rare enough edge case that I couldn't be bothered to deal with it
- Behavior is undefined if you create and end multiple combats at a time; I never do this.
  - I suppose I could listen on `beginCombat` (or maybe it's `startCombat`?) instead of `createCombat`. If you care, make a PR :)

Module URL for installation: `https://raw.githubusercontent.com/rcebulko/foundryvtt-ammo-tracker/main/module.json`
