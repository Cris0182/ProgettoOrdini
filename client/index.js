import axios from "axios";
import { createInterface } from "node:readline";

function askQuestion(query) {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(query, answer => {
      resolve(answer);
      rl.close();
    });
  });
}

async function main() {
  const name = await askQuestion("Inserisci il tuo nome\n-> ");
  console.log(`Ciao, ${name}!`);
  const meal = await askQuestion(
    "Inserisci la scelta della consegna come una stringa del tipo A:hh:mm con A=(P/C), hh ore, mm minuti\n-> "
  );
  const mealRegex = /^[PC]:\d{2}:\d{2}$/; // A:hh:mm

  if (!mealRegex.test(meal)) {
    console.error("Formato non valido");
    process.exit(1);
  }
  // stringa valida

  // controlliamo ora e minuti
  const [type, hourStr, minuteStr] = meal.split(":");

  try {
    const { data } = await axios.get("http://localhost:3000/availability", {
      params: {
        meal: type,
        hour: hourStr,
        minute: minuteStr
      }
    });
    console.log(
      `Rider #${data.rider} disponibile alle ore ${data.hour}:${
        data.minute < 10 ? "0" + data.minute : data.minute
      }`
    );
  } catch (err) {
    console.error(`Errore ${err.response.status}: ${err.response.data}`);
  }

  const accept = await askQuestion("Accettare? (OK/NO)\n-> ");
  if (accept.trim().toUpperCase() !== "OK") {
    console.log("Va bene, arrivederci!");
    process.exit(0);
  }

  try {
    const { data } = await axios.get("http://localhost:3000/menu");
    console.log("Menù:");
    console.log(data.map(item => `\t${item.name}: €${item.price}`).join("\n"));
  } catch (err) {
    console.error(`Errore ${err.response.status}: ${err.response.data}`);
  }

  const order = await askQuestion(
    "Cosa desideri ordinare? (P0,N0;...;Pn:Nn con P nome del piatto, N quantità)\n-> "
  );
  const orderRegex = /^([a-zA-Z\s]+,\d+)(;[a-zA-Z\s]+,\d+)*$/;
  if (!orderRegex.test(order)) {
    console.error("Formato non valido");
    process.exit(1);
  }

  const items = order.split(";"); // ["P0,N0", ..., "Pn,Nn"]
  const itemsObj = items.map(item => {
    const [name, quantity] = item.split(",");
    return { name: name.toLowerCase().trim(), quantity: parseInt(quantity, 10) };
  });

  try {
    const { data } = await axios.post("http://localhost:3000/order", { items: itemsObj });
    console.log(data);
  } catch (err) {
    console.error(`Errore ${err.response.status}: ${err.response.data}`);
  }
}

main();
