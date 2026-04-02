/**
 * Curated counterfactual scenario catalogue.
 *
 * These named scenarios are the clickable options in the web UI
 * and serve as good defaults for common "what if" questions.
 * Each includes real historical context to ground the counterfactual.
 */

import type { Scenario } from './types.js';

export const SCENARIOS: Scenario[] = [
  {
    id: 'iron_weapons',
    label: 'Iron weapons',
    description: 'Introduce iron metallurgy for weapons production',
    changes: [{ variable_code: 'Iron_weapons', new_value: 'present' }],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 3,
    real_world_example:
      'The spread of iron across Sub-Saharan Africa (800 BCE\u2013200 CE) transformed military capacity and territorial organisation.',
  },
  {
    id: 'cavalry',
    label: 'Cavalry warfare',
    description: 'Introduce horse-mounted combat',
    changes: [{ variable_code: 'Cavalry', new_value: 'present' }],
    requires: ['Horse_riding'],
    regions_applicable: ['Americas', 'Oceania-Pacific', 'East Asia'],
    expected_lag_centuries: 2,
    real_world_example:
      'Cavalry adoption transformed the Xiongnu and later Mongol states into dominant regional powers within 200 years.',
  },
  {
    id: 'iron_cav_combined',
    label: 'Iron weapons + cavalry',
    description:
      'The historically most powerful combination \u2014 the full IronCav variable',
    changes: [
      { variable_code: 'Iron_weapons', new_value: 'present' },
      { variable_code: 'Cavalry', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 3,
    real_world_example:
      'The combination that drove the rise of megaempires across Eurasia between 500 BCE and 200 CE.',
  },
  {
    id: 'writing_system',
    label: 'Writing system',
    description: 'Introduce a phonetic alphabet or logographic script',
    changes: [{ variable_code: 'Writing', new_value: 'present' }],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 1,
    real_world_example:
      'Adoption of Phoenician script by Greek-speaking peoples (800 BCE) enabled rapid literary and administrative expansion.',
  },
  {
    id: 'gunpowder',
    label: 'Gunpowder weapons',
    description: 'Introduce gunpowder and early firearms',
    changes: [
      { variable_code: 'Handheld_firearm', new_value: 'present' },
      { variable_code: 'Gunpowder', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific', 'Africa'],
    expected_lag_centuries: 2,
    real_world_example:
      'Ottoman adoption of gunpowder artillery (1453) enabled conquest of Constantinople within 50 years of widespread adoption.',
  },
  {
    id: 'bronze_weapons',
    label: 'Bronze weapons',
    description: 'Introduce bronze metallurgy for weapons and tools',
    changes: [{ variable_code: 'Bronze', new_value: 'present' }],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 2,
    real_world_example:
      'Bronze Age civilisations in Mesopotamia (3300\u20131200 BCE) developed the first large-scale state systems around bronze technology.',
  },
  {
    id: 'professional_army',
    label: 'Professional standing army',
    description: 'Establish a permanent professional military force',
    changes: [
      { variable_code: 'Professional_soldier', new_value: 'present' },
      { variable_code: 'Professional_military_officer', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 1,
    real_world_example:
      'The Marian reforms (107 BCE) transformed Rome\u2019s militia into a professional army, enabling rapid territorial expansion.',
  },
  {
    id: 'coinage',
    label: 'Monetary coinage',
    description: 'Introduce standardised metal coinage for trade',
    changes: [{ variable_code: 'Indigenous_coin', new_value: 'present' }],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 1,
    real_world_example:
      'Lydian coinage (600 BCE) spread rapidly through the Mediterranean, facilitating long-distance trade networks.',
  },
  {
    id: 'moralizing_religion',
    label: 'Moralising high god',
    description: 'Introduce belief in a moralising supernatural being',
    changes: [
      { variable_code: 'Moralizing_god', new_value: 'present' },
      { variable_code: 'High_god', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 2,
    real_world_example:
      'The rise of moralising religions (Zoroastrianism, Buddhism, Christianity) correlates with increasing social complexity in the Axial Age.',
  },
  {
    id: 'irrigation',
    label: 'Irrigation systems',
    description: 'Introduce large-scale irrigation infrastructure',
    changes: [{ variable_code: 'Irrigation', new_value: 'present' }],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 2,
    real_world_example:
      'Irrigation in the Nile Valley enabled population densities 5-10x higher than rain-fed agriculture alone.',
  },
  {
    id: 'steel_weapons',
    label: 'Steel weapons',
    description: 'Introduce steel metallurgy for superior weapons and armour',
    changes: [{ variable_code: 'Steel', new_value: 'present' }],
    requires: ['Iron_weapons'],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 3,
    real_world_example:
      'Wootz steel from South Asia (300 BCE) produced Damascus swords renowned across the ancient world.',
  },
  {
    id: 'seafaring',
    label: 'Long-distance seafaring',
    description: 'Introduce ocean-going vessels capable of extended voyages',
    changes: [
      { variable_code: 'War_vessel', new_value: 'present' },
      { variable_code: 'Merchant_ship', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 2,
    real_world_example:
      'Polynesian long-distance seafaring (1000 BCE\u2013) colonised the Pacific. Phoenician trade networks reshaped Mediterranean economies.',
  },
  {
    id: 'iron_plow',
    label: 'Iron plough',
    description: 'Introduce iron-tipped ploughs for agricultural intensification',
    changes: [
      { variable_code: 'Iron_weapons', new_value: 'present' },
      { variable_code: 'Plow', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 2,
    real_world_example:
      'The heavy iron plough transformed Northern European agriculture (500\u2013800 CE), enabling cultivation of heavy clay soils.',
  },
  {
    id: 'writing_bureaucracy',
    label: 'Writing + bureaucracy',
    description: 'Introduce both writing and a formal administrative system',
    changes: [
      { variable_code: 'Writing', new_value: 'present' },
      { variable_code: 'Full_time_bureaucrat', new_value: 'present' },
      { variable_code: 'Formal_legal_code', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 2,
    real_world_example:
      'The combination of cuneiform and bureaucracy in Ur III (2100 BCE) created the first systematically administered state.',
  },
  {
    id: 'fortification',
    label: 'Stone fortifications',
    description: 'Introduce stone-walled defensive fortifications',
    changes: [
      { variable_code: 'Fortification', new_value: 'present' },
      { variable_code: 'Stone_wall', new_value: 'present' },
    ],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 1,
    real_world_example:
      'Jericho\u2019s walls (~8000 BCE) are among the earliest known fortifications. Chinese rammed-earth walls enabled territorial consolidation.',
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
