import express from "express";
import bodyParser from "body-parser";
import { readFile } from "fs/promises";

const menu = [
  { id: 1, quantity: 5, name: "Pizza", price: 5 },
  { id: 2, quantity: 2, name: "Pasta", price: 4 },
  { id: 3, quantity: 5, name: "Insalata", price: 2 },
  { id: 4, quantity: 4, name: "Hamburger", price: 6 },
  { id: 5, quantity: 5, name: "Sushi", price: 8 },
  { id: 6, quantity: 20, name: "Roj Kebab", price: 3 },
  { id: 7, quantity: 8, name: "Taco", price: 4 },
  { id: 8, quantity: 9, name: "Poke", price: 7 }
];

// txt con n = riders righe e 24 colonne t.c. txt[i][j] = 1 se
// il rider i è disponibile all'ora j, 0 altrimenti

function isTimeValid(meal, hour, minute) {
  if (typeof meal !== "string" || typeof hour !== "number" || typeof minute !== "number") {
    return false;
  }

  if (meal === "P") {
    if (hour < 12 || hour > 13 || minute < 0 || minute > 59 || (hour === 13 && minute > 50)) {
      console.log(`Orario non valido: ${hour}:${minute}`);
      return false;
    }
    return true;
  } else if (meal === "C") {
    if (
      hour < 19 ||
      hour > 21 ||
      minute < 0 ||
      minute > 59 ||
      (hour === 19 && minute < 30) ||
      (hour === 21 && minute > 20)
    ) {
      console.log(`Orario non valido: ${hour}:${minute}`);
      return false;
    }
    return true;
  }
  return false;
}

// funzione che calcola se il rider i è disponibile all'ora j
async function isRiderAvailable(rider, meal, hour, minute) {
  if (!isTimeValid(meal, hour, minute)) {
    console.error("Orario non valido");
    throw new Error("Orario non valido");
  }

  const txt = await readFile("riders.txt", { encoding: "utf-8" });
  const lines = txt.split("\n");
  const numRiders = lines.length;

  if (rider >= numRiders) {
    console.error(`Rider ${rider} non esiste (range: 0-${numRiders - 1} riders)`);
    throw new Error("Rider non esiste");
  }

  const startingHour = meal === "P" ? 12 : 19;
  const diffHour = hour - startingHour;

  const minutesMapped = meal === "P" ? minute : (6 + Math.floor(minute / 10) - 3) * 10;
  const col = Math.floor(minutesMapped / 10) + diffHour * 6 + (meal === "P" ? 0 : 6);

  const row = lines[rider];
  return row[col] === "0";
}

async function getFirstTimeAvailable(meal, _hour, _minute) {
  const txt = await readFile("riders.txt", { encoding: "utf-8" });
  const lines = txt.split("\n");
  const riders = lines.length;

  if (meal === "P") {
    for (let hour = _hour; hour < 14; hour++) {
      const startingMinute = hour === _hour ? _minute : 0;
      for (let minute = startingMinute; minute < 60; minute += 10) {
        for (let rider = 0; rider < riders; rider++) {
          if (await isRiderAvailable(rider, meal, hour, minute)) {
            return { rider, hour, minute };
          }
        }
      }
    }
  } else if (meal === "C") {
    for (let hour = _hour; hour < 22; hour++) {
      const startingMinute = hour === _hour ? _minute : 0;
      for (let minute = startingMinute; minute < (hour === 21 ? 30 : 60); minute += 10) {
        for (let rider = 0; rider < riders; rider++) {
          if (await isRiderAvailable(rider, meal, hour, minute)) {
            return { rider, hour, minute };
          }
        }
      }
    }
  }

  return null;
}

// async function test() {
//   console.log(await getFirstTimeAvailable("P", 12, 0));
// }

// test();

const app = express();

app.use(bodyParser.json());

app.get("/availability", async (request, response) => {
  const { meal, hour, minute } = request.query;
  const hourInt = parseInt(hour, 10);
  const minuteInt = parseInt(minute, 10);

  if (!isTimeValid(meal, hourInt, minuteInt)) {
    return response.status(400).send("Orario non valido");
  }

  const result = await getFirstTimeAvailable(meal, hourInt, Math.floor(minuteInt / 10) * 10);
  if (result === null) {
    return response.status(404).send("Nessun rider disponibile");
  }

  response.json(result);
});

app.get("/menu", (request, response) => {
  response.json(menu);
});

app.post("/order", (request, response) => {
  // body: [
  // { name0: string, quantity0: number },
  // ...
  // { nameN: string, quantityN: number }
  // ]

  const items = request.body.items;
  if (!Array.isArray(items)) {
    return response.status(400).send("Formato non valido");
  }

  for (const item of items) {
    if (typeof item.name !== "string" || typeof item.quantity !== "number") {
      return response.status(400).send("Formato non valido");
    }

    const menuObj = menu.find(menuItem => menuItem.name.toLowerCase() === item.name);
    if (!menuObj) {
      return response.status(404).send(`Piatto ${item.name} non trovato`);
    } else if (menuObj.quantity < item.quantity) {
      return response
        .status(400)
        .send(`Quantità non disponibile per ${menuObj.name} (disponibili: ${menuObj.quantity})`);
    }
  }
  for (const item of items) {
    const menuObj = menu.find(menuItem => menuItem.name.toLowerCase() === item.name);
    menuObj.quantity -= item.quantity;
  }

  response.send("Ordine effettuato con successo");
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
