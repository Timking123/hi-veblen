import type { Profile } from '@/types'
import type { Project } from '@/types/project'
import type { SkillTreeNode } from '@/types/skillTree'

/**
 * 黄彦杰先生的个人信息数据配置
 * Personal profile data for Mr. Huang Yanjie
 */
export const profileData: Profile = {
  // 基本信息 - Basic Information
  name: '黄彦杰',
  title: '前端开发工程师 / 软件需求分析师',
  phone: '+86 14775378984',
  email: '1243222867@qq.com',
  avatar: '/images/avatar.png',

  // 个人简介 - Personal Summary
  summary:
    '我是软件工程专业出身（年级排名前10%），兼具扎实的工程开发能力与宏观的行业研究视野。在技术侧，我专注于Vue 3 全家桶与 ECharts 数据可视化开发，并熟悉 Java、Python 等后端栈。在香港城市大学深圳研究院期间，负责了智能客服系统网页端的开发，完成了从 UI 视觉设计到功能实现的全流程落地，展现了极强的技术执行力。在业务侧，我相比传统开发者，更具备敏锐的 B 端业务洞察力。在深圳市人工智能产业协会任职期间，实地调研了数十家科技企业（涵盖大健康、智能制造等），能够精准把握市场趋势与用户痛点，从而反哺产品设计与技术选型。',

  // 求职意向 - Job Intentions
  jobIntentions: [
    '前端开发工程师',
    '软件需求分析师',
  ],

  // 教育经历 - Education
  education: [
    {
      id: 'edu-1',
      school: '广州华商学院',
      college: '人工智能学院',
      major: '软件工程专业',
      period: '2023.09 - 2025.06',
      rank: '综合排名：年级前10%',
      honors: [
        '优秀学生干部',
        '学生会优秀部门',
      ],
      courses: [
        { name: 'AIGC生成式人工智能', score: 98 },
        { name: 'Python程序设计', score: 94 },
        { name: '人工智能基础', score: 94 },
        { name: '程序设计课程设计', score: 93 },
        { name: '面向对象程序设计', score: 92 },
        { name: '软件项目管理', score: 90 },
        { name: '创业管理', score: 90 },
        { name: '团队激励与沟通', score: 90 },
        { name: '大型数据库应用', score: 89 },
        { name: '创新创业实践', score: 88 },
        { name: 'Web前端技术', score: 86 },
        { name: '数据库系统课程设计', score: 84 },
      ],
    },
  ],

  // 工作经历 - Work Experience
  experience: [
    {
      id: 'exp-1',
      company: '香港城市大学深圳研究院',
      position: '前端开发工程师',
      period: '2024.08 - 2025.12',
      responsibilities: [
        'Vue 3 前端重构与开发：基于 Vue 3 框架，从设计到实现独立完成了智能客服系统网页端多个页面的全流程开发。并确保了多终端兼容性，大幅提升了用户交互体验。',
        '数据可视化模块构建：利用 ECharts 定制可视化仪表盘，实现了订单量、咨询量、转化率等核心业务数据的实时动态渲染，将复杂数据转化为直观图表，有效提升了业务端的数据监控效率。',
        '全链路质量保障与协作：深度参与需求评审与敏捷开发流程，进行前端功能测试与Bug修复，确保上线版本零重大缺陷。与后端团队紧密配合完成 RESTful API 接口联调，规范了前后端交互标准，保证了项目在紧迫工期内高质量交付。',
      ],
      achievements: [
        { metric: '页面开发', value: '多个页面' },
        { metric: '数据可视化', value: 'ECharts' },
        { metric: '质量保障', value: '零重大缺陷' },
      ],
    },
    {
      id: 'exp-2',
      company: '深圳市人工智能产业协会',
      position: '研究员',
      period: '2022.06 - 2023.08',
      responsibilities: [
        '行业深度调研与报告撰写：执行对 20+ 家科技企业（覆盖AI、大健康、智能制造等领域）的实地考察与深度访谈。通过多维度数据收集与分析，撰写了多份行业与企业调研报告，为协会决策提供了核心数据支持与参考。',
        '企业与协会资源对接：担任企业与协会间的核心联络人，协助策划多次高层闭门会议，详细记录会议纪要并跟进后续行动项，有效推进了会员企业间的资源置换与战略合作落地。',
        '新媒体运营与内容分发：独立负责协会部门官方公众号的内容策略与运营，定期输出高价值的行业动态、政策深度解读及协会新闻。通过优化选题与排版，提升了内容的专业度与传播力。',
      ],
      achievements: [
        { metric: '企业调研', value: '20+家' },
        { metric: '调研报告', value: '多份' },
        { metric: '会议策划', value: '多次' },
      ],
    },
  ],

  // 技能 - Skills
  skills: [
    // 前端技能
    {
      name: 'Vue.js',
      level: 95,
      category: 'frontend',
      experience: '熟练掌握 Vue 3 全家桶，包括 Composition API、Pinia 状态管理、Vue Router',
      projects: ['智能客服系统', '个人求职网站'],
    },
    {
      name: 'TypeScript',
      level: 90,
      category: 'frontend',
      experience: '熟练使用 TypeScript 进行类型安全的前端开发',
      projects: ['智能客服系统', '个人求职网站'],
    },
    {
      name: 'ECharts',
      level: 92,
      category: 'frontend',
      experience: '精通 ECharts 数据可视化开发，定制可视化仪表盘',
      projects: ['智能客服系统数据可视化模块'],
    },
    {
      name: 'JavaScript',
      level: 93,
      category: 'frontend',
      experience: '深入理解 ES6+、异步编程、原型链等核心概念',
      projects: ['所有前端项目'],
    },
    {
      name: 'HTML5/CSS3',
      level: 92,
      category: 'frontend',
      experience: '熟练掌握语义化、响应式布局、CSS 动画',
      projects: ['所有前端项目'],
    },
    {
      name: 'TailwindCSS',
      level: 88,
      category: 'frontend',
      experience: '熟悉原子化 CSS 开发模式',
      projects: ['个人求职网站'],
    },
    {
      name: 'Vite',
      level: 85,
      category: 'frontend',
      experience: '熟悉构建配置和性能优化',
      projects: ['个人求职网站'],
    },
    {
      name: 'UI/UX 设计',
      level: 85,
      category: 'frontend',
      experience: '具备从 UI 视觉设计到功能实现的全流程能力',
      projects: ['智能客服系统'],
    },

    // 后端技能
    {
      name: 'Java',
      level: 80,
      category: 'backend',
      experience: '熟悉 Java 后端开发',
      projects: ['后端项目开发'],
    },
    {
      name: 'Python',
      level: 85,
      category: 'backend',
      experience: '熟练使用 Python 进行数据处理和脚本开发',
      projects: ['数据分析', 'AIGC 项目'],
    },
    {
      name: 'RESTful API',
      level: 88,
      category: 'backend',
      experience: '熟练进行前后端接口联调，规范前后端交互标准',
      projects: ['智能客服系统'],
    },
    {
      name: 'MySQL',
      level: 80,
      category: 'backend',
      experience: '熟悉数据库设计和 SQL 查询',
      projects: ['数据库应用项目'],
    },

    // 工具和其他
    {
      name: 'Git',
      level: 90,
      category: 'tools',
      experience: '熟练掌握版本控制和团队协作',
      projects: ['所有项目'],
    },
    {
      name: 'Figma',
      level: 82,
      category: 'tools',
      experience: '能够独立完成 UI 设计稿还原',
      projects: ['智能客服系统'],
    },
    {
      name: 'Postman',
      level: 85,
      category: 'tools',
      experience: '熟练进行 API 测试和调试',
      projects: ['所有涉及接口的项目'],
    },

    // 其他技能
    {
      name: '软件需求分析',
      level: 88,
      category: 'other',
      experience: '深度参与需求评审与敏捷开发流程',
      projects: ['智能客服系统'],
    },
    {
      name: '行业研究',
      level: 85,
      category: 'other',
      experience: '具备敏锐的 B 端业务洞察力，实地调研 20+ 家科技企业',
      projects: ['人工智能产业协会调研项目'],
    },
    {
      name: '数据分析',
      level: 82,
      category: 'other',
      experience: '多维度数据收集与分析，撰写行业与企业调研报告',
      projects: ['人工智能产业协会调研项目'],
    },
    {
      name: '新媒体运营',
      level: 80,
      category: 'other',
      experience: '独立负责公众号内容策略与运营',
      projects: ['人工智能产业协会公众号'],
    },
  ],

  // 校园经历 - Campus Experience
  campusExperience: [
    {
      organization: '广州华商学院人工智能学院团委',
      position: '班级团支书',
      period: '2021.09 - 2025.06',
    },
    {
      organization: '广州华商学院人工智能学院学生会',
      position: '秘书处负责人',
      period: '2021.09 - 2024.06',
    },
    {
      organization: '广州华商学院学生党建工作委员会',
      position: '统战部学生骨干',
      period: '2022.09 - 2024.06',
    },
  ],
}

// 导出默认配置
export default profileData

/**
 * 项目数据配置
 * Project data configuration
 */
export const projectsData: Project[] = [
  {
    id: 'proj-1',
    name: '智能客服系统',
    description: '基于 Vue 3 框架开发的智能客服系统网页端，实现了从 UI 视觉设计到功能实现的全流程落地。系统包含多终端兼容的用户界面、实时数据可视化仪表盘、以及完整的客服工作台功能。',
    period: '2024.08 - 2025.12',
    role: '前端开发工程师',
    technologies: ['Vue 3', 'TypeScript', 'ECharts', 'Pinia', 'Vue Router', 'RESTful API'],
    highlights: [
      '独立完成多个页面的全流程开发，从设计到实现',
      '使用 ECharts 定制可视化仪表盘，实现核心业务数据的实时动态渲染',
      '确保多终端兼容性，大幅提升用户交互体验',
      '与后端团队紧密配合完成 RESTful API 接口联调',
      '上线版本零重大缺陷',
    ],
    screenshots: [
      '/images/projects/customer-service-1.png',
      '/images/projects/customer-service-2.png',
      '/images/projects/customer-service-3.png',
    ],
    category: 'work',
  },
  {
    id: 'proj-2',
    name: '个人求职网站',
    description: '使用 Vue 3 + TypeScript 构建的现代化个人求职网站，展示个人简历、技能、项目经验等信息。网站采用响应式设计，支持深色/浅色主题切换，并包含一个隐藏的彩蛋游戏。',
    period: '2024.10 - 至今',
    role: '全栈开发者',
    technologies: ['Vue 3', 'TypeScript', 'Vite', 'Pinia', 'ECharts', 'Canvas API', 'PWA'],
    highlights: [
      '采用 Vue 3 Composition API 和 TypeScript 进行类型安全开发',
      '实现响应式布局，完美适配桌面端和移动端',
      '支持深色/浅色/跟随系统三种主题模式',
      '使用 Canvas API 开发隐藏的飞机大战彩蛋游戏',
      '配置 PWA 支持，可安装到设备主屏幕',
      '使用 ECharts 实现技能雷达图可视化',
    ],
    screenshots: [
      '/images/projects/portfolio-1.png',
      '/images/projects/portfolio-2.png',
      '/images/projects/portfolio-3.png',
    ],
    demoUrl: 'https://huangyanjie.com',
    sourceUrl: 'https://github.com/huangyanjie/portfolio',
    category: 'personal',
  },
  {
    id: 'proj-3',
    name: '数据可视化仪表盘',
    description: '为智能客服系统开发的数据可视化模块，使用 ECharts 实现订单量、咨询量、转化率等核心业务数据的实时动态渲染，将复杂数据转化为直观图表。',
    period: '2024.09 - 2024.11',
    role: '前端开发工程师',
    technologies: ['Vue 3', 'ECharts', 'TypeScript', 'WebSocket'],
    highlights: [
      '定制多种图表类型：折线图、柱状图、饼图、雷达图等',
      '实现数据实时更新和动态渲染',
      '优化图表性能，支持大数据量展示',
      '设计响应式布局，适配不同屏幕尺寸',
      '有效提升业务端的数据监控效率',
    ],
    screenshots: [
      '/images/projects/dashboard-1.png',
      '/images/projects/dashboard-2.png',
    ],
    category: 'work',
  },
  {
    id: 'proj-4',
    name: 'AI 产业调研报告系统',
    description: '在深圳市人工智能产业协会期间，参与开发的行业调研数据管理系统，用于整理和分析对 20+ 家科技企业的调研数据。',
    period: '2022.06 - 2023.08',
    role: '数据分析师 / 开发者',
    technologies: ['Python', 'MySQL', 'Excel', 'Word'],
    highlights: [
      '设计数据收集和整理流程',
      '使用 Python 进行数据清洗和分析',
      '撰写多份行业与企业调研报告',
      '为协会决策提供核心数据支持',
    ],
    screenshots: [
      '/images/projects/research-1.png',
    ],
    category: 'work',
  },
  {
    id: 'proj-5',
    name: 'AIGC 课程项目',
    description: '大学期间的 AIGC 生成式人工智能课程项目，探索和实践各种 AI 生成技术的应用场景。',
    period: '2024.03 - 2024.06',
    role: '项目负责人',
    technologies: ['Python', 'OpenAI API', 'Stable Diffusion', 'LangChain'],
    highlights: [
      '课程成绩 98 分，年级排名前列',
      '探索 ChatGPT、Stable Diffusion 等 AIGC 工具的应用',
      '完成多个 AI 辅助创作的实践项目',
      '撰写 AIGC 技术应用报告',
    ],
    screenshots: [
      '/images/projects/aigc-1.png',
    ],
    category: 'personal',
  },
]


/**
 * 技能树数据配置
 * Skill Tree Data Configuration
 * 
 * 以径向树状图形式展示技能的层级关系
 * Display skill hierarchy in radial tree format
 */
export const skillTreeData: SkillTreeNode = {
  id: 'root',
  name: '技能树',
  level: 100,
  children: [
    {
      id: 'frontend',
      name: '前端开发',
      level: 95,
      experience: '3年',
      children: [
        {
          id: 'vue',
          name: 'Vue.js',
          level: 95,
          experience: '2年',
          children: [
            {
              id: 'vue3',
              name: 'Vue 3',
              level: 95,
              experience: '2年',
            },
            {
              id: 'pinia',
              name: 'Pinia',
              level: 90,
              experience: '1.5年',
            },
            {
              id: 'vue-router',
              name: 'Vue Router',
              level: 92,
              experience: '2年',
            },
            {
              id: 'composition-api',
              name: 'Composition API',
              level: 93,
              experience: '2年',
            },
          ],
        },
        {
          id: 'typescript',
          name: 'TypeScript',
          level: 90,
          experience: '2年',
        },
        {
          id: 'javascript',
          name: 'JavaScript',
          level: 93,
          experience: '3年',
          children: [
            {
              id: 'es6',
              name: 'ES6+',
              level: 93,
              experience: '3年',
            },
            {
              id: 'async',
              name: '异步编程',
              level: 90,
              experience: '2年',
            },
          ],
        },
        {
          id: 'html-css',
          name: 'HTML5/CSS3',
          level: 92,
          experience: '3年',
          children: [
            {
              id: 'responsive',
              name: '响应式布局',
              level: 90,
              experience: '2年',
            },
            {
              id: 'css-animation',
              name: 'CSS 动画',
              level: 85,
              experience: '1.5年',
            },
            {
              id: 'tailwind',
              name: 'TailwindCSS',
              level: 88,
              experience: '1年',
            },
          ],
        },
        {
          id: 'echarts',
          name: 'ECharts',
          level: 92,
          experience: '1.5年',
          children: [
            {
              id: 'echarts-bindbasic',
              name: '基础图表',
              level: 95,
              experience: '1.5年',
            },
            {
              id: 'echarts-custom',
              name: '自定义图表',
              level: 88,
              experience: '1年',
            },
          ],
        },
        {
          id: 'build-tools',
          name: '构建工具',
          level: 85,
          experience: '2年',
          children: [
            {
              id: 'vite',
              name: 'Vite',
              level: 85,
              experience: '1.5年',
            },
            {
              id: 'webpack',
              name: 'Webpack',
              level: 75,
              experience: '1年',
            },
          ],
        },
      ],
    },
    {
      id: 'backend',
      name: '后端开发',
      level: 82,
      experience: '2年',
      children: [
        {
          id: 'java',
          name: 'Java',
          level: 80,
          experience: '2年',
        },
        {
          id: 'python',
          name: 'Python',
          level: 85,
          experience: '2年',
          children: [
            {
              id: 'data-processing',
              name: '数据处理',
              level: 85,
              experience: '1.5年',
            },
            {
              id: 'scripting',
              name: '脚本开发',
              level: 82,
              experience: '2年',
            },
          ],
        },
        {
          id: 'api',
          name: 'RESTful API',
          level: 88,
          experience: '2年',
        },
        {
          id: 'database',
          name: '数据库',
          level: 80,
          experience: '2年',
          children: [
            {
              id: 'mysql',
              name: 'MySQL',
              level: 80,
              experience: '2年',
            },
          ],
        },
      ],
    },
    {
      id: 'tools',
      name: '开发工具',
      level: 88,
      experience: '3年',
      children: [
        {
          id: 'git',
          name: 'Git',
          level: 90,
          experience: '3年',
        },
        {
          id: 'figma',
          name: 'Figma',
          level: 82,
          experience: '1.5年',
        },
        {
          id: 'postman',
          name: 'Postman',
          level: 85,
          experience: '2年',
        },
        {
          id: 'vscode',
          name: 'VS Code',
          level: 92,
          experience: '3年',
        },
      ],
    },
    {
      id: 'soft-skills',
      name: '软技能',
      level: 85,
      experience: '3年',
      children: [
        {
          id: 'requirements-analysis',
          name: '需求分析',
          level: 88,
          experience: '2年',
        },
        {
          id: 'industry-research',
          name: '行业研究',
          level: 85,
          experience: '1.5年',
        },
        {
          id: 'data-analysis',
          name: '数据分析',
          level: 82,
          experience: '1.5年',
        },
        {
          id: 'communication',
          name: '沟通协作',
          level: 88,
          experience: '3年',
        },
        {
          id: 'media-operation',
          name: '新媒体运营',
          level: 80,
          experience: '1.5年',
        },
      ],
    },
  ],
}
