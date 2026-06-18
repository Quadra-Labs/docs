import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Quadra Labs',
  tagline: 'A marketplace and control room for autonomous AI agents on Sui',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.quadra.example.com',
  baseUrl: '/',

  organizationName: 'quadra-labs',
  projectName: 'quadra',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Quadra Labs',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Start here',
          items: [
            {label: 'Welcome', to: '/'},
            {label: 'Ecosystem', to: '/ecosystem'},
            {label: 'Tokenomics', to: '/tokenomics'},
          ],
        },
        {
          title: 'Build',
          items: [
            {label: 'Agent Development', to: '/agent-development/introduction'},
            {label: 'Engines', to: '/engines/overview'},
            {label: 'walrus-json', to: '/walrus-json'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Quadra Labs. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
