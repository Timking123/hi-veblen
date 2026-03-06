/**
 * 敌人内容提供器
 * 从 profile 数据中提取技能、课程和项目名称作为敌人显示文本
 */

import { profileData } from '@/data/profile'

export class EnemyContentProvider {
  private skillNames: string[] = []
  private courseNames: string[] = []
  private projectNames: string[] = []
  private allContent: string[] = []

  constructor() {
    this.loadFromProfile()
  }

  /**
   * 从 profile 数据加载内容
   */
  private loadFromProfile(): void {
    // 提取技能名称
    if (profileData.skills) {
      this.skillNames = profileData.skills.map((skill) => skill.name)
    }

    // 提取课程名称
    if (profileData.education) {
      profileData.education.forEach((edu) => {
        if (edu.courses) {
          // courses 是对象数组，需要提取 name 属性
          const courseNames = edu.courses.map((course) => 
            typeof course === 'string' ? course : course.name
          )
          this.courseNames.push(...courseNames)
        }
      })
    }

    // 提取工作经历中的公司名称作为"项目"
    if (profileData.experience) {
      this.projectNames = profileData.experience.map((exp) => exp.company)
    }

    // 合并所有内容，并确保文字不换行（移除换行符）
    const cleanContent = (text: string): string => {
      return text.replace(/[\r\n]+/g, ' ').trim()
    }

    this.allContent = [
      ...this.skillNames.map(cleanContent),
      ...this.courseNames.map(cleanContent),
      ...this.projectNames.map(cleanContent)
    ]

    console.log('[敌人内容] 加载完成:', {
      技能数: this.skillNames.length,
      课程数: this.courseNames.length,
      项目数: this.projectNames.length,
      总数: this.allContent.length
    })
  }

  /**
   * 获取随机内容
   */
  getRandomContent(): string {
    if (this.allContent.length === 0) {
      return '敌人'
    }
    const index = Math.floor(Math.random() * this.allContent.length)
    return this.allContent[index]
  }

  /**
   * 获取随机技能名称
   */
  getRandomSkill(): string {
    if (this.skillNames.length === 0) {
      return '技能'
    }
    const index = Math.floor(Math.random() * this.skillNames.length)
    return this.skillNames[index]
  }

  /**
   * 获取随机课程名称
   */
  getRandomCourse(): string {
    if (this.courseNames.length === 0) {
      return '课程'
    }
    const index = Math.floor(Math.random() * this.courseNames.length)
    return this.courseNames[index]
  }

  /**
   * 获取随机项目名称
   */
  getRandomProject(): string {
    if (this.projectNames.length === 0) {
      return '项目'
    }
    const index = Math.floor(Math.random() * this.projectNames.length)
    return this.projectNames[index]
  }

  /**
   * 获取所有内容
   */
  getAllContent(): string[] {
    return [...this.allContent]
  }
}

// 创建单例
export const enemyContentProvider = new EnemyContentProvider()
