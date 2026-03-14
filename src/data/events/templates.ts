import type { EventTemplate } from '../../types';

export const EVENT_TEMPLATES = [
  {
    id: 'event-broken-caravan',
    key: 'broken-caravan',
    nodeType: 'story',
    text: {
      title: '断裂商队',
      description: '你们在碎石坡道旁发现一支倾覆的商队，货箱半埋在尘沙里，仍有余温。',
    },
    tags: ['loot', 'risk'],
    choices: [
      {
        id: 'choice-search-supplies',
        text: '翻找还能使用的物资',
        outcomeText: '你们找到一批碎晶，但也惊动了附近窥伺者。',
        effects: [{ type: 'grant-resource', resource: 'shards', amount: 18 }],
      },
      {
        id: 'choice-bury-dead',
        text: '为商队遇难者做简短安葬',
        outcomeText: '队伍情绪稍有缓和，领队声望也获得认可。',
        effects: [{ type: 'modify-relationship', amount: 1, target: 'party' }],
      },
    ],
  },
  {
    id: 'event-ember-shrine',
    key: 'ember-shrine',
    nodeType: 'story',
    text: {
      title: '余烬小祠',
      description: '一座供奉着古老火焰碎片的小祠堂仍在运作，火苗在玻璃罩中无声跳动。',
    },
    tags: ['shrine', 'status'],
    choices: [
      {
        id: 'choice-touch-flame',
        text: '触碰火焰试图借力',
        outcomeText: '你从中汲取短暂力量，但体内残留灼热。',
        effects: [{ type: 'grant-status', statusKey: 'burning', duration: 2, target: 'leader' }],
      },
      {
        id: 'choice-safe-prayer',
        text: '保持距离进行祈念',
        outcomeText: '火焰温和回应，为队伍补充了一点技力。',
        effects: [{ type: 'grant-resource', resource: 'sp', amount: 2 }],
      },
    ],
  },
  {
    id: 'event-quiet-campfire',
    key: 'quiet-campfire',
    nodeType: 'camp',
    text: {
      title: '静默营火',
      description: '风被断墙挡住，这里适合短暂停留，整理负伤与补给。',
    },
    tags: ['rest', 'recovery'],
    choices: [
      {
        id: 'choice-share-rations',
        text: '分发口粮并休整',
        outcomeText: '你们恢复部分体力，行军气氛也变得更稳定。',
        effects: [
          { type: 'grant-resource', resource: 'hp', amount: 10 },
          { type: 'modify-relationship', amount: 1, target: 'party' },
        ],
      },
      {
        id: 'choice-save-supplies',
        text: '节省补给，尽快启程',
        outcomeText: '补给保住了，但没人因此感到轻松。',
        effects: [{ type: 'grant-resource', resource: 'shards', amount: 6 }],
      },
    ],
  },
  {
    id: 'event-raider-trail',
    key: 'raider-trail',
    nodeType: 'battle',
    text: {
      title: '掠夺者踪迹',
      description: '散乱脚印和拖拽痕迹指向前方峡口，伏袭似乎近在眼前。',
    },
    tags: ['battle', 'ambush'],
    choices: [
      {
        id: 'choice-engage-raiders',
        text: '主动追击伏兵',
        outcomeText: '你决定先发制人，战斗在峡口打响。',
        effects: [{ type: 'unlock-battle', battleId: 'battle-gate-ambush' }],
      },
      {
        id: 'choice-careful-advance',
        text: '谨慎前进，压低声息',
        outcomeText: '你们仍会遭遇拦截，但至少争取到了准备时间。',
        effects: [{ type: 'unlock-battle', battleId: 'battle-gate-ambush' }],
      },
    ],
  },
  {
    id: 'event-wanted-poster',
    key: 'wanted-poster',
    nodeType: 'recruit',
    text: {
      title: '悬赏告示墙',
      description: '褪色告示层层叠叠，其中一张更新的线索似乎指向一位独行猎人。',
    },
    tags: ['recruit', 'hunter'],
    choices: [
      {
        id: 'choice-hire-hunter',
        text: '按线索寻找那位猎人',
        outcomeText: '你找到卡萨，她愿意加入，但需要实际回报。',
        conditions: { minimumShards: 20 },
        effects: [{ type: 'unlock-recruit', archetypeId: 'recruit-bounty-hunter' }],
      },
      {
        id: 'choice-ignore-poster',
        text: '忽略告示，继续赶路',
        outcomeText: '你放弃了这次招募机会，但避免了额外花销。',
        effects: [{ type: 'grant-resource', resource: 'shards', amount: 4 }],
      },
    ],
  },
  {
    id: 'event-star-mirror',
    key: 'star-mirror',
    nodeType: 'story',
    text: {
      title: '观星镜面',
      description: '一面悬空镜片映出并不存在的夜空，映照者会看见自己的另一种命运。',
    },
    tags: ['mystic', 'skill'],
    choices: [
      {
        id: 'choice-study-mirror',
        text: '停下研究镜面纹路',
        outcomeText: '你从破碎光迹中推导出新的施术方式。',
        effects: [{ type: 'grant-skill', skillId: 'skill-analytic-focus', target: 'leader' }],
      },
      {
        id: 'choice-smash-mirror',
        text: '打碎镜面阻止它窥视',
        outcomeText: '镜面碎裂时逸散出紊乱能量，让全队都紧绷起来。',
        effects: [{ type: 'grant-status', statusKey: 'focused', duration: 1, target: 'party' }],
      },
    ],
  },
  {
    id: 'event-exile-oath',
    key: 'exile-oath',
    nodeType: 'recruit',
    text: {
      title: '流亡誓言',
      description: '一名披着旧披风的守卫者在断桥旁独自驻守，似乎在等待值得托付的人。',
    },
    tags: ['recruit', 'guardian'],
    choices: [
      {
        id: 'choice-invite-warden',
        text: '邀请他同行守望前路',
        outcomeText: '格恩认可你的方向，愿意成为队伍的盾。',
        effects: [{ type: 'unlock-recruit', archetypeId: 'recruit-silent-warden' }],
      },
      {
        id: 'choice-leave-supplies',
        text: '留下补给表示敬意',
        outcomeText: '他没有加入，但记住了你的善意。',
        effects: [{ type: 'modify-relationship', amount: 1, target: 'leader' }],
      },
    ],
  },
  {
    id: 'event-ash-archive',
    key: 'ash-archive',
    nodeType: 'battle',
    text: {
      title: '灰烬档案室',
      description: '封存卷册的大厅中残灰翻飞，某种守备仪式仍在缓慢运作。',
    },
    tags: ['battle', 'ruins'],
    choices: [
      {
        id: 'choice-break-seal',
        text: '破开封印抢先进入',
        outcomeText: '封印碎裂的同时，守备者也被彻底惊醒。',
        effects: [{ type: 'unlock-battle', battleId: 'battle-archive-defense' }],
      },
      {
        id: 'choice-read-inscription',
        text: '先阅读门扉铭文',
        outcomeText: '你大致理解了仪式结构，但战斗依然难免。',
        effects: [{ type: 'unlock-battle', battleId: 'battle-archive-defense' }],
      },
    ],
  },
  {
    id: 'event-fractured-memory',
    key: 'fractured-memory',
    nodeType: 'recruit',
    text: {
      title: '断片记忆',
      description: '一名术士在风化台阶间反复描画同一个符号，她似乎在追赶失去的过去。',
    },
    tags: ['recruit', 'mystic'],
    choices: [
      {
        id: 'choice-follow-memory',
        text: '帮助她拼凑记忆碎片',
        outcomeText: '赛芙决定暂时与你们同行，看看答案是否在前方。',
        effects: [{ type: 'unlock-recruit', archetypeId: 'recruit-memory-warlock' }],
      },
      {
        id: 'choice-offer-crystal',
        text: '给她一些碎晶换取线索',
        outcomeText: '她收下碎晶后留下警示，并提高了对你的评价。',
        conditions: { minimumShards: 10 },
        effects: [{ type: 'modify-relationship', amount: 1, target: 'leader' }],
      },
    ],
  },
  {
    id: 'event-fallen-observatory',
    key: 'fallen-observatory',
    nodeType: 'boss',
    text: {
      title: '坠落观测台',
      description: '漂浮圣坛缓慢下沉，核心碎片在穹顶中央汇聚成一轮刺目的伪星。',
    },
    tags: ['boss', 'finale'],
    choices: [
      {
        id: 'choice-face-tyrant',
        text: '直面碎核暴君',
        outcomeText: '你们踏上祭坛，终局战斗正式开始。',
        effects: [{ type: 'unlock-battle', battleId: 'battle-fallen-observatory' }],
      },
      {
        id: 'choice-rally-party',
        text: '先向同伴做最后动员',
        outcomeText: '士气被短暂拉起，但最终仍需迎战暴君。',
        effects: [
          { type: 'modify-relationship', amount: 1, target: 'party' },
          { type: 'unlock-battle', battleId: 'battle-fallen-observatory' },
        ],
      },
    ],
  },
] as const satisfies readonly EventTemplate[];
