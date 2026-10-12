/**
 * Player Core's cleric domains and their domain spells by spell slug, as Foundry's domains journal
 * (`packs/pf2e/journals/domains.json`) links them at `pf2e-8.6.0`: by domain key, as `DeityDomain` has it, the initial
 * domain spell, then the advanced one when Player Core prints it. Sun's advanced spell (Vital Luminance) isn't in
 * Player Core, and a domain whose spells only another book prints joins with that book's import. Domain Initiate and
 * Advanced Domain offer them (ADR-0050).
 */
export const DOMAIN_SPELLS: ReadonlyMap<string, readonly [string, string?]> = new Map([
  ['air', ['pushing-gust', 'disperse-into-air']],
  ['ambition', ['ignite-ambition', 'competitive-edge']],
  ['cities', ['face-in-the-crowd', 'pulse-of-civilization']],
  ['confidence', ['veil-of-confidence', 'delusional-pride']],
  ['creation', ['creative-splash', 'artistic-flourish']],
  ['darkness', ['cloak-of-shadow', 'darkened-sight']],
  ['death', ['deaths-call', 'eradicate-undeath']],
  ['destruction', ['cry-of-destruction', 'destructive-aura']],
  ['dreams', ['sweet-dream', 'dreamers-call']],
  ['earth', ['hurtling-stone', 'localized-quake']],
  ['family', ['soothing-words', 'unity']],
  ['fate', ['read-fate', 'tempt-fate']],
  ['fire', ['fire-ray', 'flame-barrier']],
  ['freedom', ['unimpeded-stride', 'word-of-freedom']],
  ['healing', ['healers-blessing', 'rebuke-death']],
  ['indulgence', ['overstuff', 'take-its-course']],
  ['knowledge', ['scholarly-recollection', 'know-the-enemy']],
  ['luck', ['bit-of-luck', 'lucky-break']],
  ['magic', ['magics-vessel', 'mystic-beacon']],
  ['might', ['athletic-rush', 'enduring-might']],
  ['moon', ['moonbeam', 'touch-of-the-moon']],
  ['nature', ['vibrant-thorns', 'natures-bounty']],
  ['nightmares', ['waking-nightmare', 'shared-nightmare']],
  ['pain', ['savor-the-sting', 'retributive-pain']],
  ['passion', ['charming-touch', 'captivating-adoration']],
  ['perfection', ['perfected-mind', 'perfected-body']],
  ['protection', ['protectors-sacrifice', 'protectors-sphere']],
  ['secrecy', ['whispering-quiet', 'safeguard-secret']],
  ['sun', ['dazzling-flash']],
  ['travel', ['agile-feet', 'travelers-transit']],
  ['trickery', ['sudden-shift', 'tricksters-twin']],
  ['truth', ['word-of-truth', 'glimpse-the-truth']],
  ['tyranny', ['touch-of-obedience', 'commanding-lash']],
  ['undeath', ['touch-of-undeath', 'malignant-sustenance']],
  ['water', ['tidal-surge', 'downpour']],
  ['wealth', ['appearance-of-wealth', 'precious-metals']],
  ['zeal', ['weapon-surge', 'zeal-for-battle']],
]);
