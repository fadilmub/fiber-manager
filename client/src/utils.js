export function parseCoordinates(coordString) {
  if (!coordString) return null
  const cleaned = coordString.replace(/\s+/g, '')
  const parts = cleaned.split(',')
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function formatCoordinates(lat, lng) {
  return `${lat}, ${lng}`
}
