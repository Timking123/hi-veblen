import { watch } from 'vue'
import { useRoute } from 'vue-router'

export interface SEOMetaData {
  title: string
  description: string
  keywords?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  twitterCard?: string
  canonicalUrl?: string
}

export function useSEO(metaData: SEOMetaData) {
  const route = useRoute()

  const updateMetaTags = () => {
    // Update title
    document.title = metaData.title

    // Update or create meta tags
    const metaTags = [
      { name: 'description', content: metaData.description },
      { name: 'keywords', content: metaData.keywords || '' },
      
      // Open Graph tags
      { property: 'og:title', content: metaData.ogTitle || metaData.title },
      { property: 'og:description', content: metaData.ogDescription || metaData.description },
      { property: 'og:type', content: metaData.ogType || 'website' },
      { property: 'og:url', content: metaData.canonicalUrl || window.location.href },
      { property: 'og:image', content: metaData.ogImage || '/og-image.jpg' },
      
      // Twitter Card tags
      { name: 'twitter:card', content: metaData.twitterCard || 'summary_large_image' },
      { name: 'twitter:title', content: metaData.ogTitle || metaData.title },
      { name: 'twitter:description', content: metaData.ogDescription || metaData.description },
      { name: 'twitter:image', content: metaData.ogImage || '/og-image.jpg' },
    ]

    metaTags.forEach(({ name, property, content }) => {
      if (!content) return

      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`
      let element = document.querySelector(selector)

      if (!element) {
        element = document.createElement('meta')
        if (name) element.setAttribute('name', name)
        if (property) element.setAttribute('property', property)
        document.head.appendChild(element)
      }

      element.setAttribute('content', content)
    })

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', metaData.canonicalUrl || window.location.href)
  }

  // Update meta tags immediately
  updateMetaTags()

  // Watch for route changes and update meta tags
  watch(() => route.path, updateMetaTags)

  return {
    updateMetaTags,
  }
}
