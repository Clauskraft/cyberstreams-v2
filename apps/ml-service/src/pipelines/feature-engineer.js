import natural from 'natural';
import { removeStopwords } from 'stopword';
import compromise from 'compromise';

/**
 * Feature Engineering Pipeline
 *
 * Extracts and transforms raw document data into ML-ready features:
 * - Text embeddings (TF-IDF, word vectors)
 * - Entity extraction (IOCs, CVEs, emails, IPs)
 * - Temporal features
 * - Statistical features
 * - Sentiment analysis
 */
export class FeatureEngineer {
  constructor({ logger }) {
    this.logger = logger;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();

    // Security-related keywords for feature extraction
    this.securityKeywords = [
      'vulnerability', 'exploit', 'malware', 'ransomware', 'breach',
      'attack', 'threat', 'phishing', 'zero-day', 'backdoor',
      'trojan', 'worm', 'virus', 'botnet', 'ddos',
      'injection', 'xss', 'csrf', 'rce', 'lfi'
    ];

    // Regular expressions for entity extraction
    this.patterns = {
      ipv4: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      ipv6: /\b([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
      cve: /CVE-\d{4}-\d{4,7}/gi,
      hash_md5: /\b[a-f0-9]{32}\b/gi,
      hash_sha256: /\b[a-f0-9]{64}\b/gi
    };
  }

  /**
   * Extract all features from a document
   * @param {Object} document - Raw document with title, content, metadata
   * @returns {Object} Extracted features
   */
  async extract(document) {
    const startTime = Date.now();

    try {
      const text = `${document.title || ''} ${document.content || ''}`.toLowerCase();
      const tokens = this.tokenize(text);

      const features = {
        // Text-based features
        textEmbedding: await this.createTextEmbedding(text, tokens),
        keywords: this.extractKeywords(tokens),

        // Entity features
        ...this.extractEntities(document.content || ''),

        // Source features
        sourceReputation: this.calculateSourceReputation(document.source_name),
        sourceAge: this.calculateSourceAge(document.source_id),
        sourceReliability: 0.7, // Default - can be enhanced with historical data

        // Temporal features
        temporal: this.extractTemporalFeatures(document.published_at),

        // Statistical features
        wordCount: tokens.length,
        uniqueWords: new Set(tokens).size,
        averageWordLength: tokens.reduce((sum, word) => sum + word.length, 0) / tokens.length,
        sentenceCount: text.split(/[.!?]+/).length,

        // Sentiment and tone
        sentiment: this.analyzeSentiment(text),
        urgency: this.analyzeUrgency(text, tokens),
        technicalComplexity: this.analyzeTechnicalComplexity(tokens),

        // Metadata
        extractionTime: Date.now() - startTime
      };

      return features;

    } catch (error) {
      this.logger.error({ error, document }, 'Feature extraction failed');
      throw error;
    }
  }

  /**
   * Tokenize and clean text
   */
  tokenize(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());

    // Remove stopwords and short tokens
    const cleaned = removeStopwords(tokens).filter(token =>
      token.length > 2 && /^[a-z]+$/.test(token)
    );

    return cleaned;
  }

  /**
   * Create text embedding (simplified TF-IDF)
   * In production, use BERT or sentence transformers
   */
  async createTextEmbedding(text, tokens) {
    // Simple TF-IDF based embedding (50 dimensions)
    const embedding = new Array(50).fill(0);

    // Calculate term frequencies
    const termFreq = {};
    tokens.forEach(token => {
      termFreq[token] = (termFreq[token] || 0) + 1;
    });

    // Get top 50 terms by frequency
    const topTerms = Object.entries(termFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    topTerms.forEach(([term, freq], idx) => {
      embedding[idx] = Math.min(freq / tokens.length, 1);
    });

    return embedding;
  }

  /**
   * Extract security-related keywords
   */
  extractKeywords(tokens) {
    return this.securityKeywords.filter(keyword =>
      tokens.includes(keyword)
    );
  }

  /**
   * Extract entities (IOCs, CVEs, etc.)
   */
  extractEntities(content) {
    const entities = {
      ips: [],
      emails: [],
      urls: [],
      cves: [],
      hashes: [],
      iocCount: 0,
      cveCount: 0,
      urlCount: 0,
      emailCount: 0,
      ipCount: 0
    };

    if (!content) return entities;

    // Extract IPv4 addresses
    const ipv4Matches = content.match(this.patterns.ipv4) || [];
    entities.ips = [...new Set(ipv4Matches)];
    entities.ipCount = entities.ips.length;

    // Extract emails
    const emailMatches = content.match(this.patterns.email) || [];
    entities.emails = [...new Set(emailMatches)];
    entities.emailCount = entities.emails.length;

    // Extract URLs
    const urlMatches = content.match(this.patterns.url) || [];
    entities.urls = [...new Set(urlMatches)];
    entities.urlCount = entities.urls.length;

    // Extract CVEs
    const cveMatches = content.match(this.patterns.cve) || [];
    entities.cves = [...new Set(cveMatches.map(cve => cve.toUpperCase()))];
    entities.cveCount = entities.cves.length;

    // Extract hashes
    const md5Matches = content.match(this.patterns.hash_md5) || [];
    const sha256Matches = content.match(this.patterns.hash_sha256) || [];
    entities.hashes = [...new Set([...md5Matches, ...sha256Matches])];

    // Total IOC count (excluding URLs which may be benign)
    entities.iocCount = entities.ipCount + entities.emailCount + entities.hashes.length;

    return entities;
  }

  /**
   * Calculate source reputation (simplified)
   */
  calculateSourceReputation(sourceName) {
    if (!sourceName) return 0.5;

    // Known reliable sources get higher scores
    const reliableSources = [
      'cisa', 'mitre', 'cve', 'nvd', 'cert', 'us-cert',
      'sans', 'bleeping computer', 'krebs on security'
    ];

    const normalized = sourceName.toLowerCase();
    const isReliable = reliableSources.some(source => normalized.includes(source));

    return isReliable ? 0.9 : 0.5;
  }

  /**
   * Calculate source age (how long source has been tracked)
   */
  calculateSourceAge(sourceId) {
    // Placeholder - would query database in production
    return 0.5; // Neutral age
  }

  /**
   * Extract temporal features
   */
  extractTemporalFeatures(publishedAt) {
    if (!publishedAt) {
      return {
        hourOfDay: 12,
        dayOfWeek: 3,
        isWeekend: false,
        isBusinessHours: true
      };
    }

    const date = new Date(publishedAt);
    const hourOfDay = date.getHours();
    const dayOfWeek = date.getDay();

    return {
      hourOfDay,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isBusinessHours: hourOfDay >= 9 && hourOfDay <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5
    };
  }

  /**
   * Analyze sentiment (simplified)
   */
  analyzeSentiment(text) {
    const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    const tokens = this.tokenizer.tokenize(text);
    const sentiment = analyzer.getSentiment(tokens);

    // Normalize to 0-1 range (AFINN returns -5 to 5)
    return (sentiment + 5) / 10;
  }

  /**
   * Analyze urgency level
   */
  analyzeUrgency(text, tokens) {
    const urgencyKeywords = [
      'critical', 'urgent', 'immediate', 'emergency', 'alert',
      'breaking', 'zero-day', 'actively exploited', 'in the wild'
    ];

    const urgencyCount = urgencyKeywords.reduce((count, keyword) => {
      return count + (text.includes(keyword) ? 1 : 0);
    }, 0);

    // Normalize to 0-1
    return Math.min(urgencyCount / 3, 1);
  }

  /**
   * Analyze technical complexity
   */
  analyzeTechnicalComplexity(tokens) {
    const technicalTerms = [
      'buffer', 'overflow', 'injection', 'deserialization',
      'authentication', 'authorization', 'encryption', 'protocol',
      'payload', 'shellcode', 'arbitrary', 'execute'
    ];

    const technicalCount = technicalTerms.reduce((count, term) => {
      return count + (tokens.includes(term) ? 1 : 0);
    }, 0);

    // Normalize to 0-1
    return Math.min(technicalCount / 5, 1);
  }

  /**
   * Extract named entities using compromise
   */
  extractNamedEntities(text) {
    const doc = compromise(text);

    return {
      organizations: doc.organizations().out('array'),
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      technologies: doc.match('#Technology').out('array')
    };
  }
}
