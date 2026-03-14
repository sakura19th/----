import { createRun } from '../../domain/run/createRun';
import { resolveNode } from '../../domain/run/resolveNode';

function invariant(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runStage5SmokeTest() {
  const run = createRun({ seed: 'stage5-smoke' });

  invariant(run.map.nodes.length >= 8, 'Stage5 地图至少应包含 8 个节点');

  const recruitCount = run.map.nodes.filter((node) => node.nodeType === 'recruit').length;
  const storyCount = run.map.nodes.filter((node) => node.nodeType === 'story').length;
  const campCount = run.map.nodes.filter((node) => node.nodeType === 'camp').length;
  const bossCount = run.map.nodes.filter((node) => node.nodeType === 'boss').length;

  invariant(recruitCount >= 2 && recruitCount <= 3, 'Stage5 地图应包含 2 到 3 个招募节点');
  invariant(storyCount >= 3 && storyCount <= 4, 'Stage5 地图应包含 3 到 4 个剧情/事件节点');
  invariant(campCount === 1, 'Stage5 地图应包含 1 个营地节点');
  invariant(bossCount === 1, 'Stage5 地图应包含 1 个 Boss 节点');

  let progressed = run;
  for (const node of run.map.nodes) {
    const event = progressed.availableEvents.find((candidate) => candidate.id === node.refId);
    invariant(Boolean(event), `节点 ${node.id} 应可解析到事件模板`);
    progressed = resolveNode(progressed, node.id, event!.choices[0].id);
  }

  const bossNode = progressed.map.nodes.find((node) => node.nodeType === 'boss');
  invariant(Boolean(bossNode), 'Stage5 地图必须存在 Boss 节点');
  invariant(bossNode?.status === 'resolved', 'Boss 节点在完成链路后应为 resolved');
  invariant(progressed.completedNodeResults.length === run.map.nodes.length, '所有地图节点都应写入 completedNodeResults');
  invariant(progressed.presentation.pendingEncounter?.battleId === 'battle-fallen-observatory', 'Boss 节点结算后应挂起终局战斗');

  const resultRun = {
    ...progressed,
    result: {
      outcome: 'victory' as const,
      summary: 'Stage5 smoke：Boss 已被击败，结果页可展示结算摘要。',
      finalNodeId: bossNode?.id ?? null,
    },
    presentation: {
      ...progressed.presentation,
      activeScreen: 'result' as const,
      pendingEncounter: null,
      battleContext: null,
    },
  };

  invariant(resultRun.presentation.activeScreen === 'result', '终局状态应切换到 result screen');
  invariant(resultRun.result?.outcome === 'victory', '结果页状态中应记录胜利结果');
  invariant(resultRun.result?.finalNodeId === bossNode?.id, '结果页状态应记录终局节点');

  return 'stage5-run-smoke-test: ok';
}

console.log(runStage5SmokeTest());
