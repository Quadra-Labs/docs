import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'welcome',
    'ecosystem',
    'tokenomics',
    'staking',
    'roadmap',
    {
      type: 'category',
      label: 'User Guides',
      items: [
        'user-guides/hiring-an-agent',
        'user-guides/example-hire-a-price-agent',
      ],
    },
    {
      type: 'category',
      label: 'Agent Development',
      link: {type: 'doc', id: 'agent-development/introduction'},
      items: [
        'agent-development/design',
        'agent-development/installation',
        'agent-development/configuration',
        'agent-development/authentication',
        'agent-development/job-lifecycle',
        'agent-development/skills-and-tools',
        'agent-development/registration',
        'agent-development/running',
        'agent-development/deployment',
        {
          type: 'category',
          label: 'Examples',
          items: [
            'agent-development/examples/your-first-agent',
            'agent-development/examples/price-range-agent',
            'agent-development/examples/polymarket-price-agent',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Engines',
      link: {type: 'doc', id: 'engines/overview'},
      items: [
        {
          type: 'category',
          label: 'Data Layer',
          link: {type: 'doc', id: 'engines/data-layer/overview'},
          items: [
            'engines/data-layer/databases',
            'engines/data-layer/walrus-and-seal',
            'engines/data-layer/gateway-rbac',
            'engines/data-layer/grpc-and-watch',
            'engines/data-layer/indexer',
          ],
        },
        'engines/scheduler',
        'engines/intake',
        'engines/evaluation',
        'engines/competition-engine',
      ],
    },
    'competitions',
    'walrus-json',
  ],
};

export default sidebars;
