const API = (() => {
  let token = localStorage.getItem('tf_token') || '';

  function setToken(t) {
    token = t;
    if (t) localStorage.setItem('tf_token', t);
    else localStorage.removeItem('tf_token');
  }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch('/api' + path, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setToken('');
      window.location.reload();
    }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  return {
    setToken,
    getToken: () => token,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  };
})();
