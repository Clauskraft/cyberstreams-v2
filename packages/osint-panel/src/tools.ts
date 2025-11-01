import type { OsintTool } from "./OsintPanel";

export const DEFAULT_OSINT_TOOLS: OsintTool[] = [
  {
    id: "ahmia",
    name: "Ahmia",
    description: "Privacy-focused Tor search engine indexing verified onion services.",
    url: "https://ahmia.fi/",
    category: "Search"
  },
  {
    id: "darksearch",
    name: "DarkSearch",
    description: "Dark web search with filtering, monitoring and RSS support.",
    url: "https://darksearch.io/",
    category: "Search"
  },
  {
    id: "oniondir",
    name: "Onion Directory",
    description: "Curated catalog of verified onion services with uptime history.",
    url: "https://oniondir.org/",
    category: "Directory"
  },
  {
    id: "dark.fail",
    name: "dark.fail",
    description: "Realtime onion status tracker highlighting phishing clones and uptime.",
    url: "https://dark.fail/",
    category: "Monitoring"
  },
  {
    id: "inteltechniques",
    name: "IntelTechniques",
    description: "Comprehensive OSINT workbook and automation toolkit maintained by Michael Bazzell.",
    url: "https://inteltechniques.com/tools/",
    category: "Workflow"
  },
  {
    id: "exodusintel",
    name: "Exodus Intel",
    description: "Threat intelligence feeds covering zero-days and dark web chatter.",
    url: "https://www.exodusintel.com/",
    category: "Threat Intel"
  },
  {
    id: "maltego",
    name: "Maltego",
    description: "Graph analysis platform integrating OSINT transforms and link exploration.",
    url: "https://www.maltego.com/",
    category: "Analysis"
  },
  {
    id: "spiderfoot",
    name: "SpiderFoot",
    description: "Automated reconnaissance platform with over 200 OSINT data sources.",
    url: "https://www.spiderfoot.net/",
    category: "Automation"
  },
  {
    id: "shodan",
    name: "Shodan",
    description: "Search engine for internet-connected devices, services and vulnerabilities.",
    url: "https://www.shodan.io/",
    category: "Infrastructure"
  },
  {
    id: "virustotal",
    name: "VirusTotal",
    description: "Malware and URL scanner aggregating detections, sandboxing and community intel.",
    url: "https://www.virustotal.com/",
    category: "Malware"
  },
  {
    id: "haveibeenpwned",
    name: "Have I Been Pwned",
    description: "Credential breach repository for validating leaked accounts and passwords.",
    url: "https://haveibeenpwned.com/",
    category: "Leak Monitoring"
  },
  {
    id: "grayhatwarfare",
    name: "GrayHatWarfare",
    description: "Search engine for publicly exposed S3 buckets and object storage leaks.",
    url: "https://buckets.grayhatwarfare.com/",
    category: "Exposure"
  },
  {
    id: "dehashed",
    name: "DeHashed",
    description: "Aggregated credential breach database with API access and alerting.",
    url: "https://www.dehashed.com/",
    category: "Leak Monitoring"
  },
  {
    id: "onionscan",
    name: "OnionScan",
    description: "Fingerprint and vulnerability scanner for onion services.",
    url: "https://github.com/s-rah/onionscan",
    category: "Monitoring"
  },
  {
    id: "photon",
    name: "Photon",
    description: "Fast web crawler tailored for OSINT workflows and asset discovery.",
    url: "https://github.com/s0md3v/Photon",
    category: "Automation"
  },
  {
    id: "mitm",
    name: "MITM Intel",
    description: "Marketplace monitoring service for stolen data and insider access sales.",
    url: "https://mitmintel.com/",
    category: "Threat Intel"
  },
  {
    id: "huntr",
    name: "Huntr Leak Board",
    description: "Realtime leak monitoring board covering ransomware and data extortion groups.",
    url: "https://huntr.dev/explore",
    category: "Monitoring"
  },
  {
    id: "hashdd",
    name: "Hashdd",
    description: "File reputation lookup using multi-AV feeds and crowd-sourced intel.",
    url: "https://hashdd.com/",
    category: "Malware"
  },
  {
    id: "tweetdeck",
    name: "TweetDeck",
    description: "Advanced Twitter monitor supporting keyword filters and lists for SOC teams.",
    url: "https://tweetdeck.twitter.com/",
    category: "Social"
  },
  {
    id: "whatsmyname",
    name: "WhatsMyName",
    description: "Cross-platform username enumeration tool maintained by OSINTCurio.us.",
    url: "https://whatsmyname.app/",
    category: "Identity"
  }
];

export const resolveOsintCategories = (tools: OsintTool[]): string[] => {
  const set = new Set<string>();
  tools.forEach((tool) => {
    if (tool.category) {
      set.add(tool.category);
    }
  });
  return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
};


