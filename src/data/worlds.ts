import type { HubDialogueLine, WorldDefinition } from '../types';

export const HUB_DIALOGUE_LINES: readonly HubDialogueLine[] = [
  {
    id: 'hub-line-1',
    speaker: 'system',
    text: '维度校准完成。新晋行者已抵达主神世界中枢。',
  },
  {
    id: 'hub-line-2',
    speaker: 'lord-god',
    text: '你的首次试炼已经准备就绪。先完成一次完整投送，证明你拥有穿越碎片世界的资格。',
  },
  {
    id: 'hub-line-3',
    speaker: 'guide',
    text: '当前仅开放一个训练世界：废弃前哨站。完成探索、击败核心守卫，即可结束本局试炼。',
  },
];

export const WORLD_CATALOG: readonly WorldDefinition[] = [
  {
    id: 'world-abandoned-outpost',
    title: '废弃前哨站',
    subtitle: '第一次投送试炼',
    description: '一座被遗弃的边境前哨站持续向外释放异常能量。你需要清理外围、深入核心，并带着战果撤离。',
    difficultyLabel: '普通',
    estimatedDuration: '10-20 分钟',
    unlockStatus: 'available',
    introText: '外围巡逻敌人已经苏醒，前哨站深处还有一名核心守卫正在等待闯入者。',
    flowId: 'flow-abandoned-outpost',
  },
  {
    id: 'world-frozen-corridor',
    title: '冻原回廊',
    subtitle: '后续多世界扩展预留',
    description: '暂未开放。保留为未来多世界接入时的第二个试炼入口。',
    difficultyLabel: '未开放',
    estimatedDuration: '待定',
    unlockStatus: 'locked',
    introText: '该世界尚未开放。',
    flowId: 'flow-frozen-corridor',
  },
];
