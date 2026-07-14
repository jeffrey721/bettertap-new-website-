/* ============================================================================
   Better Tap CRM — Guided troubleshooting tree  (Model WDC-E-032 "Edge")
   ----------------------------------------------------------------------------
   Branching decision tree for the customer-service call console.
   Extend by adding nodes to TREE (each node: {id, prompt, options:[{label, next|outcome}]})
   and, if needed, new outcome types to OUTCOMES.

   Outcome types: resolve · adjust_setting · consumable_filter · consumable_uv · dispatch
   ============================================================================ */
(function () {
  'use strict';

  var TREE = {
    root: {
      id: 'root',
      prompt: 'What is the customer experiencing?',
      options: [
        { label: 'No hot / boiling water', next: 'hot' },
        { label: 'Water too cold / too hot / wrong temperature', next: 'temp' },
        { label: 'Autofill underfills or overflows the glass', outcome: 'adjust_setting' },
        { label: 'Filter indicator is RED', outcome: 'consumable_filter' },
        { label: 'UV-C lamp indicator is RED', outcome: 'consumable_uv' },
        { label: 'Dripping from the spout', next: 'drip' },
        { label: 'Drip tray is full', next: 'tray' },
        { label: 'Not dispensing at all / no power / error', next: 'power' },
        { label: 'Leak on the counter / connector', outcome: 'dispatch_leak' },
        { label: 'Noise or something else', outcome: 'dispatch' }
      ]
    },

    /* --- no hot water --- */
    hot: {
      id: 'hot',
      prompt: "Does the display show 'CH', or beep, when they press the hot button?",
      options: [
        { label: "Yes — shows 'CH' / beeps", next: 'childlock' },
        { label: 'No display code', next: 'hot_slow' }
      ]
    },
    childlock: {
      id: 'childlock',
      prompt: "Child Lock is ON. Ask them to hold the TOP-LEFT + TOP-RIGHT buttons together for 3 seconds to bypass it, then try hot water again. Did that work?",
      options: [
        { label: 'Yes — hot water is back', outcome: 'resolve' },
        { label: 'No — still no hot water', outcome: 'dispatch' }
      ]
    },
    hot_slow: {
      id: 'hot_slow',
      prompt: 'Is it just slow to heat, or no hot water at all?',
      options: [
        { label: 'Slow to heat', next: 'eco' },
        { label: 'No hot water at all', outcome: 'dispatch' }
      ]
    },
    eco: {
      id: 'eco',
      prompt: 'Energy-Saving or Sleep mode is likely on. Ask them to open Settings and turn OFF Energy-Saving / Sleep. Did heating return to normal?',
      options: [
        { label: 'Yes — heating is normal now', outcome: 'resolve' },
        { label: 'No — still slow', outcome: 'dispatch' }
      ]
    },

    /* --- wrong temperature --- */
    temp: {
      id: 'temp',
      prompt: 'Open Settings → preset temperatures and adjust the cold/hot presets to their preference. Did that fix the temperature?',
      options: [
        { label: 'Yes — temperature is right now', outcome: 'adjust_setting' },
        { label: 'No — still wrong', outcome: 'dispatch' }
      ]
    },

    /* --- dripping --- */
    drip: {
      id: 'drip',
      prompt: 'Is it a constant leak, or just an occasional drip after pouring?',
      options: [
        { label: 'Occasional drip after pouring', outcome: 'resolve_normal' },
        { label: 'Constant leak / from the connector', outcome: 'dispatch_leak' }
      ]
    },
    tray: {
      id: 'tray',
      prompt: 'The drip tray just needs emptying. Ask them to slide it out, empty it, and slide it back. All good?',
      options: [
        { label: 'Yes — emptied, all good', outcome: 'resolve' },
        { label: 'No — tray is damaged / stuck', outcome: 'dispatch' }
      ]
    },

    /* --- no power / not dispensing --- */
    power: {
      id: 'power',
      prompt: 'Check two things: (1) the power socket is on and the unit has lights, (2) the water inlet valve behind the unit is open. Is it working now?',
      options: [
        { label: 'Yes — it works now', outcome: 'resolve' },
        { label: 'No — still no power / error', outcome: 'dispatch' }
      ]
    }
  };

  var OUTCOMES = {
    resolve:            { kind: 'resolve',  title: 'Resolved — no visit needed', resolution_type: 'self_resolved',
                          detail: 'Log the resolution and close the case.' },
    resolve_normal:     { kind: 'resolve',  title: 'Working as designed', resolution_type: 'self_resolved',
                          detail: 'The Edge is an open, non-pressurised system — an occasional drip after pouring is normal. Reassure and close.' },
    adjust_setting:     { kind: 'resolve',  title: 'Resolved via settings', resolution_type: 'self_resolved',
                          detail: 'Adjusted a preset in Settings. Log and close the case.' },
    consumable_filter:  { kind: 'consumable', title: 'Filter replacement due', resolution_type: 'consumable',
                          part: 'MAZE TE filter', job_kind: 'filter_replacement', priority: 'P3_normal',
                          detail: 'Filter is at end of life. Offer to ship a MAZE TE filter and/or book a visit. Share the self-replace guide.' },
    consumable_uv:      { kind: 'consumable', title: 'UV-C lamp replacement due', resolution_type: 'consumable',
                          part: 'UV-C lamp 11W', job_kind: 'uv_replacement', priority: 'P3_normal',
                          detail: 'UV-C lamp is at end of life. Offer to ship a UV-C lamp and/or book a visit. Share the self-replace guide.' },
    dispatch:           { kind: 'dispatch', title: 'Dispatch a technician', resolution_type: 'dispatch',
                          job_kind: 'repair', priority: 'P3_normal',
                          detail: 'Create a repair work order for Operations to schedule and assign.' },
    dispatch_leak:      { kind: 'dispatch', title: 'Dispatch — leaking connector (priority)', resolution_type: 'dispatch',
                          job_kind: 'repair', priority: 'P2_high',
                          detail: 'Leaking connector. Create a P2 repair work order and flag for Operations.' }
  };

  window.BT_TS = { TREE: TREE, OUTCOMES: OUTCOMES, ROOT: 'root' };
})();
