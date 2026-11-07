import * as v from 'valibot'

// The option order is the workspace tabs' order.
export const workspaceSchema = v.picklist(['layout', 'outline', 'pcb', 'case', 'firmware'])
