// Added pictures. With server.py running they are shared by every device on the Wi-Fi;
// opened straight from disk they fall back to this browser's IndexedDB.
window.ownPictures = (() => {
  const API = '/api/pictures';
  const STARS_KEY = 'hero-arcade.puzzle-stars';
  let online = null;

  const browser = {
    open() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('hero-arcade', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('pictures', { autoIncrement: true });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    async run(mode, action) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('pictures', mode);
        const request = action(tx.objectStore('pictures'));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
      });
    },
    async list() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const found = [];
        const cursor = db.transaction('pictures').objectStore('pictures').openCursor();
        cursor.onsuccess = () => {
          const at = cursor.result;
          if (!at) { resolve(found); return; }
          found.push({ id: at.key, blob: at.value.blob, title: at.value.title });
          at.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
    },
    add(blob, title) { return this.run('readwrite', store => store.add({ blob, title })); },
    remove(id) { return this.run('readwrite', store => store.delete(id)); },
  };

  async function hasServer() {
    if (online === null) {
      try { online = (await fetch(API)).ok; } catch (e) { online = false; }
    }
    return online;
  }

  async function upload(blob, title) {
    const response = await fetch(`${API}?title=${encodeURIComponent(title)}`, { method: 'POST', body: blob });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    return (await response.json()).id;
  }

  function moveStars(fromId, toId) {
    try {
      const stars = JSON.parse(localStorage.getItem(STARS_KEY)) || {};
      if (!stars[`own-${fromId}`]) return;
      stars[`own-${toId}`] = Math.max(stars[`own-${toId}`] || 0, stars[`own-${fromId}`]);
      delete stars[`own-${fromId}`];
      localStorage.setItem(STARS_KEY, JSON.stringify(stars));
    } catch (e) {}
  }

  // Pictures added before sharing existed: hand them to the server, and only then forget this copy.
  async function shareBrowserPictures() {
    let waiting = [];
    try { waiting = await browser.list(); } catch (e) {}
    for (const picture of waiting) {
      try {
        const id = await upload(picture.blob, picture.title);
        moveStars(picture.id, id);
        await browser.remove(picture.id);
      } catch (e) {}
    }
  }

  return {
    async list() {
      if (await hasServer()) {
        await shareBrowserPictures();
        return (await fetch(API)).json();
      }
      const found = await browser.list();
      return found.map(p => {
        const url = URL.createObjectURL(p.blob);
        return { id: p.id, title: p.title, url, thumb: url };
      });
    },
    // Sends this device's progress and returns the best of all devices, or null without a server.
    async syncProgress(progress) {
      if (!(await hasServer())) return null;
      try {
        const response = await fetch('/api/progress', { method: 'POST', body: JSON.stringify(progress) });
        return response.ok ? response.json() : null;
      } catch (e) {
        return null;
      }
    },
    async add(blob, title) {
      return (await hasServer()) ? upload(blob, title) : browser.add(blob, title);
    },
    async remove(id) {
      if (!(await hasServer())) return browser.remove(id);
      const response = await fetch(`${API}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Remove failed: ${response.status}`);
    },
  };
})();
