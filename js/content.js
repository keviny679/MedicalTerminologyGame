// Roguelike content: kami boons (Hades-style), stacking relics (Risk of Rain-style),
// elite modifiers and permanent shrine upgrades. Pure data, no DOM.

export const RARITY = {
  common: { name: "Common", color: "#d8dcf0" },
  rare: { name: "Rare", color: "#5ab0ff" },
  epic: { name: "Epic", color: "#c77dff" },
  legendary: { name: "Legendary", color: "#ff5c6c" },
  uncommon: { name: "Uncommon", color: "#59d98e" },
  cursed: { name: "Cursed", color: "#7f8cff" },
};

export const KAMI = {
  amaterasu: { name: "Amaterasu", title: "Goddess of the Sun", color: "#ffb347" },
  susanoo: { name: "Susanoo", title: "God of Storms", color: "#5ab0ff" },
  tsukuyomi: { name: "Tsukuyomi", title: "God of the Moon", color: "#c7c9ff" },
  inari: { name: "Inari", title: "Kami of Foxes & Fortune", color: "#ff8a3d" },
  raijin: { name: "Raijin", title: "God of Thunder", color: "#c77dff" },
};

const pct = (v) => `${Math.round(v * 100)}%`;

// Each boon adds `values[rarity]` to `stat`. Taking a boon you own levels it up (values stack).
export const BOONS = {
  radiant: { kami: "amaterasu", name: "Radiant Strike", stat: "dmgPct", values: { common: 0.15, rare: 0.25, epic: 0.4 }, desc: (v) => `+${pct(v)} damage.` },
  sunburn: { kami: "amaterasu", name: "Sunburn", stat: "burn", values: { common: 3, rare: 5, epic: 8 }, desc: (v) => `Correct answers ignite the foe. It burns for ${v} after each of your answers.` },
  dawn: { kami: "amaterasu", name: "Dawn's Grace", stat: "healRoom", values: { common: 5, rare: 8, epic: 12 }, desc: (v) => `Heal ${v} HP after clearing each room.` },
  tempest: { kami: "susanoo", name: "Tempest Edge", stat: "crit", values: { common: 0.06, rare: 0.1, epic: 0.15 }, desc: (v) => `+${pct(v)} critical hit chance.` },
  gale: { kami: "susanoo", name: "Second Gale", stat: "double", values: { common: 0.1, rare: 0.15, epic: 0.22 }, desc: (v) => `${pct(v)} chance to strike twice.` },
  fury: { kami: "susanoo", name: "Storm Fury", stat: "streakMult", values: { common: 0.5, rare: 0.8, epic: 1.2 }, desc: (v) => `Streak bonus damage +${pct(v)}.` },
  veil: { kami: "tsukuyomi", name: "Moon Veil", stat: "dodge", values: { common: 0.08, rare: 0.12, epic: 0.18 }, desc: (v) => `${pct(v)} chance to dodge an attack.` },
  ward: { kami: "tsukuyomi", name: "Lunar Ward", stat: "shieldRoom", values: { common: 8, rare: 12, epic: 18 }, desc: (v) => `Start each room with a ${v} HP shield.` },
  stillness: { kami: "tsukuyomi", name: "Still Mind", stat: "forgiveRoom", values: { common: 1, rare: 1, epic: 2 }, desc: (v) => `The first ${v} wrong answer${v > 1 ? "s" : ""} each room can't hurt you.` },
  harvest: { kami: "inari", name: "Golden Harvest", stat: "goldMult", values: { common: 0.25, rare: 0.4, epic: 0.6 }, desc: (v) => `+${pct(v)} mon (gold) from foes.` },
  wisdom: { kami: "inari", name: "Fox Wisdom", stat: "hintGain", values: { common: 1, rare: 2, epic: 3 }, desc: (v) => `Gain ${v} hint${v > 1 ? "s" : ""} now. Your hints also cross out a wrong answer.` },
  fortune: { kami: "inari", name: "Fortune's Favor", stat: "priceCut", values: { common: 0.15, rare: 0.2, epic: 0.3 }, desc: (v) => `Shop prices -${pct(v)}.` },
  thunderclap: { kami: "raijin", name: "Thunderclap", stat: "thunder", values: { common: 15, rare: 22, epic: 32 }, desc: (v) => `Every 3rd correct answer in a row calls lightning for ${v} bonus damage.` },
  static: { kami: "raijin", name: "Static Charge", stat: "static", values: { common: 5, rare: 8, epic: 12 }, desc: (v) => `Wrong answers still zap the foe for ${v}.` },
  overcharge: { kami: "raijin", name: "Overcharge", stat: "critMult", values: { common: 0.5, rare: 0.8, epic: 1.2 }, desc: (v) => `Critical hits deal +${pct(v)} damage.` },
};

// Relics stack: each copy adds `per` to `stat`.
export const ITEMS = {
  whetstone: { name: "Whetstone", rarity: "common", stat: "dmgFlat", per: 3, desc: "+3 damage per hit." },
  riceball: { name: "Onigiri", rarity: "common", stat: "healRoom", per: 5, desc: "Heal 5 HP after each room." },
  luckycoin: { name: "Lucky Coin", rarity: "common", stat: "crit", per: 0.04, desc: "+4% critical hit chance." },
  talisman: { name: "Paper Talisman", rarity: "common", stat: "armor", per: 2, desc: "Take 2 less damage from each hit." },
  pouch: { name: "Coin Pouch", rarity: "common", stat: "goldMult", per: 0.15, desc: "+15% mon from foes." },
  inkstone: { name: "Inkstone", rarity: "common", stat: "hintGain", per: 1, desc: "+1 hint when picked up." },
  kunai: { name: "Kunai", rarity: "uncommon", stat: "double", per: 0.1, desc: "+10% chance to strike twice." },
  lantern: { name: "Spirit Lantern", rarity: "uncommon", stat: "healKill", per: 6, desc: "Heal 6 HP on each kill." },
  omamori: { name: "Omamori", rarity: "uncommon", stat: "forgiveRoom", per: 1, desc: "One wrong answer per room can't hurt you." },
  leaf: { name: "Tanuki Leaf", rarity: "uncommon", stat: "dodge", per: 0.08, desc: "+8% dodge chance." },
  drum: { name: "Taiko Drum", rarity: "uncommon", stat: "streakFlat", per: 2, desc: "Each streak level adds +2 damage." },
  kusanagi: { name: "Kusanagi", rarity: "legendary", stat: "dmgPct", per: 0.5, desc: "+50% damage." },
  phoenix: { name: "Phoenix Feather", rarity: "legendary", stat: "revive", per: 1, desc: "Revive once at 50% HP (used up)." },
  eye: { name: "Eye of Ryujin", rarity: "legendary", stat: "removeOptions", per: 1, desc: "Crosses out a wrong answer on every question (max 2)." },
  onimask: { name: "Oni Mask", rarity: "cursed", stat: "dmgPct", per: 0.6, extra: { enemyDmg: 0.4 }, desc: "+60% damage, but foes hit 40% harder." },
  glass: { name: "Glass Katana", rarity: "cursed", stat: "dmgPct", per: 1.0, extra: { maxHpMult: -0.5 }, desc: "+100% damage, but your max HP is halved." },
  hungry: { name: "Hungry Ghost", rarity: "cursed", stat: "healCorrect", per: 4, extra: { noRoomHeal: 1 }, desc: "Heal 4 on each correct answer, but no healing after rooms." },
};

export const ITEM_WEIGHTS = { common: 60, uncommon: 28, legendary: 5, cursed: 7 };

export const ELITES = {
  armored: { name: "Armored", color: "#c9d6e8", desc: "Takes 30% less damage.", dmgTaken: 0.7 },
  vampiric: { name: "Vampiric", color: "#ff4d6d", desc: "Heals when it hits you.", lifesteal: 0.5 },
  furious: { name: "Furious", color: "#ff9a3d", desc: "Hits 50% harder.", dmgMult: 1.5 },
  warded: { name: "Warded", color: "#7fd9ff", desc: "Its first 2 wounds are blocked.", ward: 2 },
};

// Permanent upgrades bought with Spirit Embers. cost(level) = base * (level + 1)
export const META = {
  vitality: { name: "Vitality", max: 5, base: 15, desc: "+10 max HP." },
  scholar: { name: "Scholar", max: 3, base: 25, desc: "+1 starting hint." },
  prosperity: { name: "Prosperity", max: 3, base: 20, desc: "+15% mon." },
  keen: { name: "Keen Edge", max: 3, base: 20, desc: "+4% critical chance." },
  fate: { name: "Twist of Fate", max: 3, base: 30, desc: "+1 reroll per run for doors and boons." },
  defiance: { name: "Death Defiance", max: 2, base: 60, desc: "Revive once per run at 30% HP." },
};

export function metaCost(id, level) {
  return META[id].base * (level + 1);
}

export const DOOR_INFO = {
  boon: { label: "Blessing", icon: "⛩" },
  item: { label: "Relic chest", icon: "◆" },
  gold: { label: "Mon cache", icon: "◎" },
  elite: { label: "Elite foe", icon: "☠" },
  shop: { label: "Wandering merchant", icon: "⚖" },
  spring: { label: "Hot spring", icon: "♨" },
  boss: { label: "Guardian", icon: "鬼" },
};
