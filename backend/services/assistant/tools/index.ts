import type { ToolSet } from 'ai';
import { webSearchTool } from '../model.js';
import { findEmployeeTool } from './directory.js';
import { attendanceTools } from './attendance.js';
import { expenseTools } from './expenses.js';
import { requestTools } from './requests.js';
import { contentTools } from './content.js';
import { salaryTools } from './salary.js';
import { writingDraftTools } from './drafts/writing.js';
import { formDraftTools } from './drafts/forms.js';
import { approvalDraftTools } from './drafts/approvals.js';
import { attendanceFixDraftTools } from './drafts/attendanceFix.js';
import { profileTools } from './profile.js';
import { fileTools } from './files.js';
import type { AssistantToolDef, ToolContext } from './types.js';

export const TOOL_REGISTRY: AssistantToolDef[] = [
  findEmployeeTool,
  ...profileTools,
  ...attendanceTools,
  ...expenseTools,
  ...requestTools,
  ...contentTools,
  ...salaryTools,
  ...writingDraftTools,
  ...formDraftTools,
  ...approvalDraftTools,
  ...attendanceFixDraftTools,
  ...fileTools,
];

export const buildToolsFor = (ctx: ToolContext): ToolSet => {
  // Employees get no web search: with no directory tool, the model searched the web for colleagues' names.
  const tools: ToolSet = ctx.caller.role === 'employee' ? {} : { web_search: webSearchTool() };
  for (const def of TOOL_REGISTRY) {
    if (!def.roles.includes(ctx.caller.role)) continue;
    const built = def.build(ctx);
    const execute = built.execute;
    if (execute) {
      built.execute = async (input, options) => {
        const output = await execute(input, options);
        ctx.turnResults.push({ tool: def.name, output });
        return output;
      };
    }
    tools[def.name] = built;
  }
  return tools;
};
