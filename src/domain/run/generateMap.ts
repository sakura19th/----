import type { EventNodeKind, RunMap } from '../../types';

type MapNodeBlueprint = {
  id: string;
  index: number;
  nodeType: EventNodeKind;
  refId: string;
};

const STAGE5_NODE_BLUEPRINT: readonly MapNodeBlueprint[] = [
  { id: 'node-1', index: 1, nodeType: 'story', refId: 'event-broken-caravan' },
  { id: 'node-2', index: 2, nodeType: 'recruit', refId: 'event-wanted-poster' },
  { id: 'node-3', index: 3, nodeType: 'story', refId: 'event-ember-shrine' },
  { id: 'node-4', index: 4, nodeType: 'battle', refId: 'event-raider-trail' },
  { id: 'node-5', index: 5, nodeType: 'recruit', refId: 'event-exile-oath' },
  { id: 'node-6', index: 6, nodeType: 'camp', refId: 'event-quiet-campfire' },
  { id: 'node-7', index: 7, nodeType: 'story', refId: 'event-star-mirror' },
  { id: 'node-8', index: 8, nodeType: 'recruit', refId: 'event-fractured-memory' },
  { id: 'node-9', index: 9, nodeType: 'boss', refId: 'event-fallen-observatory' },
];

export function generateMap(): RunMap {
  return {
    chapter: 1,
    nodes: STAGE5_NODE_BLUEPRINT.map((node, index) => ({
      ...node,
      status: index === 0 ? 'available' : 'locked',
    })),
  };
}
