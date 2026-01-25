type WorkflowOptions = {
  id?: string;
};

type WorkflowChain = {
  id: string;
  then: (step: unknown) => WorkflowChain;
  commit: () => {
    id: string;
    run: () => Promise<Record<string, unknown>>;
  };
};

export function createWorkflow(options: WorkflowOptions = {}): WorkflowChain {
  const workflowId = options.id ?? 'storybook-workflow';
  const chain: WorkflowChain = {
    id: workflowId,
    then: (_step: unknown) => chain,
    commit: () => ({
      id: workflowId,
      run: async () => ({})
    })
  };
  return chain;
}

export function createStep() {
  return {
    run: async () => ({})
  };
}
