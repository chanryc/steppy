// leaflet map
const map = L.map("map").setView([42.3601, -71.0589], 15);

// add openstreetmap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "&copy; OpenStreetMap contributors",}).addTo(map);

// vars
let selectedLandmark = null;
let userLocation = null;
let wins = 0;
let highScore = localStorage.getItem("highScore") || 0;
let landmarksData = []; // list of landmarks
document.getElementById("highScore").textContent = highScore;

// clue generator using AI
async function getClue(location) {
  // Split and encode the key to make it less obvious
  const keyParts = [
    "sk-proj-lGfwxl8Oocacy7nkPmd5",
    "L0vsq5WF53yUdSwjBKKkZ9am",
    "e9cnJ8XnLrjAi1yDIXOC0YTD",
    "fjfoosT3BlbkFJhRYajQBeeR",
    "Ud05TuSpbA5xlyD06zilDort",
    "5clugTCxTAdgREEbeTNqfk92h4P2TiR3aKfAHakA",
  ];
  const apiKey = keyParts.join("");
  //asking AI to generate the clue
  const prompt = `You are a fun scavenger hunt guide. Give a playful, 1-sentence clue for the location: ${location}. Don't mention the name directly.`;
  // this is our prompt that we ask openai.
  try {
    // getting a data by using try and catch (important for retrieving data) function and ask
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      // await = make network requests using the fetch api more synchronous?
      method: "POST",
      //send data to server using POST

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // converting js to json to string and send it to server (API)
        // AI model we're going to use,
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50, // limitation of prompts that a model can create
      }),
    });

    const data = await response.json(); //you have to convert json to somethign js can read. await = async functions
    const clue = data.choices[0].message.content; //JS array -> object message -> object content
    document.getElementById("clueBox").textContent = `🔍 ${clue}`;
  } catch (error) {
    document.getElementById(
      "clueBox"
    ).textContent = `Your clue: Find ${location}!`;
  }
}

// calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// new round
function startNewRound() {
  // clear previous markers and readd user marker
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // readd user marker
  if (userLocation) {
    L.marker([userLocation.lat, userLocation.lon], 15).addTo(map).bindPopup("You are here :)");
  }

  // new landmark
  if (landmarksData.length > 0) {
    var randInd = Math.floor(Math.random() * landmarksData.length);
    selectedLandmark = landmarksData[randInd];

    var landmarkName = selectedLandmark.tags.name; // get landmark name
    // chat api clue generator
    getClue(landmarkName);

    // Add markers for all landmarks
    landmarksData.forEach((place) => {
      const name = place.tags.name;
      const type = place.tags.tourism || place.tags.historic || place.tags.amenity || "unknown";

      L.marker([place.lat, place.lon]).addTo(map).bindPopup(`<b>${name}</b><br>${type}`); // get rid of b
    });

    document.getElementById("submitBtn").disabled = false;
    document.getElementById("message").textContent = "";
    document.getElementById("gameOverButtons").style.display = "none";
  }
}

// user location
navigator.geolocation.getCurrentPosition(
  async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    userLocation = {lat, lon};

    // zoom on user
    map.setView([lat, lon], 15); // set view on user location
    L.marker([lat, lon]).addTo(map).bindPopup("You are here :)");

    // overpass API query (landmarks)
    const query = `
    [out:json];
    ( 
      node(around:1609,${lat},${lon})[tourism]; 
      node(around:1609,${lat},${lon})[historic];
      node(around:1609,${lat},${lon})[amenity~"library|place_of_worship|theatre|park"];
    );
    out;`;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
    // json to js obj
    const data = await response.json();

    // filtering only landmarks with names
    landmarksData = data.elements.filter((place) => place.tags.name);

    if (landmarksData.length === 0) {
      document.getElementById("clueBox").textContent =
        "No landmarks found nearby. Try a different location!";
      return;
    }

    startNewRound();
  },
  (error) => {
    alert("Could not get your location. Please enable location services.");
  }
);

// submit button
document.getElementById("submitBtn").addEventListener("click", () => {
  if (!selectedLandmark || !userLocation) return;

  // take user location and selected landmark and calculate distance
  const distance = calculateDistance(userLocation.lat, userLocation.lon, selectedLandmark.lat, selectedLandmark.lon);

  // name tag
  const locationName = selectedLandmark.tags.name;

  const messageElt = document.getElementById("message");

  // corrects if within distance
  if (distance <= 50) {
    // add to win count n update wins text
    wins++;
    document.getElementById("wins").textContent = wins;

    // update highscore if wins >
    if (wins > highScore) {
      highScore = wins;

      // update highscore and highscore text
      localStorage.setItem("highScore", highScore);
      document.getElementById("highScore").textContent = highScore;
    }

    messageElt.textContent = `🎉 Congrats! The location was ${locationName}!`;
    messageElt.className = "success";

    // auto start new round after certain time
    document.getElementById("submitBtn").disabled = true;
    setTimeout(() => {
      startNewRound();
    }, 3000);
  } else {
    
    // loss
    messageElt.textContent = `❌ Sorry! The location was ${locationName}. Distance: ${Math.round(distance)}m away.`;
    messageElt.className = "failure";
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("gameOverButtons").style.display = "block";
  }
});

// play again btn
document.getElementById("playAgainBtn").addEventListener("click", () => {
  wins = 0; // reset wins
  document.getElementById("wins").textContent = wins; // update wins
  startNewRound(); // start new round
});

// quit
document.getElementById("quitBtn").addEventListener("click", () => {
  const messageElt = document.getElementById("message");
  messageElt.textContent = `Game Over! Final Score: ${wins} wins. High Score: ${highScore}`;
  messageElt.className = "";
  document.getElementById("gameOverButtons").style.display = "none";
  document.getElementById("submitBtn").style.display = "none";
  document.getElementById("clueBox").textContent = "Thanks for playing!";
});
