import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { BOOKS } from './data.js'; // Paths are relative to this file

/**
 * Helper to find a property in an object regardless of case
 */
const getProp = (obj, ...keys) => {
  if (!obj) return null;
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    const found = objKeys.find(key => key.toLowerCase() === k.toLowerCase());
    if (found) return obj[found];
  }
  return null;
};

// Mapping from data.js translation key to XML filename
// Adjust these filenames if they differ in your src/Bible-xml/ folder
const XML_FILE_MAP = {
  kjv: "King James Version (1769).xml",
  niv: "New International Version (1984) (US).xml",
  esv: "English Standard Version (2001).xml",
  nkjv: "New King James Version (1982).xml",
  nlt: "New Living Translation (1996).xml",
  nasb: "New American Standard Bible (1995).xml",
  nrsv: "New Revised Standard Version (1989).xml",
  net: "New English Translation (2005).xml",
  amp: "Amplified Bible (1965).xml",
  msg: "The Message Bible (2002).xml",
  web: "World English Bible.xml",
  asv: "American Standard Version (1901).xml",
  ylt: "Young's Literal Translation (1898).xml",
  bbe: "Bible in Basic English (1964).xml",
};

const XML_DIR = path.resolve(process.cwd(), 'src/Bible-xml');
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/bibles');

async function convertBibleXMLtoJSON() {
  console.log('Starting Bible XML to JSON conversion...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all files in directory to handle fuzzy matching for spaces/encoding
  const filesInDir = fs.readdirSync(XML_DIR);

  for (const translationKey in XML_FILE_MAP) {
    const targetName = XML_FILE_MAP[translationKey];
    // Find the actual file in the directory that matches (ignoring subtle encoding diffs)
    const actualFileName = filesInDir.find(f => f.trim() === targetName.trim() || f.toLowerCase() === targetName.toLowerCase());
    
    if (!actualFileName) {
      console.warn(`Skipping ${translationKey}: File "${targetName}" not found in ${XML_DIR}`);
      continue;
    }

    const xmlFilePath = path.join(XML_DIR, actualFileName);
    console.log(`Processing ${actualFileName} (${translationKey})...`);

    try {
      const xml = fs.readFileSync(xmlFilePath, 'utf8');
      const result = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

      // Find the Bible root (BIBLE, bible, XMLBIBLE, etc.)
      const bible = getProp(result, 'BIBLE', 'xmlbible', 'bible') || result;
      // Find the Book list (BIBLEBOOK, BOOK, book, etc.)
      const rawBooks = getProp(bible, 'BIBLEBOOK', 'BOOK', 'book');

      if (!rawBooks) {
        console.error(`  Error: Could not find book tags in ${actualFileName}. Check XML structure.`);
        continue;
      }

      const xmlBooks = Array.isArray(rawBooks) ? rawBooks : [rawBooks];

      const translationOutputDir = path.join(OUTPUT_DIR, translationKey);
      if (!fs.existsSync(translationOutputDir)) {
        fs.mkdirSync(translationOutputDir, { recursive: true });
      }

      for (const xmlBook of xmlBooks) {
        const bookName = xmlBook.name || xmlBook.n || xmlBook.bname;
        const bookData = BOOKS.find(b => b.n.toLowerCase() === bookName.toLowerCase());

        if (!bookData) {
          console.warn(`  Warning: Book "${bookName}" from XML not found in your BOOKS data. Skipping.`);
          continue;
        }

        const bookAb3 = bookData.ab3.toLowerCase(); // Use lowercase ab3 for folder names
        const bookOutputDir = path.join(translationOutputDir, bookAb3);
        if (!fs.existsSync(bookOutputDir)) {
          fs.mkdirSync(bookOutputDir, { recursive: true });
        }

        const rawChapters = getProp(xmlBook, 'CHAPTER', 'chapter', 'c');
        const xmlChapters = Array.isArray(rawChapters) ? rawChapters : [rawChapters];

        for (const xmlChapter of xmlChapters) {
          const chapterNum = xmlChapter.num || xmlChapter.n;
          const verses = [];

          const rawVerses = getProp(xmlChapter, 'VERS', 'VERSE', 'v', 'verse');
          if (rawVerses) {
            const xmlVerses = Array.isArray(rawVerses) ? rawVerses : [rawVerses];
            for (const xmlVerse of xmlVerses) {
              // Handle different ways XML stores text (inner content vs attribute)
              const verseText = typeof xmlVerse === 'string' ? xmlVerse : (xmlVerse._ || xmlProp(xmlVerse, 'text', 't') || '');
              
              const cleanText = verseText
                .replace(/<[^>]*>?/gm, '') // Remove any tags
                .replace(/\d{3,5}/g, '') // Remove Strong's numbers (3-5 digits), even when attached to words
                .replace(/\s*[a-z]+: (or|Heb|Gk|Gr|Lat|Lit|meaning).+$/gi, '') // Remove Margin Notes
                .trim();
              
              verses.push({
                verse: parseInt(xmlVerse.num || xmlVerse.n || xmlVerse.v, 10),
                text: cleanText
              });
            }
          }

          const chapterFileName = `${chapterNum}.json`;
          const chapterFilePath = path.join(bookOutputDir, chapterFileName);
          fs.writeFileSync(chapterFilePath, JSON.stringify(verses, null, 2), 'utf8');
        }
      }
      console.log(`  Successfully processed ${actualFileName}`);
    } catch (error) {
      console.error(`  Error processing ${actualFileName}:`, error);
    }
  }
  console.log('Bible XML to JSON conversion complete!');
}

/** Helper for finding XML attributes case-insensitively */
function xmlProp(obj, ...keys) {
  if (typeof obj !== 'object') return null;
  for (const k of keys) {
    if (obj[k]) return obj[k];
    const found = Object.keys(obj).find(key => key.toLowerCase() === k.toLowerCase());
    if (found) return obj[found];
  }
  return null;
}

convertBibleXMLtoJSON();