async function getWeather(lat, lon) {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
    );
    const data = await res.json();
    return data.current_weather.temperature;
  }

  window.addEventListener("load", () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
  
        try {
          const temp = await getWeather(lat, lon);
          document.getElementById("temp-value").textContent = temp.toFixed(1);
        } catch (err) {
          console.error("Weather API error:", err);
          document.getElementById("temp-value").textContent = "Error";
        }
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  });