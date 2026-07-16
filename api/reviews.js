// Live review stats for Valiant Garage Door.
//
// Google numbers auto-update from the Google Places API (New) when
// GOOGLE_PLACES_API_KEY is set. Until then, the endpoint returns the
// STATIC_FALLBACK values so the site never shows a blank or broken number.
//
// Nextdoor has no public API for "faves", so that count is an
// easy-to-edit value: change NEXTDOOR_FAVES below (or set the
// NEXTDOOR_FAVES env var) and it updates everywhere on the site.

const GOOGLE_PLACE_ID = 'ChIJreu0MBcWcgMRQnyWHvhS94w'

// Edit these if the live source is ever unavailable / not yet wired.
const STATIC_FALLBACK = {
  googleRating: 5.0,
  googleReviewCount: 70,
  nextdoorFaves: 40,
}

// Single place to keep the Nextdoor number accurate.
const NEXTDOOR_FAVES = Number(process.env.NEXTDOOR_FAVES) || STATIC_FALLBACK.nextdoorFaves

// Cache the Google response in memory so we don't hit the API on every request.
let cache = { at: 0, data: null }
const CACHE_MS = 6 * 60 * 60 * 1000 // 6 hours

async function fetchGoogle() {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return null

  const url = `https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}`
  const resp = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'rating,userRatingCount',
    },
  })
  if (!resp.ok) return null

  const json = await resp.json()
  if (typeof json.rating !== 'number') return null

  return {
    googleRating: Math.round(json.rating * 10) / 10,
    googleReviewCount: typeof json.userRatingCount === 'number' ? json.userRatingCount : STATIC_FALLBACK.googleReviewCount,
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  let google = null
  try {
    if (cache.data && Date.now() - cache.at < CACHE_MS) {
      google = cache.data
    } else {
      google = await fetchGoogle()
      if (google) cache = { at: Date.now(), data: google }
    }
  } catch (err) {
    console.log('[v0] reviews api google fetch failed:', err && err.message)
    google = null
  }

  const payload = {
    googleRating: google ? google.googleRating : STATIC_FALLBACK.googleRating,
    googleReviewCount: google ? google.googleReviewCount : STATIC_FALLBACK.googleReviewCount,
    nextdoorFaves: NEXTDOOR_FAVES,
    source: google ? 'google-places' : 'fallback',
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // Let the CDN cache the response for an hour, revalidate in background.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.statusCode = 200
  res.end(JSON.stringify(payload))
}
