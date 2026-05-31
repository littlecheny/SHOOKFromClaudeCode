import type { ShookWorkflow } from './types.js'
import { getNewsWorkflow } from './getNewsWorkflow.js'
import { predictBtcWorkflow } from './predictBtcWorkflow.js'
import { runwayWorkflow } from './runwayWorkflow.js'
import { cockpitWorkflow } from './cockpitWorkflow.js'

const workflows = [
  getNewsWorkflow,
  predictBtcWorkflow,
  runwayWorkflow,
  cockpitWorkflow,
] satisfies ShookWorkflow[]

const workflowByCommand = new Map<string, ShookWorkflow>()

for (const workflow of workflows) {
  workflowByCommand.set(workflow.command, workflow)
  workflowByCommand.set(workflow.name, workflow)
  for (const alias of workflow.aliases ?? []) {
    workflowByCommand.set(alias, workflow)
  }
}

export function listWorkflows(): ShookWorkflow[] {
  return [...workflows]
}

export function getWorkflow(command: string): ShookWorkflow | undefined {
  return workflowByCommand.get(command)
}
