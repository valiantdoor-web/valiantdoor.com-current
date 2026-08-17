#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const GUIDES = [
  "garage-door-wont-open",
  "garage-door-wont-close",
  "garage-door-off-track",
  "broken-garage-door-cable",
  "garage-door-sensor-problems",
  "garage-door-making-noise",
  "garage-door-maintenance-checklist",
  "liftmaster-troubleshooting",
  "emergency-garage-door-repair-guide",
  "garage-door-spring-replacement-cost",
];

function wordsFor(slug) {
  const file = path.resolve("public", "blog", slug, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const cleaned = main
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<section\b[^>]*class="[^"]*(?:geo-stats|before-after-proof|service-cross-links|geo-cta-strip)[^"]*"[^>]*>[\s\S]*?<\/section>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|quot|apos|nbsp|ndash|mdash|rarr|ldquo|rdquo);/gi, " ");
  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function shingles(words, size = 6) {
  const result = new Set();
  for (let index = 0; index <= words.length - size; index += 1) {
    result.add(words.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(left, right) {
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

const data = GUIDES.map((slug) => {
  const words = wordsFor(slug);
  return { slug, words, shingles: shingles(words) };
});

const pairs = [];
for (let left = 0; left < data.length; left += 1) {
  for (let right = left + 1; right < data.length; right += 1) {
    pairs.push({
      left: data[left].slug,
      right: data[right].slug,
      similarity: jaccard(data[left].shingles, data[right].shingles),
    });
  }
}

pairs.sort((a, b) => b.similarity - a.similarity);

console.log("Guide word counts");
for (const item of data) console.log(`${item.slug}\t${item.words.length}`);
console.log("\nHighest pairwise 6-word-shingle similarities");
for (const pair of pairs.slice(0, 20)) {
  console.log(`${pair.similarity.toFixed(3)}\t${pair.left}\t${pair.right}`);
}

const max = pairs[0]?.similarity || 0;
const overThreshold = pairs.filter((pair) => pair.similarity >= 0.5);
console.log(
  `\nmax_similarity=${max.toFixed(3)} pairs_at_or_above_0.5=${overThreshold.length}`
);

if (process.argv.includes("--enforce") && overThreshold.length) process.exit(1);
