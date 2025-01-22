const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

async function analyzeSEO() {
    const urlInput = document.getElementById('urlInput').value;
    const competitorUrl = document.getElementById('competitorUrl').value;
    const resultsDiv = document.getElementById('results');
    const competitorResultsDiv = document.getElementById('competitorResults');
    const loadingSpinner = document.getElementById('loadingSpinner');

    if (!urlInput) {
        showError('Please enter a valid URL');
        return;
    }

    try {
        loadingSpinner.classList.remove('hidden');
        resultsDiv.innerHTML = '';
        competitorResultsDiv.innerHTML = '';

        // Analyze main site
        const seoMetrics = await analyzePage(urlInput);
        displaySEOMetrics(seoMetrics, resultsDiv, 'Your Website');

        // Analyze competitor if provided
        if (competitorUrl) {
            const competitorMetrics = await analyzePage(competitorUrl);
            displaySEOMetrics(competitorMetrics, competitorResultsDiv, "Competitor's Website");
        }

    } catch (error) {
        showError('Error analyzing the website: ' + error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

async function analyzePage(url) {
    try {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Use CORS proxy to fetch the page
        const proxyUrl = CORS_PROXY + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Get page title from either title tag or meta title
        const pageTitle = doc.title || getMetaTag(doc, 'title');

        // Get all meta tags for analysis
        const allMetaTags = Array.from(doc.getElementsByTagName('meta'));
        const hasRobots = allMetaTags.some(meta => meta.name === 'robots');
        const robotsContent = getMetaTag(doc, 'robots');
        const hasCanonical = !!doc.querySelector('link[rel="canonical"]');
        const canonicalUrl = doc.querySelector('link[rel="canonical"]')?.href || '';
        
        // Get all headings for content structure analysis
        const h3Count = doc.getElementsByTagName('h3').length;
        const h4Count = doc.getElementsByTagName('h4').length;
        const h5Count = doc.getElementsByTagName('h5').length;
        const h6Count = doc.getElementsByTagName('h6').length;

        // Analyze links
        const links = Array.from(doc.getElementsByTagName('a'));
        const internalLinks = links.filter(link => {
            try {
                const href = link.href;
                return href && new URL(href).hostname === new URL(url).hostname;
            } catch {
                return false;
            }
        });
        const externalLinks = links.filter(link => !internalLinks.includes(link));
        const brokenLinks = links.filter(link => !link.href || link.href === '#' || link.href === '').length;
        const hasNofollow = links.some(link => link.rel?.includes('nofollow'));
        const linksWithTitle = links.filter(link => link.title).length;
        const linksWithAriaLabel = links.filter(link => link.getAttribute('aria-label')).length;
        
        // Image analysis
        const images = Array.from(doc.getElementsByTagName('img'));
        const imagesWithSize = images.filter(img => img.width && img.height).length;
        const imagesWithLazyLoading = images.filter(img => img.loading === 'lazy').length;
        const imagesWithTitle = images.filter(img => img.title).length;
        const imagesWithAria = images.filter(img => img.getAttribute('aria-label')).length;
        const svgImages = doc.getElementsByTagName('svg').length;
        
        // Social media meta tags
        const hasOgTags = allMetaTags.some(meta => meta.getAttribute('property')?.startsWith('og:'));
        const hasTwitterTags = allMetaTags.some(meta => meta.getAttribute('name')?.startsWith('twitter:'));
        const ogImage = getMetaTag(doc, 'og:image');
        const twitterImage = getMetaTag(doc, 'twitter:image');
        const ogTitle = getMetaTag(doc, 'og:title');
        const ogDescription = getMetaTag(doc, 'og:description');
        const twitterTitle = getMetaTag(doc, 'twitter:title');
        const twitterDescription = getMetaTag(doc, 'twitter:description');

        // Performance indicators
        const hasPreload = !!doc.querySelector('link[rel="preload"]');
        const hasPrefetch = !!doc.querySelector('link[rel="prefetch"]');
        const hasPreconnect = !!doc.querySelector('link[rel="preconnect"]');
        const hasDNSPrefetch = !!doc.querySelector('link[rel="dns-prefetch"]');
        const hasModulePreload = !!doc.querySelector('link[rel="modulepreload"]');
        
        // Mobile optimization
        const hasAmpLink = !!doc.querySelector('link[rel="amphtml"]');
        const hasManifest = !!doc.querySelector('link[rel="manifest"]');
        const hasThemeColor = !!getMetaTag(doc, 'theme-color');
        const hasMobileViewport = !!doc.querySelector('meta[name="viewport"][content*="width=device-width"]');
        const hasAppleMobileCapable = !!doc.querySelector('meta[name="apple-mobile-web-app-capable"]');

        // Security
        const hasCSP = !!getMetaTag(doc, 'content-security-policy');
        const hasXSSProtection = !!getMetaTag(doc, 'x-xss-protection');
        const hasFrameOptions = !!getMetaTag(doc, 'x-frame-options');
        const hasReferrerPolicy = !!doc.querySelector('meta[name="referrer"]');
        const hasPermissionsPolicy = !!getMetaTag(doc, 'permissions-policy');

        // Schema.org structured data
        const hasSchemaOrg = html.includes('schema.org');
        const hasJSONLD = !!doc.querySelector('script[type="application/ld+json"]');

        // Additional SEO elements
        const hasSitemap = html.includes('sitemap.xml');
        const hasRSS = !!doc.querySelector('link[type="application/rss+xml"]');
        const hasAtom = !!doc.querySelector('link[type="application/atom+xml"]');

        // Accessibility
        const hasSkipLink = Array.from(links).some(link => 
            link.textContent?.toLowerCase().includes('skip') && 
            link.textContent?.toLowerCase().includes('navigation')
        );
        const hasLangAttribute = !!doc.documentElement.getAttribute('lang');
        const hasAriaLandmarks = Array.from(doc.querySelectorAll('[role]')).length;

        const metrics = {
            title: pageTitle,
            description: getMetaTag(doc, 'description'),
            keywords: getMetaTag(doc, 'keywords'),
            author: getMetaTag(doc, 'author'),
            h1Count: doc.getElementsByTagName('h1').length,
            h2Count: doc.getElementsByTagName('h2').length,
            h3Count,
            h4Count,
            h5Count,
            h6Count,
            imgCount: images.length,
            imgWithoutAlt: images.filter(img => !img.alt).length,
            imagesWithSize,
            imagesWithLazyLoading,
            imagesWithTitle,
            imagesWithAria,
            svgImages,
            linkCount: links.length,
            internalLinksCount: internalLinks.length,
            externalLinksCount: externalLinks.length,
            brokenLinks,
            hasNofollow,
            linksWithTitle,
            linksWithAriaLabel,
            wordCount: countWords(doc.body.textContent || ''),
            hasSSL: url.startsWith('https'),
            hasFavicon: !!doc.querySelector('link[rel*="icon"]'),
            hasAppleIcon: !!doc.querySelector('link[rel="apple-touch-icon"]'),
            hasViewport: !!doc.querySelector('meta[name="viewport"]'),
            hasRobots,
            robotsContent,
            hasCanonical,
            canonicalUrl,
            hasOgTags,
            hasTwitterTags,
            ogImage,
            twitterImage,
            ogTitle,
            ogDescription,
            twitterTitle,
            twitterDescription,
            languageTag: doc.documentElement.lang || 'Not specified',
            charset: doc.characterSet || 'Not specified',
            hasPreload,
            hasPrefetch,
            hasPreconnect,
            hasDNSPrefetch,
            hasModulePreload,
            hasAmpLink,
            hasManifest,
            hasThemeColor,
            hasMobileViewport,
            hasAppleMobileCapable,
            hasCSP,
            hasXSSProtection,
            hasFrameOptions,
            hasReferrerPolicy,
            hasPermissionsPolicy,
            hasSchemaOrg,
            hasJSONLD,
            hasSitemap,
            hasRSS,
            hasAtom,
            hasSkipLink,
            hasLangAttribute,
            hasAriaLandmarks,
            textToHtmlRatio: calculateTextToHtmlRatio(html, doc.body.textContent || '')
        };

        return metrics;
    } catch (error) {
        throw new Error('Could not analyze the page. Make sure the URL is correct and the website is accessible.');
    }
}

function calculateTextToHtmlRatio(html, text) {
    const htmlLength = html.length;
    const textLength = text.trim().length;
    return ((textLength / htmlLength) * 100).toFixed(2);
}

function countWords(str) {
    return str.trim().split(/\s+/).length;
}

function getMetaTag(doc, name) {
    const meta = doc.querySelector(`meta[name="${name}"]`) || doc.querySelector(`meta[property="og:${name}"]`);
    return meta ? meta.getAttribute('content') : '';
}

function displaySEOMetrics(metrics, container, title) {
    container.innerHTML = `
        <h3 class="site-title">${title}</h3>
        <div class="metric-card">
            <h4>Page Title</h4>
            <p>${metrics.title || 'Not found'}</p>
            ${metrics.title ? `<p class="metric-info">Length: ${metrics.title.length} characters</p>` : ''}
        </div>
        <div class="metric-card">
            <h4>Meta Description</h4>
            <p>${metrics.description || 'Not found'}</p>
            ${metrics.description ? `<p class="metric-info">Length: ${metrics.description.length} characters</p>` : ''}
        </div>
        <div class="metric-card">
            <h4>Meta Information</h4>
            <p>Keywords: ${metrics.keywords || 'Not found'}</p>
            <p>Author: ${metrics.author || 'Not found'}</p>
            <p>Language Tag: ${metrics.languageTag}</p>
            <p>Character Encoding: ${metrics.charset}</p>
        </div>
        <div class="metric-card">
            <h4>Content Structure</h4>
            <p>H1 Tags: ${metrics.h1Count}</p>
            <p>H2 Tags: ${metrics.h2Count}</p>
            <p>H3 Tags: ${metrics.h3Count}</p>
            <p>H4 Tags: ${metrics.h4Count}</p>
            <p>H5 Tags: ${metrics.h5Count}</p>
            <p>H6 Tags: ${metrics.h6Count}</p>
            <p>Word Count: ${metrics.wordCount}</p>
            <p>Text to HTML Ratio: ${metrics.textToHtmlRatio}%</p>
        </div>
        <div class="metric-card">
            <h4>Images Analysis</h4>
            <p>Total Images: ${metrics.imgCount}</p>
            <p>SVG Images: ${metrics.svgImages}</p>
            <p>Images without Alt Text: ${metrics.imgWithoutAlt}</p>
            <p>Images with Dimensions: ${metrics.imagesWithSize}</p>
            <p>Images with Lazy Loading: ${metrics.imagesWithLazyLoading}</p>
            <p>Images with Title: ${metrics.imagesWithTitle}</p>
            <p>Images with ARIA Labels: ${metrics.imagesWithAria}</p>
        </div>
        <div class="metric-card">
            <h4>Links Analysis</h4>
            <p>Total Links: ${metrics.linkCount}</p>
            <p>Internal Links: ${metrics.internalLinksCount}</p>
            <p>External Links: ${metrics.externalLinksCount}</p>
            <p>Broken Links: ${metrics.brokenLinks}</p>
            <p>Links with Title: ${metrics.linksWithTitle}</p>
            <p>Links with ARIA Label: ${metrics.linksWithAriaLabel}</p>
            <p>Has Nofollow Links: ${metrics.hasNofollow ? '✅' : '❌'}</p>
        </div>
        <div class="metric-card">
            <h4>Technical SEO</h4>
            <p>SSL (HTTPS): ${metrics.hasSSL ? '✅' : '❌'}</p>
            <p>Favicon: ${metrics.hasFavicon ? '✅' : '❌'}</p>
            <p>Apple Touch Icon: ${metrics.hasAppleIcon ? '✅' : '❌'}</p>
            <p>Viewport Meta Tag: ${metrics.hasViewport ? '✅' : '❌'}</p>
            <p>Robots Meta Tag: ${metrics.hasRobots ? '✅' : '❌'}</p>
            ${metrics.robotsContent ? `<p>Robots Content: ${metrics.robotsContent}</p>` : ''}
            <p>Canonical Link: ${metrics.hasCanonical ? '✅' : '❌'}</p>
            ${metrics.canonicalUrl ? `<p>Canonical URL: ${metrics.canonicalUrl}</p>` : ''}
            <p>Sitemap XML: ${metrics.hasSitemap ? '✅' : '❌'}</p>
            <p>RSS Feed: ${metrics.hasRSS ? '✅' : '❌'}</p>
            <p>Atom Feed: ${metrics.hasAtom ? '✅' : '❌'}</p>
        </div>
        <div class="metric-card">
            <h4>Social Media</h4>
            <p>Open Graph Tags: ${metrics.hasOgTags ? '✅' : '❌'}</p>
            <p>Twitter Cards: ${metrics.hasTwitterTags ? '✅' : '❌'}</p>
            ${metrics.ogTitle ? `<p>OG Title: ${metrics.ogTitle}</p>` : ''}
            ${metrics.ogDescription ? `<p>OG Description: ${metrics.ogDescription}</p>` : ''}
            ${metrics.ogImage ? `<p>OG Image: ${metrics.ogImage}</p>` : ''}
            ${metrics.twitterTitle ? `<p>Twitter Title: ${metrics.twitterTitle}</p>` : ''}
            ${metrics.twitterDescription ? `<p>Twitter Description: ${metrics.twitterDescription}</p>` : ''}
            ${metrics.twitterImage ? `<p>Twitter Image: ${metrics.twitterImage}</p>` : ''}
        </div>
        <div class="metric-card">
            <h4>Performance Optimization</h4>
            <p>Preload: ${metrics.hasPreload ? '✅' : '❌'}</p>
            <p>Prefetch: ${metrics.hasPrefetch ? '✅' : '❌'}</p>
            <p>Preconnect: ${metrics.hasPreconnect ? '✅' : '❌'}</p>
            <p>DNS Prefetch: ${metrics.hasDNSPrefetch ? '✅' : '❌'}</p>
            <p>Module Preload: ${metrics.hasModulePreload ? '✅' : '❌'}</p>
        </div>
        <div class="metric-card">
            <h4>Mobile Optimization</h4>
            <p>AMP Link: ${metrics.hasAmpLink ? '✅' : '❌'}</p>
            <p>Web Manifest: ${metrics.hasManifest ? '✅' : '❌'}</p>
            <p>Theme Color: ${metrics.hasThemeColor ? '✅' : '❌'}</p>
            <p>Mobile Viewport: ${metrics.hasMobileViewport ? '✅' : '❌'}</p>
            <p>Apple Mobile Web App Capable: ${metrics.hasAppleMobileCapable ? '✅' : '❌'}</p>
        </div>
        <div class="metric-card">
            <h4>Security Headers</h4>
            <p>Content Security Policy: ${metrics.hasCSP ? '✅' : '❌'}</p>
            <p>XSS Protection: ${metrics.hasXSSProtection ? '✅' : '❌'}</p>
            <p>Frame Options: ${metrics.hasFrameOptions ? '✅' : '❌'}</p>
            <p>Referrer Policy: ${metrics.hasReferrerPolicy ? '✅' : '❌'}</p>
            <p>Permissions Policy: ${metrics.hasPermissionsPolicy ? '✅' : '❌'}</p>
        </div>
        <div class="metric-card">
            <h4>Structured Data</h4>
            <p>Schema.org: ${metrics.hasSchemaOrg ? '✅' : '❌'}</p>
            <p>JSON-LD: ${metrics.hasJSONLD ? '✅' : '❌'}</p>
        </div>
        <div class="metric-card">
            <h4>Accessibility</h4>
            <p>Skip Navigation Link: ${metrics.hasSkipLink ? '✅' : '❌'}</p>
            <p>Language Attribute: ${metrics.hasLangAttribute ? '✅' : '❌'}</p>
            <p>ARIA Landmarks: ${metrics.hasAriaLandmarks}</p>
        </div>
    `;
}

function showError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">${message}</div>`;
}