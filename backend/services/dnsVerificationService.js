'use strict';

const dns = require('dns').promises;

/**
 * Clean domain for DNS lookup
 */
const cleanDomainForDns = (domain) => {
  let cleaned = domain.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split(':')[0];
  return cleaned;
};

/**
 * Perform DNS TXT record lookup to verify ownership token
 */
const verifyDnsTxtRecord = async (domain, token) => {
  const host = cleanDomainForDns(domain);
  
  try {
    const records = await dns.resolveTxt(host);
    const flattenedRecords = records.map(chunks => chunks.join(''));
    
    // Check if any TXT record matches token or formatted string
    const verified = flattenedRecords.some(txt => {
      const trimmed = txt.trim();
      return (
        trimmed === token ||
        trimmed === `sitemind-verification=${token}` ||
        trimmed.includes(`sitemind-verification=${token}`) ||
        trimmed.includes(token)
      );
    });

    return {
      verified,
      recordsFound: flattenedRecords
    };
  } catch (err) {
    return {
      verified: false,
      error: err.message || 'DNS resolution failed',
      recordsFound: []
    };
  }
};

module.exports = {
  verifyDnsTxtRecord,
  cleanDomainForDns
};
