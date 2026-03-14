import type { CharacterTemplate } from '../../types';

export const HERO_ARCHETYPES = [
  {
    identity: {
      id: 'hero-exile-knight',
      name: '艾德里安',
      title: '流亡骑士',
      archetypeId: 'arch-exile-knight',
      category: 'hero',
    },
    classKey: 'vanguard',
    role: 'frontline',
    rarity: 'elite',
    stats: {
      attack: 9,
      defense: 8,
      speed: 5,
      spirit: 4,
    },
    loadout: {
      skillIds: ['skill-iron-sweep', 'skill-rally-standard'],
      passiveEffectIds: ['passive-frontline-discipline'],
    },
    narrative: {
      background: '曾为边境骑士团效力，在世界碎裂后背负失败之名继续旅行。',
      speechStyle: '克制、沉稳，习惯先观察局势再发言。',
      personalities: ['calm', 'loyal', 'pragmatic'],
    },
    recruitCost: 0,
  },
  {
    identity: {
      id: 'hero-black-market-medic',
      name: '缇娅',
      title: '黑市医师',
      archetypeId: 'arch-black-market-medic',
      category: 'hero',
    },
    classKey: 'support',
    role: 'healer',
    rarity: 'elite',
    stats: {
      attack: 5,
      defense: 5,
      speed: 6,
      spirit: 9,
    },
    loadout: {
      skillIds: ['skill-field-treatment', 'skill-cleansing-light'],
      passiveEffectIds: ['passive-illicit-remedy'],
    },
    narrative: {
      background: '行走于废土聚落与隐秘交易站之间，用医术换取情报与通行。',
      speechStyle: '语速平稳但带刺，常用交易隐喻评价局势。',
      personalities: ['kind', 'suspicious', 'pragmatic'],
    },
    recruitCost: 0,
  },
  {
    identity: {
      id: 'hero-ruin-scholar',
      name: '洛恩',
      title: '遗迹学者',
      archetypeId: 'arch-ruin-scholar',
      category: 'hero',
    },
    classKey: 'scholar',
    role: 'controller',
    rarity: 'elite',
    stats: {
      attack: 4,
      defense: 4,
      speed: 6,
      spirit: 10,
    },
    loadout: {
      skillIds: ['skill-ether-bolt', 'skill-analytic-focus'],
      passiveEffectIds: ['passive-archive-insight'],
    },
    narrative: {
      background: '沉迷收集旧文明残页，相信世界核心碎片中藏有重组现实的规律。',
      speechStyle: '喜欢引用记录与推论，逻辑性强。',
      personalities: ['calm', 'idealistic', 'pessimistic'],
    },
    recruitCost: 0,
  },
] as const satisfies readonly CharacterTemplate[];

export const RECRUIT_ARCHETYPES = [
  {
    identity: {
      id: 'recruit-cult-defector',
      name: '薇萝',
      title: '教团叛徒',
      archetypeId: 'arch-cult-defector',
      category: 'recruit',
    },
    classKey: 'mystic',
    role: 'controller',
    rarity: 'common',
    stats: {
      attack: 4,
      defense: 3,
      speed: 6,
      spirit: 11,
    },
    loadout: {
      skillIds: ['skill-starfall-hymn', 'skill-analytic-focus'],
      passiveEffectIds: ['passive-echo-chant'],
    },
    narrative: {
      background: '曾在观星教团中负责吟唱仪式，如今逃离旧誓言寻找新的归处。',
      speechStyle: '语气空灵，常以预兆与星象比喻人心。',
      personalities: ['idealistic', 'suspicious', 'kind'],
    },
    recruitCost: 24,
  },
  {
    identity: {
      id: 'recruit-bounty-hunter',
      name: '卡萨',
      title: '赏金猎人',
      archetypeId: 'arch-bounty-hunter',
      category: 'recruit',
    },
    classKey: 'assassin',
    role: 'striker',
    rarity: 'common',
    stats: {
      attack: 10,
      defense: 4,
      speed: 9,
      spirit: 3,
    },
    loadout: {
      skillIds: ['skill-shadow-step', 'skill-silence-thread'],
      passiveEffectIds: ['passive-marked-prey'],
    },
    narrative: {
      background: '穿梭各个碎片城区追捕悬赏目标，以冷酷效率换取生存资本。',
      speechStyle: '短句、直接，不喜欢无用寒暄。',
      personalities: ['pragmatic', 'greedy', 'calm'],
    },
    recruitCost: 22,
  },
  {
    identity: {
      id: 'recruit-silent-warden',
      name: '格恩',
      title: '沉默守卫',
      archetypeId: 'arch-silent-warden',
      category: 'recruit',
    },
    classKey: 'guardian',
    role: 'frontline',
    rarity: 'common',
    stats: {
      attack: 7,
      defense: 10,
      speed: 4,
      spirit: 4,
    },
    loadout: {
      skillIds: ['skill-bastion-oath', 'skill-iron-sweep'],
      passiveEffectIds: ['passive-oath-plate'],
    },
    narrative: {
      background: '曾在边缘要塞守门多年，旧要塞坍塌后只剩下继续守护的本能。',
      speechStyle: '寡言少语，只在关键时刻给出判断。',
      personalities: ['loyal', 'calm', 'pessimistic'],
    },
    recruitCost: 20,
  },
  {
    identity: {
      id: 'recruit-memory-warlock',
      name: '赛芙',
      title: '失忆术士',
      archetypeId: 'arch-memory-warlock',
      category: 'recruit',
    },
    classKey: 'mystic',
    role: 'striker',
    rarity: 'common',
    stats: {
      attack: 5,
      defense: 4,
      speed: 7,
      spirit: 10,
    },
    loadout: {
      skillIds: ['skill-starfall-hymn', 'skill-silence-thread'],
      passiveEffectIds: ['passive-fractured-memory'],
    },
    narrative: {
      background: '只记得自己曾触碰过某块核心碎片，之后的记忆像被火焰烧断。',
      speechStyle: '情绪跳跃，偶尔会说出像预言一样的话。',
      personalities: ['impulsive', 'idealistic', 'arrogant'],
    },
    recruitCost: 26,
  },
] as const satisfies readonly CharacterTemplate[];
