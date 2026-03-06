import type { Profile } from '@/types'

export interface PersonSchema {
  '@context': string
  '@type': string
  name: string
  jobTitle: string
  email: string
  telephone: string
  url?: string
  image?: string
  alumniOf?: Array<{
    '@type': string
    name: string
  }>
  knowsAbout?: string[]
  sameAs?: string[]
}

export function generatePersonSchema(profile: Profile): PersonSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.jobIntentions.join(' / '),
    email: profile.email,
    telephone: profile.phone,
    url: window.location.origin,
    image: profile.avatar ? `${window.location.origin}${profile.avatar}` : undefined,
    alumniOf: profile.education.map(edu => ({
      '@type': 'EducationalOrganization',
      name: edu.school,
    })),
    knowsAbout: profile.skills.map(skill => skill.name),
  }
}

export function injectStructuredData(data: PersonSchema) {
  // Remove existing structured data script if present
  const existingScript = document.querySelector('script[type="application/ld+json"]')
  if (existingScript) {
    existingScript.remove()
  }

  // Create and inject new structured data
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data, null, 2)
  document.head.appendChild(script)
}
