import {GameAmmoTracker} from './ammo-tracker.js';

let AmmoTracker;
Hooks.on('ready', () => {
  AmmoTracker = new GameAmmoTracker();
  $(document).on('click', '.rc-ammo-tracker-recover', function () {
    AmmoTracker.recoverAmmo($(this).data('actor-id'));
    $(this).attr('disabled', true)
      .css('opacity', 0.5)
      .text('Recovered!')
      .toggleClass('rc-ammo-tracker-recover', false)
  });
});

Hooks.on('createCombat', () => AmmoTracker.startCombat());
Hooks.on('deleteCombat', () => AmmoTracker.endCombat());
