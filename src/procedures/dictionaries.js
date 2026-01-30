import { startGame } from "../main.js";

function loadAllDictionaries() {
  return JSON.parse(localStorage.getItem("foxappDictionaries")) || {};
}

function saveDictionary(name, words) {
  const all = loadAllDictionaries();

  all[name] = { name, words };

  localStorage.setItem("foxappDictionaries", JSON.stringify(all));
}

export async function fetchDictionaries(username) {
  const cached = JSON.parse(localStorage.getItem("foxappDictionaries")) || {};

  if (!navigator.onLine) {
    return Object.keys(cached).map((name) => ({
      name,
      url: null // no URL needed offline
    }));
  }

  try {
    const apiUrl = `https://api.github.com/repos/${username}/foxapp-data/contents`;
    const response = await fetch(apiUrl);
    if (!response.ok) return Object.keys(cached).map((name) => ({ name, url: null }));

    const files = await response.json();
    return files
      .filter((f) => f.name.endsWith(".txt"))
      .map((f) => ({
        name: f.name.replace(".txt", ""),
        url: f.download_url,
      }));
  } catch {
    return Object.keys(cached).map((name) => ({ name, url: null }));
  }
}

export async function fetchDictionary(name, url) {
  const cache = JSON.parse(localStorage.getItem("foxappDictionaries")) || {};

  // OFFLINE → return cached version
  if (!navigator.onLine) {
    return cache[name]?.words || [];
  }

  // ONLINE → fetch from network
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // fallback to cache if fetch fails
      return cache[name]?.words || [];
    }

    const text = await response.text();

    const words = text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(":").map((s) => s.trim());
        if (parts.length < 2) return null;
        return { word: parts[0], translation: parts[1] };
      })
      .filter(Boolean);

    // save to cache
    saveDictionary(name, words);

    return words;
  } catch {
    // network error → fallback to cache
    return cache[name]?.words || [];
  }
}


export async function renderDictionaries(
  username,
  dictList
) {
  dictList.innerHTML = "<p>Loading...</p>";
  const dictionaries = await fetchDictionaries(username);

  if (!dictionaries.length) {
    dictList.innerHTML = "<p>No dictionaries found</p>";
    return;
  }

  dictList.innerHTML = "";
  dictionaries.forEach((dict) => {
    const button = document.createElement("button");
    button.textContent = dict.name;

    button.addEventListener("click", async () => {
      const words = await fetchDictionary(dict.name, dict.url);
      startGame(words);
    });

    dictList.appendChild(button);
  });
}
