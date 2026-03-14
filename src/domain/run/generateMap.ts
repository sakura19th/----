import type { EventNodeKind, RunMap } from '../../types';

type MapNodeBlueprint = {
  id: string;
  index: number;
  nodeType: EventNodeKind;
  refId: string;
};

const STAGE2_NODE_BLUEPRINT: readonly MapNodeBlueprint[] = [
  { id: 'node-1', index: 1, nodeType: 'story', refId: 'event-broken-caravan' },
  { id: 'node-2', index: 2, nodeType: 'battle', refId: 'event-raider-trail' },
  { id: 'node-3', index: 3, nodeType: 'recruit', refId: 'event-wanted-poster' },
  { id: 'node-4', index: 4, nodeType: 'camp', refId: 'event-quiet-campfire' },
];

export function generateMap(): RunMap {
  return {
    chapter: 1,
    nodes: STAGE2_NODE_BLUEPRINT.map((node, index) => ({
      ...node,
      status: index === 0 ? 'available' : 'locked',
    })),
  };
}
