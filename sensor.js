require("dotenv").config();
const axios = require("axios");
const sensor = require("node-dht-sensor").promises;

const pets = require("./pets.json");

async function pollSensors() {
  await Promise.all(pets.map(async ({ petId, sensors }) => {
    const readings = await Promise.all(sensors.map(async ({type, pin}) => {
      const reading = await sensor.read(type, pin);

      return {
        temperature: reading.temperature.toFixed(1),
        humidity: reading.humidity.toFixed(1),
      }
    }));

    function getMinMax(readings, isHigh) {
      return readings.reduce((minMax, reading) => {
        const { temperature } = reading;

        if (minMax === null) {
          return temperature;
        }

        return isHigh ?
          Math.max(minMax, temperature) :
          Math.min(minMax, temperature);
      }, null);
    }

    const high = getMinMax(readings, true);
    const low = getMinMax(readings, false);

    const humiditySum = readings.reduce((humidity, reading) => {
      return humidity + reading.humidity;
    }, 0);
    const humidity = humiditySum / readings.length;

    console.log(petId);
    console.log(`  High:      ${high}`);
    console.log(`  Low:       ${low}`);
    console.log(`  Humidity:  ${humidity}`);
    console.log("\n");

    await axios.post(
      `${process.env.FIREBASE_FUNCTIONS_BASE}/submitDataPoint`,
      {
        petId,
        high,
        low,
        humidity
      }
    );
  }));
}

setInterval(pollSensors, 5000);
