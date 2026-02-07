/**
 * Web Search Integration
 * Provides web search capability using various search APIs
 */
class WebSearch {
  constructor(options = {}) {
    this.provider = options.provider || 'duckduckgo';
    this.maxResults = options.maxResults || 5;
  }

  /**
   * Perform a web search
   */
  async search(query, options = {}) {
    const provider = options.provider || this.provider;
    const maxResults = options.maxResults || this.maxResults;

    try {
      switch (provider) {
        case 'duckduckgo':
          return await this.searchDuckDuckGo(query, maxResults);
        case 'bing':
          return await this.searchBing(query, maxResults);
        default:
          throw new Error(`Unsupported search provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Web search error (${provider}):`, error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Search using DuckDuckGo Instant Answer API
   * Note: This is a free API but has limitations
   */
  async searchDuckDuckGo(query, maxResults) {
    try {
      // DuckDuckGo Instant Answer API
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      
      const response = await fetch(url);
      const data = await response.json();

      const results = [];

      // Add abstract if available
      if (data.Abstract) {
        results.push({
          title: data.Heading || 'Summary',
          snippet: data.Abstract,
          url: data.AbstractURL,
          source: data.AbstractSource || 'DuckDuckGo'
        });
      }

      // Add related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Related',
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo'
            });
          }
        }
      }

      return {
        success: true,
        query,
        provider: 'duckduckgo',
        results: results.slice(0, maxResults),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`DuckDuckGo search failed: ${error.message}`);
    }
  }

  /**
   * Search using Bing Search API
   * Requires BING_SEARCH_API_KEY environment variable
   */
  async searchBing(query, maxResults) {
    const apiKey = process.env.BING_SEARCH_API_KEY;
    
    if (!apiKey) {
      throw new Error('BING_SEARCH_API_KEY environment variable required for Bing search');
    }

    try {
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
      
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const results = (data.webPages?.value || []).map(item => ({
        title: item.name,
        snippet: item.snippet,
        url: item.url,
        source: 'Bing'
      }));

      return {
        success: true,
        query,
        provider: 'bing',
        results: results.slice(0, maxResults),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Bing search failed: ${error.message}`);
    }
  }

  /**
   * Format search results as text
   */
  formatResults(searchResponse) {
    if (!searchResponse.success || !searchResponse.results || searchResponse.results.length === 0) {
      return `No results found for: ${searchResponse.query}`;
    }

    let text = `Search results for "${searchResponse.query}":\n\n`;
    
    searchResponse.results.forEach((result, index) => {
      text += `${index + 1}. ${result.title}\n`;
      if (result.snippet) {
        text += `   ${result.snippet}\n`;
      }
      text += `   ${result.url}\n\n`;
    });

    return text.trim();
  }

  /**
   * Get available search providers
   */
  getAvailableProviders() {
    const providers = ['duckduckgo'];
    
    // Check if Bing API key is available
    if (process.env.BING_SEARCH_API_KEY) {
      providers.push('bing');
    }

    return providers;
  }
}

export default WebSearch;
