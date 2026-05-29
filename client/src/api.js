const API_BASE = window.location.origin + '/fiber-manager/api'

async function fetchWithAuth(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  }

  try {
    const response = await fetch(url, mergedOptions)
    if (response.status === 401) {
      return null
    }
    return response
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

async function readJson(response) {
  if (!response) return null
  try {
    return await response.json()
  } catch (error) {
    return null
  }
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth.php?action=login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  return await readJson(response)
}

export async function checkAuthentication() {
  const response = await fetchWithAuth(`${API_BASE}/auth.php?action=me`, { method: 'GET' })
  if (!response) return null
  const data = await response.json()
  return data.user || null
}

export async function loadUserInfo() {
  const response = await fetchWithAuth(`${API_BASE}/auth.php?action=me`, { method: 'GET' })
  if (!response) return null
  const data = await response.json()
  return data.user || null
}

export async function loadDevices() {
  const [odcRes, odpRes] = await Promise.all([
    fetchWithAuth(`${API_BASE}/odc.php`, { method: 'GET' }),
    fetchWithAuth(`${API_BASE}/odp.php`, { method: 'GET' })
  ])

  if (!odcRes || !odpRes) return { odc: [], odp: [] }

  const odc = await odcRes.json()
  const odp = await odpRes.json()
  return {
    odc: Array.isArray(odc) ? odc : [],
    odp: Array.isArray(odp) ? odp : []
  }
}

export async function loadODCs() {
  const response = await fetchWithAuth(`${API_BASE}/odc.php`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function loadPOPs() {
  const response = await fetchWithAuth(`${API_BASE}/pop.php`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function loadOLTs(popId) {
  const response = await fetchWithAuth(`${API_BASE}/pop.php?id=${popId}&action=olts`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function loadPONs(oltId) {
  const response = await fetchWithAuth(`${API_BASE}/olt.php?id=${oltId}&action=pons`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function loadPONPorts(ponId) {
  const response = await fetchWithAuth(`${API_BASE}/pon.php?id=${ponId}&action=ports`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function createPop(data) {
  const response = await fetchWithAuth(`${API_BASE}/pop.php`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function updatePop(id, data) {
  const response = await fetchWithAuth(`${API_BASE}/pop.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function deletePop(id) {
  const response = await fetchWithAuth(`${API_BASE}/pop.php?id=${id}`, { method: 'DELETE' })
  if (!response) return null
  return await readJson(response)
}

export async function savePop(id, data) {
  return id ? updatePop(id, data) : createPop(data)
}

export async function createOlt(data) {
  const response = await fetchWithAuth(`${API_BASE}/olt.php`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function updateOlt(id, data) {
  const response = await fetchWithAuth(`${API_BASE}/olt.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function deleteOlt(id) {
  const response = await fetchWithAuth(`${API_BASE}/olt.php?id=${id}`, { method: 'DELETE' })
  if (!response) return null
  return await readJson(response)
}

export async function saveOlt(id, data) {
  return id ? updateOlt(id, data) : createOlt(data)
}

export async function createPon(data) {
  const response = await fetchWithAuth(`${API_BASE}/pon.php`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function updatePon(id, data) {
  const response = await fetchWithAuth(`${API_BASE}/pon.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function deletePon(id) {
  const response = await fetchWithAuth(`${API_BASE}/pon.php?id=${id}`, { method: 'DELETE' })
  if (!response) return null
  return await readJson(response)
}

export async function savePon(id, data) {
  return id ? updatePon(id, data) : createPon(data)
}

export async function savePortConfig(data) {
  const response = await fetchWithAuth(`${API_BASE}/pon.php?action=update-port`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function loadAvailableSources() {
  const response = await fetchWithAuth(`${API_BASE}/odc.php?sources=1`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function loadODCPorts(odcId) {
  const response = await fetchWithAuth(`${API_BASE}/odc.php?id=${odcId}&ports=1`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function createOdc(data) {
  const response = await fetchWithAuth(`${API_BASE}/odc.php`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function updateOdc(id, data) {
  const response = await fetchWithAuth(`${API_BASE}/odc.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function saveOdc(id, data) {
  return id ? updateOdc(id, data) : createOdc(data)
}

export async function createOdp(data) {
  const response = await fetchWithAuth(`${API_BASE}/odp.php`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function updateOdp(id, data) {
  const response = await fetchWithAuth(`${API_BASE}/odp.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function saveOdp(id, data) {
  return id ? updateOdp(id, data) : createOdp(data)
}

export async function loadUsers() {
  const response = await fetchWithAuth(`${API_BASE}/users.php`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function loadUserById(id) {
  const response = await fetchWithAuth(`${API_BASE}/users.php?id=${id}`, { method: 'GET' })
  if (!response) return null
  return await readJson(response)
}

export async function createUser(data) {
  const response = await fetchWithAuth(`${API_BASE}/users.php`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function updateUser(id, data) {
  const response = await fetchWithAuth(`${API_BASE}/users.php?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  return await readJson(response)
}

export async function deleteUser(id) {
  const response = await fetchWithAuth(`${API_BASE}/users.php?id=${id}`, { method: 'DELETE' })
  if (!response) return null
  return await readJson(response)
}

export async function saveUser(id, data) {
  return id ? updateUser(id, data) : createUser(data)
}

export async function resetUserPassword(id, password) {
  const response = await fetchWithAuth(`${API_BASE}/users.php?id=${id}&action=reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password: password })
  })
  return await readJson(response)
}

export async function logout() {
  await fetchWithAuth(`${API_BASE}/auth.php?action=logout`, { method: 'POST' })
}
