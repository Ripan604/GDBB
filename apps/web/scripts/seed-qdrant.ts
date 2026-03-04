import { QdrantClient } from '@qdrant/js-client-rest';
import { PAPER_CHUNKS } from '../lib/paper-corpus';

async function main() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) {
    throw new Error('QDRANT_URL is required');
  }

  const client = new QdrantClient({ url, apiKey });
  const collection = 'gdbb-paper-chunks';

  await client.recreateCollection(collection, {
    vectors: {
      size: 8,
      distance: 'Cosine',
    },
  });

  const points = PAPER_CHUNKS.map((chunk, idx) => ({
    id: idx + 1,
    vector: Array.from({ length: 8 }, (_, i) => ((chunk.text.charCodeAt(i) || 0) % 19) / 19),
    payload: {
      section: chunk.section,
      reference: chunk.reference,
      chunk_text: chunk.text,
      source_ref: chunk.id,
    },
  }));

  await client.upsert(collection, { points });
  console.log(`Seeded ${points.length} paper chunks into ${collection}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
