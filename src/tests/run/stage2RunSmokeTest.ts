import { createRun } from '../../domain/run/createRun';
import { getResolvableEvent, resolveNode } from '../../domain/run/resolveNode';

function invariant(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runStage2SmokeTest() {
  const run = createRun({ seed: 'stage2-smoke' });
  invariant(run.map.nodes.length === 4, '地图节点数量应为 4');
  invariant(run.currentNodeId === 'node-1', '初始当前节点应为 node-1');

  const firstEvent = getResolvableEvent(run, run.currentNodeId);
  invariant(firstEvent?.id === 'event-broken-caravan', '首个节点应指向断裂商队事件');

  const afterFirstNode = resolveNode(run, run.currentNodeId, firstEvent!.choices[0].id);
  invariant(afterFirstNode.resources.shards > run.resources.shards, '首个节点应增加碎晶');
  invariant(afterFirstNode.currentNodeId === 'node-2', '结算后应推进到下一个节点');
  invariant(afterFirstNode.map.nodes[1].status === 'available', '下一节点应解锁');

  const recruitRun = createRun({ seed: 'stage2-recruit' });
  const toRecruitNode = resolveNode(recruitRun, 'node-1', 'choice-search-supplies');
  const toThirdNode = resolveNode(toRecruitNode, 'node-2', 'choice-engage-raiders');
  const recruitEvent = getResolvableEvent(toThirdNode, 'node-3');
  invariant(recruitEvent?.nodeType === 'recruit', '第三节点应为招募事件');

  const afterRecruit = resolveNode(toThirdNode, 'node-3', recruitEvent!.choices[0].id);
  invariant(afterRecruit.party.length === 2, '招募后队伍人数应增加');
  invariant(afterRecruit.presentation.activeScreen === 'map', '招募结算后应返回地图');
  invariant(afterRecruit.save.autoSaveCount === 0, '领域层不直接处理自动存档计数');

  return 'stage2-smoke-test: ok';
}

console.log(runStage2SmokeTest());
