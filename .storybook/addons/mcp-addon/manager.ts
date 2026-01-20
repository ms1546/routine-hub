import React from 'react';
import { addons, types } from '@storybook/manager-api';

addons.add('mcp-addon/panel', {
  type: types.PANEL,
  title: 'MCP',
  render: () => (
    <div style={{ padding: 12 }}>
      MCP Addon
    </div>
  ),
});
