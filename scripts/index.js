import {GameAmmoTracker} from './ammo-tracker';

const ammoTracker = new GameAmmoTracker();

Hooks.on('createCombat', () => ammoTracker.startCombat());
Hooks.on('deleteCombat', () => {
  ammoTracker.endCombat();
  ammoTracker.notifyAllSpentAmmo();
})
