import {GameAmmoTracker} from './ammo-tracker.js';

let AmmoTracker;
Hooks.on('ready', () => {
  AmmoTracker = new GameAmmoTracker();
  $(document).on('click', '.rc-ammo-tracker-recover', function () {
    AmmoTracker.recoverAmmo($(this).data('actor-id'));
  });
});

Hooks.on('createCombat', () => AmmoTracker.startCombat());
Hooks.on('deleteCombat', () => AmmoTracker.endCombat());
